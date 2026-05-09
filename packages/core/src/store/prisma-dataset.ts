import { generateId } from '@ai-tester/shared';
import type {
  TestDataSet,
  CreateTestDataSet,
  UpdateTestDataSet,
} from '../models/index.js';
import type { TestDataSetRepository } from './repository.js';
import { getPrisma } from './prisma-client.js';

function toTestDataSet(row: any): TestDataSet {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description ?? undefined,
    fields: JSON.parse(row.fields),
    rows: JSON.parse(row.rows),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaTestDataSetRepository implements TestDataSetRepository {
  async create(data: CreateTestDataSet): Promise<TestDataSet> {
    const row = await getPrisma().testDataSet.create({
      data: {
        id: generateId(),
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        fields: JSON.stringify(data.fields ?? []),
        rows: JSON.stringify(data.rows ?? []),
      },
    });
    return toTestDataSet(row);
  }

  async findById(id: string): Promise<TestDataSet | null> {
    const row = await getPrisma().testDataSet.findUnique({ where: { id } });
    return row ? toTestDataSet(row) : null;
  }

  async findByProjectId(projectId: string): Promise<TestDataSet[]> {
    const rows = await getPrisma().testDataSet.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toTestDataSet);
  }

  async update(id: string, data: UpdateTestDataSet): Promise<TestDataSet> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.fields !== undefined) updateData.fields = JSON.stringify(data.fields);
    if (data.rows !== undefined) updateData.rows = JSON.stringify(data.rows);

    const row = await getPrisma().testDataSet.update({
      where: { id },
      data: updateData,
    });
    return toTestDataSet(row);
  }

  async delete(id: string): Promise<void> {
    await getPrisma().testDataSet.delete({ where: { id } });
  }
}
