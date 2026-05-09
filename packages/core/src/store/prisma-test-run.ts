import { generateId } from '@ai-tester/shared';
import type {
  TestRun,
  CreateTestRun,
  TestCaseResult,
  TestStepResult,
} from '../models/index.js';
import type { TestRunRepository } from './repository.js';
import { getPrisma } from './prisma-client.js';

function toTestRun(row: any, caseResults?: any[]): TestRun {
  return {
    id: row.id,
    suiteId: row.suiteId,
    status: row.status as TestRun['status'],
    environment: row.environment,
    variables: JSON.parse(row.variables),
    caseResults: caseResults?.map(toCaseResult) ?? [],
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? undefined,
    durationMs: row.durationMs ?? undefined,
    totalCases: row.totalCases,
    passedCases: row.passedCases,
    failedCases: row.failedCases,
    triggeredBy: row.triggeredBy as TestRun['triggeredBy'],
    createdAt: row.createdAt,
  };
}

function toCaseResult(row: any): TestCaseResult {
  return {
    id: row.id,
    runId: row.runId,
    testCaseId: row.testCaseId,
    testCaseName: row.testCaseName,
    status: row.status as TestCaseResult['status'],
    stepResults: (row.stepResults ?? []).map(toStepResult),
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? undefined,
    durationMs: row.durationMs ?? undefined,
    totalSteps: row.totalSteps,
    passedSteps: row.passedSteps,
    failedSteps: row.failedSteps,
  };
}

function toStepResult(row: any): TestStepResult {
  return {
    id: row.id,
    caseResultId: row.caseResultId,
    stepId: row.stepId,
    stepName: row.stepName,
    stepType: row.stepType as TestStepResult['stepType'],
    status: row.status as TestStepResult['status'],
    request: row.request ? JSON.parse(row.request) : undefined,
    response: row.response ? JSON.parse(row.response) : undefined,
    assertion: row.assertion ? JSON.parse(row.assertion) : undefined,
    extractedVar: row.extractedVar ? JSON.parse(row.extractedVar) : undefined,
    error: row.error ? JSON.parse(row.error) : undefined,
    durationMs: row.durationMs,
  };
}

export class PrismaTestRunRepository implements TestRunRepository {
  async create(data: CreateTestRun): Promise<TestRun> {
    const row = await getPrisma().testRun.create({
      data: {
        id: generateId(),
        suiteId: data.suiteId,
        environment: data.environment,
        variables: JSON.stringify(data.variables ?? {}),
        triggeredBy: data.triggeredBy ?? 'manual',
      },
    });
    return toTestRun(row);
  }

  async findById(id: string): Promise<TestRun | null> {
    const row = await getPrisma().testRun.findUnique({
      where: { id },
      include: {
        caseResults: {
          include: { stepResults: { orderBy: { stepId: 'asc' } } },
          orderBy: { startedAt: 'asc' },
        },
      },
    });
    return row ? toTestRun(row, row.caseResults) : null;
  }

  async findAll(filters?: {
    suiteId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: TestRun[]; total: number }> {
    const where: any = {};
    if (filters?.suiteId) where.suiteId = filters.suiteId;
    if (filters?.status) where.status = filters.status;

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;

    const [rows, total] = await Promise.all([
      getPrisma().testRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().testRun.count({ where }),
    ]);

    return { items: rows.map((r) => toTestRun(r)), total };
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        TestRun,
        'status' | 'finishedAt' | 'durationMs' | 'totalCases' | 'passedCases' | 'failedCases'
      >
    >,
  ): Promise<TestRun> {
    const row = await getPrisma().testRun.update({
      where: { id },
      data,
    });
    return toTestRun(row);
  }

  async addCaseResult(
    runId: string,
    caseResult: Omit<TestCaseResult, 'stepResults'>,
  ): Promise<TestCaseResult> {
    const row = await getPrisma().testCaseResult.create({
      data: {
        id: caseResult.id,
        runId,
        testCaseId: caseResult.testCaseId,
        testCaseName: caseResult.testCaseName,
        status: caseResult.status,
        startedAt: caseResult.startedAt,
        totalSteps: caseResult.totalSteps,
        passedSteps: caseResult.passedSteps,
        failedSteps: caseResult.failedSteps,
      },
    });
    return toCaseResult(row);
  }

  async updateCaseResult(
    id: string,
    data: Partial<
      Pick<
        TestCaseResult,
        'status' | 'finishedAt' | 'durationMs' | 'totalSteps' | 'passedSteps' | 'failedSteps'
      >
    >,
  ): Promise<TestCaseResult> {
    const row = await getPrisma().testCaseResult.update({
      where: { id },
      data,
    });
    return toCaseResult(row);
  }

  async addStepResult(
    caseResultId: string,
    stepResult: TestStepResult,
  ): Promise<TestStepResult> {
    const row = await getPrisma().testStepResult.create({
      data: {
        id: stepResult.id,
        caseResultId,
        stepId: stepResult.stepId,
        stepName: stepResult.stepName,
        stepType: stepResult.stepType,
        status: stepResult.status,
        request: stepResult.request ? JSON.stringify(stepResult.request) : null,
        response: stepResult.response ? JSON.stringify(stepResult.response) : null,
        assertion: stepResult.assertion ? JSON.stringify(stepResult.assertion) : null,
        extractedVar: stepResult.extractedVar
          ? JSON.stringify(stepResult.extractedVar)
          : null,
        error: stepResult.error ? JSON.stringify(stepResult.error) : null,
        durationMs: stepResult.durationMs,
      },
    });
    return toStepResult(row);
  }
}
