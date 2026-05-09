import { generateId } from '@ai-tester/shared';
import { getPrisma } from '@ai-tester/core';
import type { AiProviderConfig, CreateAiProviderConfig, UpdateAiProviderConfig } from '../models/ai-provider-config.js';
import type { AiProviderConfigRepository } from './repository.js';

function toProviderConfig(row: any): AiProviderConfig {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    baseUrl: row.baseUrl ?? undefined,
    apiFormat: row.apiFormat ?? 'openai',
    description: row.description ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAiProviderConfigRepository implements AiProviderConfigRepository {
  async create(data: CreateAiProviderConfig): Promise<AiProviderConfig> {
    const row = await getPrisma().aiProviderConfig.create({
      data: {
        id: generateId(),
        name: data.name,
        key: data.key,
        baseUrl: data.baseUrl ?? null,
        apiFormat: data.apiFormat ?? 'openai',
        description: data.description ?? null,
      },
    });
    return toProviderConfig(row);
  }

  async update(id: string, data: UpdateAiProviderConfig): Promise<AiProviderConfig> {
    const row = await getPrisma().aiProviderConfig.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.key !== undefined && { key: data.key }),
        ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl ?? null }),
        ...(data.apiFormat !== undefined && { apiFormat: data.apiFormat }),
        ...(data.description !== undefined && { description: data.description ?? null }),
      },
    });
    return toProviderConfig(row);
  }

  async delete(id: string): Promise<void> {
    await getPrisma().aiProviderConfig.delete({ where: { id } });
  }

  async findById(id: string): Promise<AiProviderConfig | null> {
    const row = await getPrisma().aiProviderConfig.findUnique({ where: { id } });
    return row ? toProviderConfig(row) : null;
  }

  async findByKey(key: string): Promise<AiProviderConfig | null> {
    const row = await getPrisma().aiProviderConfig.findUnique({ where: { key } });
    return row ? toProviderConfig(row) : null;
  }

  async findAll(): Promise<AiProviderConfig[]> {
    const rows = await getPrisma().aiProviderConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toProviderConfig);
  }
}
