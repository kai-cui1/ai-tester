import { z } from 'zod';

export const AiProviderEnum = z.enum(['openai', 'anthropic', 'custom']);

export const AiConfigSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  provider: AiProviderEnum,
  model: z.string(),
  apiKey: z.string(),
  baseUrl: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateAiConfigSchema = z.object({
  projectId: z.string(),
  provider: AiProviderEnum,
  model: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().nullable().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
});

export const UpdateAiConfigSchema = CreateAiConfigSchema.omit({ projectId: true }).partial();

export type AiProvider = z.infer<typeof AiProviderEnum>;
export type AiConfig = z.infer<typeof AiConfigSchema>;
export type CreateAiConfig = z.infer<typeof CreateAiConfigSchema>;
export type UpdateAiConfig = z.infer<typeof UpdateAiConfigSchema>;
