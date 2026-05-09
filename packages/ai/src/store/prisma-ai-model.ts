import { generateId } from '@ai-tester/shared';
import { getPrisma } from '@ai-tester/core';
import type { AiModel, CreateAiModel, UpdateAiModel } from '../models/ai-model.js';
import type { AiModelRepository } from './repository.js';
import { encrypt, decrypt, maskApiKey } from '../crypto.js';

function toAiModel(row: any): AiModel {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    provider: row.provider,
    apiFormat: row.apiFormat ?? 'openai',
    model: row.model,
    apiKey: row.apiKey, // still encrypted at this level
    baseUrl: row.baseUrl ?? undefined,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAiModelRepository implements AiModelRepository {
  async create(data: CreateAiModel): Promise<AiModel> {
    const encryptedKey = encrypt(data.apiKey);
    const row = await getPrisma().aiModel.create({
      data: {
        id: generateId(),
        projectId: data.projectId,
        name: data.name,
        provider: data.provider,
        apiFormat: data.apiFormat ?? 'openai',
        model: data.model,
        apiKey: encryptedKey,
        baseUrl: data.baseUrl ?? null,
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens ?? 4096,
      },
    });
    return toAiModel(row);
  }

  async update(id: string, data: UpdateAiModel): Promise<AiModel> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.apiFormat !== undefined) updateData.apiFormat = data.apiFormat;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.apiKey !== undefined) updateData.apiKey = encrypt(data.apiKey);
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl ?? null;
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;

    const row = await getPrisma().aiModel.update({
      where: { id },
      data: updateData,
    });
    return toAiModel(row);
  }

  async delete(id: string): Promise<void> {
    await getPrisma().aiModel.delete({ where: { id } });
  }

  async findById(id: string): Promise<AiModel | null> {
    const row = await getPrisma().aiModel.findUnique({ where: { id } });
    return row ? toAiModel(row) : null;
  }

  async findByProjectId(projectId: string): Promise<AiModel[]> {
    const rows = await getPrisma().aiModel.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAiModel);
  }

  /** Get the active model for a project, with decrypted API key */
  async findActive(projectId: string): Promise<(AiModel & { decryptedApiKey: string }) | null> {
    const project = await getPrisma().project.findUnique({
      where: { id: projectId },
      select: { activeModelId: true },
    });
    if (!project?.activeModelId) return null;

    const model = await this.findById(project.activeModelId);
    if (!model) return null;

    return {
      ...model,
      decryptedApiKey: decrypt(model.apiKey),
    };
  }

  async setActive(projectId: string, modelId: string | null): Promise<void> {
    await getPrisma().project.update({
      where: { id: projectId },
      data: { activeModelId: modelId },
    });
  }
}

/** Get a model with decrypted API key (for internal use) */
export async function findDecryptedModel(
  repo: AiModelRepository,
  id: string,
): Promise<(AiModel & { decryptedApiKey: string }) | null> {
  const model = await repo.findById(id);
  if (!model) return null;
  return {
    ...model,
    decryptedApiKey: decrypt(model.apiKey),
  };
}

/** Get a model with masked API key (for API responses) */
export async function findMaskedModel(
  repo: AiModelRepository,
  id: string,
): Promise<(AiModel & { maskedApiKey: string }) | null> {
  const model = await repo.findById(id);
  if (!model) return null;
  const decryptedKey = decrypt(model.apiKey);
  return {
    ...model,
    apiKey: '********',
    maskedApiKey: maskApiKey(decryptedKey),
  };
}
