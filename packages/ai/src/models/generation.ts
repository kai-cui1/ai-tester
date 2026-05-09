import { z } from 'zod';

export const GenerationStrategyEnum = z.enum([
  'happy_path',
  'error_cases',
  'auth_cases',
  'comprehensive',
]);

export const GenerationStatusEnum = z.enum(['pending', 'running', 'completed', 'failed']);

export const TokenUsageSchema = z.object({
  prompt: z.number(),
  completion: z.number(),
  total: z.number(),
});

export const GeneratedStepPreviewSchema = z.object({
  name: z.string(),
  type: z.enum(['http', 'assertion', 'extract']),
  config: z.record(z.any()),
  continueOnFailure: z.boolean().default(false),
  retryCount: z.number().int().default(0),
});

export const GeneratedTestCasePreviewSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  module: z.string().default(''),
  tags: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  steps: z.array(GeneratedStepPreviewSchema),
  variables: z.record(z.string()).default({}),
  endpointId: z.string().optional(),
  reasoning: z.string().optional(),
});

export const GenerationTaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  endpointIds: z.array(z.string()).default([]),
  strategy: GenerationStrategyEnum,
  status: GenerationStatusEnum.default('pending'),
  generatedCases: z.array(GeneratedTestCasePreviewSchema).default([]),
  confirmedCaseIds: z.array(z.string()).default([]),
  error: z.string().nullable().optional(),
  tokenUsage: TokenUsageSchema.nullable().optional(),
  durationMs: z.number().int().nullable().optional(),
  createdAt: z.date(),
  completedAt: z.date().nullable().optional(),
});

export const CreateGenerationTaskSchema = z.object({
  projectId: z.string(),
  endpointIds: z.array(z.string()).min(1),
  strategy: GenerationStrategyEnum,
  customPrompt: z.string().optional(),
});

export type GenerationStrategy = z.infer<typeof GenerationStrategyEnum>;
export type GenerationStatus = z.infer<typeof GenerationStatusEnum>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type GeneratedStepPreview = z.infer<typeof GeneratedStepPreviewSchema>;
export type GeneratedTestCasePreview = z.infer<typeof GeneratedTestCasePreviewSchema>;
export type GenerationTask = z.infer<typeof GenerationTaskSchema>;
export type CreateGenerationTask = z.infer<typeof CreateGenerationTaskSchema>;
