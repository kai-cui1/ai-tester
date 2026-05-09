import { generateId } from '@ai-tester/shared';
import type { TestSuite, CreateTestSuite, UpdateTestSuite } from '../models/index.js';
import type { TestSuiteRepository } from './repository.js';
import { getPrisma } from './prisma-client.js';

function toTestSuite(row: any): TestSuite {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description ?? undefined,
    testCaseIds: JSON.parse(row.testCaseIds),
    parallelism: row.parallelism,
    environment: row.environment ?? undefined,
    variables: JSON.parse(row.variables),
    setupCaseId: row.setupCaseId ?? undefined,
    teardownCaseId: row.teardownCaseId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaTestSuiteRepository implements TestSuiteRepository {
  async create(data: CreateTestSuite): Promise<TestSuite> {
    const row = await getPrisma().testSuite.create({
      data: {
        id: generateId(),
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        testCaseIds: JSON.stringify(data.testCaseIds ?? []),
        parallelism: data.parallelism ?? 1,
        environment: data.environment,
        variables: JSON.stringify(data.variables ?? {}),
        setupCaseId: data.setupCaseId,
        teardownCaseId: data.teardownCaseId,
      },
    });
    return toTestSuite(row);
  }

  async findById(id: string): Promise<TestSuite | null> {
    const row = await getPrisma().testSuite.findUnique({ where: { id } });
    return row ? toTestSuite(row) : null;
  }

  async findByProjectId(projectId: string): Promise<TestSuite[]> {
    const rows = await getPrisma().testSuite.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toTestSuite);
  }

  async update(id: string, data: UpdateTestSuite): Promise<TestSuite> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.testCaseIds !== undefined) updateData.testCaseIds = JSON.stringify(data.testCaseIds);
    if (data.parallelism !== undefined) updateData.parallelism = data.parallelism;
    if (data.environment !== undefined) updateData.environment = data.environment;
    if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
    if (data.setupCaseId !== undefined) updateData.setupCaseId = data.setupCaseId;
    if (data.teardownCaseId !== undefined) updateData.teardownCaseId = data.teardownCaseId;

    const row = await getPrisma().testSuite.update({
      where: { id },
      data: updateData,
    });
    return toTestSuite(row);
  }

  async delete(id: string): Promise<void> {
    await getPrisma().testSuite.delete({ where: { id } });
  }
}
