import { generateId } from '@ai-tester/shared';
import type { TestCase, CreateTestCase, UpdateTestCase } from '../models/index.js';
import type { TestCaseRepository } from './repository.js';
import { getPrisma } from './prisma-client.js';

function toTestCase(row: any): TestCase {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description ?? undefined,
    module: row.module,
    tags: JSON.parse(row.tags),
    priority: row.priority,
    steps: JSON.parse(row.steps),
    variables: JSON.parse(row.variables),
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaTestCaseRepository implements TestCaseRepository {
  async create(data: CreateTestCase): Promise<TestCase> {
    const stepsWithIds = (data.steps ?? []).map((step, index) => ({
      ...step,
      id: generateId(),
      order: step.order ?? index,
    }));

    const row = await getPrisma().testCase.create({
      data: {
        id: generateId(),
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        module: data.module ?? '',
        tags: JSON.stringify(data.tags ?? []),
        priority: data.priority ?? 'medium',
        steps: JSON.stringify(stepsWithIds),
        variables: JSON.stringify(data.variables ?? {}),
      },
    });
    return toTestCase(row);
  }

  async findById(id: string): Promise<TestCase | null> {
    const row = await getPrisma().testCase.findUnique({ where: { id } });
    return row ? toTestCase(row) : null;
  }

  async findByProjectId(
    projectId: string,
    filters?: {
      module?: string;
      tags?: string[];
      priority?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ items: TestCase[]; total: number }> {
    const where: any = { projectId };

    if (filters?.module) {
      where.module = { startsWith: filters.module };
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;

    const [rows, total] = await Promise.all([
      getPrisma().testCase.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().testCase.count({ where }),
    ]);

    let items = rows.map(toTestCase);

    // Post-filter by tags (SQLite doesn't support JSON array queries natively)
    if (filters?.tags && filters.tags.length > 0) {
      items = items.filter((tc) => filters.tags!.some((tag) => tc.tags.includes(tag)));
    }

    return { items, total };
  }

  async update(id: string, data: UpdateTestCase): Promise<TestCase> {
    const existing = await getPrisma().testCase.findUnique({ where: { id } });
    if (!existing) throw new Error(`TestCase not found: ${id}`);

    const updateData: any = { version: existing.version + 1 };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.module !== undefined) updateData.module = data.module;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
    if (data.steps !== undefined) {
      const stepsWithIds = data.steps.map((step, index) => ({
        ...step,
        id: generateId(),
        order: step.order ?? index,
      }));
      updateData.steps = JSON.stringify(stepsWithIds);
    }

    const row = await getPrisma().testCase.update({
      where: { id },
      data: updateData,
    });
    return toTestCase(row);
  }

  async delete(id: string): Promise<void> {
    await getPrisma().testCase.delete({ where: { id } });
  }

  async duplicate(id: string): Promise<TestCase> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`TestCase not found: ${id}`);

    return this.create({
      projectId: existing.projectId,
      name: `${existing.name} (copy)`,
      description: existing.description,
      module: existing.module,
      tags: existing.tags,
      priority: existing.priority,
      steps: existing.steps.map(({ id: _id, ...rest }) => rest),
      variables: existing.variables,
    });
  }
}
