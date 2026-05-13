import { z } from 'zod';
import { StepType } from './test-step.js';

// --- Step Result ---

export const StepResultStatus = z.enum(['passed', 'failed', 'error', 'skipped']);
export type StepResultStatus = z.infer<typeof StepResultStatus>;

export const TestStepResultSchema = z.object({
  id: z.string(),
  caseResultId: z.string(),
  stepId: z.string(),
  stepName: z.string(),
  stepType: StepType,
  status: StepResultStatus,
  order: z.number().int().min(0).default(0),
  // HTTP step specific
  request: z
    .object({
      method: z.string(),
      url: z.string(),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
    })
    .optional(),
  response: z
    .object({
      status: z.number(),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
      responseTimeMs: z.number(),
    })
    .optional(),
  // Assertion step specific
  assertion: z
    .object({
      expression: z.string().optional(),
      operator: z.string(),
      expected: z.any().optional(),
      actual: z.any().optional(),
      passed: z.boolean(),
    })
    .optional(),
  // Extract step specific
  extractedVar: z
    .object({
      variableName: z.string(),
      value: z.any(),
    })
    .optional(),
  // Common
  error: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  // Browser step specific
  browser: z
    .object({
      action: z.string(),
      url: z.string().optional(),
      title: z.string().optional(),
      screenshot: z.string().optional(),
      assertion: z
        .object({
          type: z.string(),
          selector: z.string().optional(),
          operator: z.string(),
          expected: z.any().optional(),
          actual: z.any().optional(),
          passed: z.boolean(),
        })
        .optional(),
    })
    .optional(),
  durationMs: z.number().min(0),
});

// --- Case Result ---

export const CaseResultStatus = z.enum(['passed', 'failed', 'error', 'skipped']);
export type CaseResultStatus = z.infer<typeof CaseResultStatus>;

export const TestCaseResultSchema = z.object({
  id: z.string(),
  runId: z.string(),
  testCaseId: z.string(),
  testCaseName: z.string(),
  status: CaseResultStatus,
  stepResults: z.array(TestStepResultSchema).default([]),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  durationMs: z.number().min(0).optional(),
  totalSteps: z.number().int().min(0),
  passedSteps: z.number().int().min(0),
  failedSteps: z.number().int().min(0),
});

// --- Run ---

export const RunStatus = z.enum(['pending', 'running', 'passed', 'failed', 'error', 'cancelled']);
export type RunStatus = z.infer<typeof RunStatus>;

export const RunTrigger = z.enum(['manual', 'api', 'mcp']);
export type RunTrigger = z.infer<typeof RunTrigger>;

export const TestRunSchema = z.object({
  id: z.string(),
  suiteId: z.string(),
  status: RunStatus,
  environment: z.string(),
  variables: z.record(z.string()).default({}),
  caseResults: z.array(TestCaseResultSchema).default([]),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  durationMs: z.number().min(0).optional(),
  totalCases: z.number().int().min(0),
  passedCases: z.number().int().min(0),
  failedCases: z.number().int().min(0),
  triggeredBy: RunTrigger,
  createdAt: z.date(),
});

export const CreateTestRunSchema = z.object({
  suiteId: z.string(),
  environment: z.string(),
  variables: z.record(z.string()).default({}),
  triggeredBy: RunTrigger.default('manual'),
});

// --- Types ---

export type TestStepResult = z.infer<typeof TestStepResultSchema>;
export type TestCaseResult = z.infer<typeof TestCaseResultSchema>;
export type TestRun = z.infer<typeof TestRunSchema>;
export type CreateTestRun = z.infer<typeof CreateTestRunSchema>;
