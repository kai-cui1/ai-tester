import { generateId } from '@ai-tester/shared';
import { getPrisma } from '@ai-tester/core';
import type {
  ApiEndpoint,
  CreateApiEndpoint,
  UpdateApiEndpoint,
} from '../models/api-endpoint.js';
import type { ApiEndpointRepository } from './repository.js';

function toApiEndpoint(row: any): ApiEndpoint {
  return {
    id: row.id,
    projectId: row.projectId,
    method: row.method,
    path: row.path,
    summary: row.summary,
    description: row.description ?? undefined,
    tags: JSON.parse(row.tags),
    parameters: JSON.parse(row.parameters),
    requestBody: row.requestBody ?? undefined,
    responseBody: row.responseBody ?? undefined,
    authentication: row.authentication ?? undefined,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaApiEndpointRepository implements ApiEndpointRepository {
  async create(data: CreateApiEndpoint): Promise<ApiEndpoint> {
    const row = await getPrisma().apiEndpoint.create({
      data: {
        id: generateId(),
        projectId: data.projectId,
        method: data.method.toUpperCase(),
        path: data.path,
        summary: data.summary,
        description: data.description ?? null,
        tags: JSON.stringify(data.tags ?? []),
        parameters: JSON.stringify(data.parameters ?? []),
        requestBody: data.requestBody ?? null,
        responseBody: data.responseBody ?? null,
        authentication: data.authentication ?? null,
        source: data.source ?? 'manual',
      },
    });
    return toApiEndpoint(row);
  }

  async createMany(data: CreateApiEndpoint[]): Promise<ApiEndpoint[]> {
    const results: ApiEndpoint[] = [];
    for (const item of data) {
      results.push(await this.create(item));
    }
    return results;
  }

  async findById(id: string): Promise<ApiEndpoint | null> {
    const row = await getPrisma().apiEndpoint.findUnique({ where: { id } });
    return row ? toApiEndpoint(row) : null;
  }

  async findByProjectId(
    projectId: string,
    filters?: { method?: string; search?: string },
  ): Promise<ApiEndpoint[]> {
    const where: any = { projectId };

    if (filters?.method) {
      where.method = filters.method.toUpperCase();
    }

    if (filters?.search) {
      where.OR = [
        { path: { contains: filters.search } },
        { summary: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const rows = await getPrisma().apiEndpoint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toApiEndpoint);
  }

  async update(id: string, data: UpdateApiEndpoint): Promise<ApiEndpoint> {
    const updateData: any = {};
    if (data.method !== undefined) updateData.method = data.method.toUpperCase();
    if (data.path !== undefined) updateData.path = data.path;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.parameters !== undefined) updateData.parameters = JSON.stringify(data.parameters);
    if (data.requestBody !== undefined) updateData.requestBody = data.requestBody;
    if (data.responseBody !== undefined) updateData.responseBody = data.responseBody;
    if (data.authentication !== undefined) updateData.authentication = data.authentication;

    const row = await getPrisma().apiEndpoint.update({
      where: { id },
      data: updateData,
    });
    return toApiEndpoint(row);
  }

  async delete(id: string): Promise<void> {
    await getPrisma().apiEndpoint.delete({ where: { id } });
  }
}
