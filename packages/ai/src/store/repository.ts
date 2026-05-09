import type {
  ApiEndpoint,
  CreateApiEndpoint,
  UpdateApiEndpoint,
} from '../models/api-endpoint.js';
import type {
  GenerationTask,
} from '../models/generation.js';
import type {
  AiModel,
  CreateAiModel,
  UpdateAiModel,
} from '../models/ai-model.js';
import type {
  AiProviderConfig,
  CreateAiProviderConfig,
  UpdateAiProviderConfig,
} from '../models/ai-provider-config.js';

export interface AiModelRepository {
  create(data: CreateAiModel): Promise<AiModel>;
  update(id: string, data: UpdateAiModel): Promise<AiModel>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<AiModel | null>;
  findByProjectId(projectId: string): Promise<AiModel[]>;
  findActive(projectId: string): Promise<(AiModel & { decryptedApiKey: string }) | null>;
  setActive(projectId: string, modelId: string | null): Promise<void>;
}

export interface ApiEndpointRepository {
  create(data: CreateApiEndpoint): Promise<ApiEndpoint>;
  createMany(data: CreateApiEndpoint[]): Promise<ApiEndpoint[]>;
  findById(id: string): Promise<ApiEndpoint | null>;
  findByProjectId(
    projectId: string,
    filters?: { method?: string; search?: string },
  ): Promise<ApiEndpoint[]>;
  update(id: string, data: UpdateApiEndpoint): Promise<ApiEndpoint>;
  delete(id: string): Promise<void>;
}

export interface AiProviderConfigRepository {
  create(data: CreateAiProviderConfig): Promise<AiProviderConfig>;
  update(id: string, data: UpdateAiProviderConfig): Promise<AiProviderConfig>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<AiProviderConfig | null>;
  findByKey(key: string): Promise<AiProviderConfig | null>;
  findAll(): Promise<AiProviderConfig[]>;
}

export interface GenerationTaskRepository {
  create(data: Omit<GenerationTask, 'createdAt' | 'completedAt'>): Promise<GenerationTask>;
  findById(id: string): Promise<GenerationTask | null>;
  findByProjectId(projectId: string): Promise<GenerationTask[]>;
  update(id: string, data: Partial<GenerationTask>): Promise<GenerationTask>;
}
