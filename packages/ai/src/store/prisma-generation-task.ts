import { generateId } from '@ai-tester/shared';
import { getPrisma } from '@ai-tester/core';
import type { GenerationTask } from '../models/generation.js';
import type { GenerationTaskRepository } from './repository.js';

function toGenerationTask(row: any): GenerationTask {
  return {
    id: row.id,
    projectId: row.projectId,
    endpointIds: JSON.parse(row.endpointIds),
    strategy: row.strategy,
    status: row.status,
    generatedCases: JSON.parse(row.generatedCases),
    confirmedCaseIds: JSON.parse(row.confirmedCaseIds),
    error: row.error ?? undefined,
    tokenUsage: row.tokenUsage ? JSON.parse(row.tokenUsage) : undefined,
    durationMs: row.durationMs ?? undefined,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
  };
}

export class PrismaGenerationTaskRepository implements GenerationTaskRepository {
  async create(data: Omit<GenerationTask, 'createdAt' | 'completedAt'>): Promise<GenerationTask> {
    const row = await getPrisma().generationTask.create({
      data: {
        id: data.id || generateId(),
        projectId: data.projectId,
        endpointIds: JSON.stringify(data.endpointIds ?? []),
        strategy: data.strategy,
        status: data.status ?? 'pending',
        generatedCases: JSON.stringify(data.generatedCases ?? []),
        confirmedCaseIds: JSON.stringify(data.confirmedCaseIds ?? []),
        error: data.error ?? null,
        tokenUsage: data.tokenUsage ? JSON.stringify(data.tokenUsage) : null,
        durationMs: data.durationMs ?? null,
      },
    });
    return toGenerationTask(row);
  }

  async findById(id: string): Promise<GenerationTask | null> {
    const row = await getPrisma().generationTask.findUnique({ where: { id } });
    return row ? toGenerationTask(row) : null;
  }

  async findByProjectId(projectId: string): Promise<GenerationTask[]> {
    const rows = await getPrisma().generationTask.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toGenerationTask);
  }

  async update(id: string, data: Partial<GenerationTask>): Promise<GenerationTask> {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.generatedCases !== undefined) updateData.generatedCases = JSON.stringify(data.generatedCases);
    if (data.confirmedCaseIds !== undefined) updateData.confirmedCaseIds = JSON.stringify(data.confirmedCaseIds);
    if (data.error !== undefined) updateData.error = data.error;
    if (data.tokenUsage !== undefined) updateData.tokenUsage = JSON.stringify(data.tokenUsage);
    if (data.durationMs !== undefined) updateData.durationMs = data.durationMs;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

    const row = await getPrisma().generationTask.update({
      where: { id },
      data: updateData,
    });
    return toGenerationTask(row);
  }
}
