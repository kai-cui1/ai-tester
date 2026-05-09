import { z } from 'zod';

export const AiApiFormatEnum = z.enum(['openai', 'anthropic']);

export const AiModelSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  provider: z.string(),
  apiFormat: AiApiFormatEnum.default('openai'),
  model: z.string(),
  apiKey: z.string(),
  baseUrl: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateAiModelSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  provider: z.string().min(1),
  apiFormat: AiApiFormatEnum.default('openai'),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().nullable().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
});

export const UpdateAiModelSchema = CreateAiModelSchema.partial().omit({ projectId: true });

export type AiProvider = string;
export type AiApiFormat = z.infer<typeof AiApiFormatEnum>;
export type AiModel = z.infer<typeof AiModelSchema>;
export type CreateAiModel = z.infer<typeof CreateAiModelSchema>;
export type UpdateAiModel = z.infer<typeof UpdateAiModelSchema>;
