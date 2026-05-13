import { generateId } from '@ai-tester/shared';
import type { TestCase, TestSuite, TestRun, TestCaseResult, TestStepResult, TestStep } from '../models/index.js';
import type { StepExecutionResult } from '../plugins/executor.js';
import { PluginRegistry } from '../plugins/registry.js';
import { RunContext } from './run-context.js';
import type { TestCaseRepository, TestSuiteRepository, TestRunRepository, TestDataSetRepository, ProjectRepository } from '../store/repository.js';

export interface OrchestratorDeps {
  registry: PluginRegistry;
  testCaseRepo: TestCaseRepository;
  testSuiteRepo: TestSuiteRepository;
  testRunRepo: TestRunRepository;
  testDataSetRepo: TestDataSetRepository;
  projectRepo: ProjectRepository;
}

export class Orchestrator {
  private deps: OrchestratorDeps;
  private maxCallDepth = 10;

  constructor(deps: OrchestratorDeps) {
    this.deps = deps;
  }

  async executeRun(suiteId: string, environment: string, variables?: Record<string, string>, triggeredBy?: string): Promise<TestRun> {
    const suite = await this.deps.testSuiteRepo.findById(suiteId);
    if (!suite) throw new Error(`Suite not found: ${suiteId}`);

    // Resolve environment from project
    const project = await this.deps.projectRepo.findById(suite.projectId);
    const envConfig = project?.environments.find((e) => e.name === environment)
      ?? { name: environment, baseUrl: '', variables: {} as Record<string, string> };

    // Merge variables: environment -> suite -> run-level
    const mergedVars = { ...envConfig.variables, ...suite.variables, ...variables };

    // Create run record
    const run = await this.deps.testRunRepo.create({
      suiteId: suite.id,
      environment,
      variables: mergedVars,
      triggeredBy: (triggeredBy as any) ?? 'manual',
    });

    // Update status to running
    await this.deps.testRunRepo.update(run.id, { status: 'running' });

    const context = new RunContext(run.id, { ...envConfig, variables: mergedVars }, mergedVars);

    try {
      // Setup case
      if (suite.setupCaseId) {
        await this.executeCaseSteps(suite.setupCaseId, context, 0);
      }

      // Execute each case in the suite
      let passedCases = 0;
      let failedCases = 0;

      for (const caseId of suite.testCaseIds) {
        const testCase = await this.deps.testCaseRepo.findById(caseId);
        if (!testCase) continue;

        // Merge case-level variables
        for (const [k, v] of Object.entries(testCase.variables)) {
          if (!context.variables.has(k)) {
            context.variables.set(k, v);
          }
        }

        const caseResult = await this.deps.testRunRepo.addCaseResult(run.id, {
          id: generateId(),
          runId: run.id,
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          status: 'passed',
          startedAt: new Date(),
          totalSteps: testCase.steps.length,
          passedSteps: 0,
          failedSteps: 0,
        });

        context.eventEmitter.emit('case:start', { caseResultId: caseResult.id, testCaseName: testCase.name });

        // Setup browser if test case has browser steps
        await this.setupBrowserIfNeeded(testCase.steps, context);

        const stepResults = await this.executeCaseSteps(testCase.id, context, 0);

        // Teardown browser after case completes
        await this.teardownBrowserIfNeeded(context);

        const passed = stepResults.filter((r) => r.status === 'passed').length;
        const failed = stepResults.filter((r) => r.status === 'failed' || r.status === 'error').length;
        const caseStatus = failed > 0 ? 'failed' : 'passed';

        // Save step results
        for (const sr of stepResults) {
          await this.deps.testRunRepo.addStepResult(caseResult.id, sr);
        }

        const finishedAt = new Date();
        await this.deps.testRunRepo.updateCaseResult(caseResult.id, {
          status: caseStatus,
          finishedAt,
          durationMs: finishedAt.getTime() - caseResult.startedAt.getTime(),
          totalSteps: stepResults.length,
          passedSteps: passed,
          failedSteps: failed,
        });

        if (caseStatus === 'passed') passedCases++;
        else failedCases++;

        context.eventEmitter.emit('case:complete', { caseResultId: caseResult.id, status: caseStatus });
      }

      // Teardown case
      if (suite.teardownCaseId) {
        await this.executeCaseSteps(suite.teardownCaseId, context, 0);
      }

      const finishedAt = new Date();
      const finalStatus = failedCases > 0 ? 'failed' : 'passed';

      await this.deps.testRunRepo.update(run.id, {
        status: finalStatus,
        finishedAt,
        durationMs: finishedAt.getTime() - run.startedAt.getTime(),
        totalCases: suite.testCaseIds.length,
        passedCases,
        failedCases,
      });

      context.eventEmitter.emit('run:complete', { runId: run.id, status: finalStatus });

      // Return full run with results
      return (await this.deps.testRunRepo.findById(run.id))!;
    } catch (err: any) {
      await this.deps.testRunRepo.update(run.id, {
        status: 'error',
        finishedAt: new Date(),
      });
      throw err;
    }
  }

  private async executeCaseSteps(
    testCaseId: string,
    context: RunContext,
    callDepth: number,
  ): Promise<TestStepResult[]> {
    if (callDepth > this.maxCallDepth) {
      throw new Error(`Max call depth (${this.maxCallDepth}) exceeded. Possible circular call.`);
    }

    const testCase = await this.deps.testCaseRepo.findById(testCaseId);
    if (!testCase) throw new Error(`TestCase not found: ${testCaseId}`);

    const sortedSteps = [...testCase.steps].sort((a, b) => a.order - b.order);
    const results: TestStepResult[] = [];
    let aborted = false;

    for (let stepIdx = 0; stepIdx < sortedSteps.length; stepIdx++) {
      const step = sortedSteps[stepIdx];
      if (aborted) {
        results.push({
          id: generateId(),
          caseResultId: '',
          stepId: step.id,
          stepName: step.name,
          stepType: step.type,
          status: 'skipped',
          order: stepIdx,
          durationMs: 0,
        });
        continue;
      }

      // Handle "call" step type: recursive case execution
      if (step.type === 'call') {
        const config = step.config as { testCaseId: string };
        const startTime = Date.now();
        try {
          const subResults = await this.executeCaseSteps(config.testCaseId, context, callDepth + 1);
          const hasFailed = subResults.some((r) => r.status === 'failed' || r.status === 'error');
          results.push({
            id: generateId(),
            caseResultId: '',
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            status: hasFailed ? 'failed' : 'passed',
            order: stepIdx,
            durationMs: Date.now() - startTime,
          });
          if (hasFailed && !step.continueOnFailure) aborted = true;
        } catch (err: any) {
          results.push({
            id: generateId(),
            caseResultId: '',
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            status: 'error',
            order: stepIdx,
            error: { message: err.message, stack: err.stack },
            durationMs: Date.now() - startTime,
          });
          if (!step.continueOnFailure) aborted = true;
        }
        continue;
      }

      // Handle "load-dataset" step type
      if (step.type === 'load-dataset') {
        const config = step.config as { datasetId: string; variableName: string };
        const startTime = Date.now();
        try {
          const dataset = await this.deps.testDataSetRepo.findById(config.datasetId);
          if (!dataset) throw new Error(`Dataset not found: ${config.datasetId}`);
          context.variables.set(config.variableName, dataset.rows);
          results.push({
            id: generateId(),
            caseResultId: '',
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            status: 'passed',
            order: stepIdx,
            extractedVar: { variableName: config.variableName, value: `[${dataset.rows.length} rows]` },
            durationMs: Date.now() - startTime,
          });
        } catch (err: any) {
          results.push({
            id: generateId(),
            caseResultId: '',
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            status: 'error',
            order: stepIdx,
            error: { message: err.message, stack: err.stack },
            durationMs: Date.now() - startTime,
          });
          if (!step.continueOnFailure) aborted = true;
        }
        continue;
      }

      // Standard executor-based steps (http, assertion, extract)
      const executor = this.deps.registry.getOrThrow(step.type);

      let attempts = 0;
      const maxAttempts = step.retryCount + 1;
      let lastResult: StepExecutionResult | undefined;

      while (attempts < maxAttempts) {
        attempts++;
        const startTime = Date.now();
        try {
          context.eventEmitter.emit('step:start', { stepId: step.id, stepName: step.name });
          lastResult = await executor.execute(step, context);
          lastResult.durationMs = Date.now() - startTime;
          context.eventEmitter.emit('step:complete', { stepId: step.id, status: lastResult.status });

          if (lastResult.status === 'passed') break;
          if (attempts < maxAttempts) continue; // retry
        } catch (err: any) {
          lastResult = {
            status: 'error',
            error: { message: err.message, stack: err.stack },
            durationMs: Date.now() - startTime,
          };
          context.eventEmitter.emit('step:complete', { stepId: step.id, status: 'error' });
          if (attempts < maxAttempts) continue;
        }
      }

      const stepResult: TestStepResult = {
        id: generateId(),
        caseResultId: '',
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        status: lastResult!.status,
        order: stepIdx,
        request: lastResult!.request,
        response: lastResult!.response,
        assertion: lastResult!.assertion,
        extractedVar: lastResult!.extractedVar,
        error: lastResult!.error,
        browser: lastResult!.browser,
        durationMs: lastResult!.durationMs,
      };

      results.push(stepResult);

      if (
        (stepResult.status === 'failed' || stepResult.status === 'error') &&
        !step.continueOnFailure
      ) {
        aborted = true;
      }
    }

    return results;
  }

  private async setupBrowserIfNeeded(steps: TestStep[], context: RunContext): Promise<void> {
    const hasBrowserSteps = steps.some((s) => s.type === 'browser');
    if (hasBrowserSteps) {
      const browserExecutor = this.deps.registry.get('browser');
      if (browserExecutor?.setup) {
        await browserExecutor.setup(context);
      }
    }
  }

  private async teardownBrowserIfNeeded(context: RunContext): Promise<void> {
    if (context.browserPage) {
      const browserExecutor = this.deps.registry.get('browser');
      if (browserExecutor?.teardown) {
        await browserExecutor.teardown(context);
      }
    }
  }
}
