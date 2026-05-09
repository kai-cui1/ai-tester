import { z } from 'zod';

export const AiProviderConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  baseUrl: z.string().nullable().optional(),
  apiFormat: z.enum(['openai', 'anthropic']).default('openai'),
  description: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateAiProviderConfigSchema = z.object({
  name: z.string().min(1),
  key: z.string().min(1),
  baseUrl: z.string().url().nullable().optional(),
  apiFormat: z.enum(['openai', 'anthropic']).default('openai'),
  description: z.string().nullable().optional(),
});

export const UpdateAiProviderConfigSchema = CreateAiProviderConfigSchema.partial();

export type AiProviderConfig = z.infer<typeof AiProviderConfigSchema>;
export type CreateAiProviderConfig = z.infer<typeof CreateAiProviderConfigSchema>;
export type UpdateAiProviderConfig = z.infer<typeof UpdateAiProviderConfigSchema>;
