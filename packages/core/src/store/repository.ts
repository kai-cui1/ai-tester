import type {
  Project,
  CreateProject,
  UpdateProject,
  TestCase,
  CreateTestCase,
  UpdateTestCase,
  TestSuite,
  CreateTestSuite,
  UpdateTestSuite,
  TestRun,
  CreateTestRun,
  TestCaseResult,
  TestStepResult,
  TestDataSet,
  CreateTestDataSet,
  UpdateTestDataSet,
} from '../models/index.js';

export interface ProjectRepository {
  create(data: CreateProject): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findAll(): Promise<Project[]>;
  update(id: string, data: UpdateProject): Promise<Project>;
  delete(id: string): Promise<void>;
}

export interface TestCaseRepository {
  create(data: CreateTestCase): Promise<TestCase>;
  findById(id: string): Promise<TestCase | null>;
  findByProjectId(
    projectId: string,
    filters?: {
      module?: string;
      tags?: string[];
      priority?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ items: TestCase[]; total: number }>;
  update(id: string, data: UpdateTestCase): Promise<TestCase>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<TestCase>;
}

export interface TestSuiteRepository {
  create(data: CreateTestSuite): Promise<TestSuite>;
  findById(id: string): Promise<TestSuite | null>;
  findByProjectId(projectId: string): Promise<TestSuite[]>;
  update(id: string, data: UpdateTestSuite): Promise<TestSuite>;
  delete(id: string): Promise<void>;
}

export interface TestRunRepository {
  create(data: CreateTestRun): Promise<TestRun>;
  findById(id: string): Promise<TestRun | null>;
  findAll(filters?: {
    suiteId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: TestRun[]; total: number }>;
  update(
    id: string,
    data: Partial<
      Pick<
        TestRun,
        'status' | 'finishedAt' | 'durationMs' | 'totalCases' | 'passedCases' | 'failedCases'
      >
    >,
  ): Promise<TestRun>;
  addCaseResult(
    runId: string,
    caseResult: Omit<TestCaseResult, 'stepResults'>,
  ): Promise<TestCaseResult>;
  updateCaseResult(
    id: string,
    data: Partial<
      Pick<
        TestCaseResult,
        'status' | 'finishedAt' | 'durationMs' | 'totalSteps' | 'passedSteps' | 'failedSteps'
      >
    >,
  ): Promise<TestCaseResult>;
  addStepResult(caseResultId: string, stepResult: TestStepResult): Promise<TestStepResult>;
}

export interface TestDataSetRepository {
  create(data: CreateTestDataSet): Promise<TestDataSet>;
  findById(id: string): Promise<TestDataSet | null>;
  findByProjectId(projectId: string): Promise<TestDataSet[]>;
  update(id: string, data: UpdateTestDataSet): Promise<TestDataSet>;
  delete(id: string): Promise<void>;
}
