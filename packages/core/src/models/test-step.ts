import { z } from 'zod';

// --- Step Types ---

export const StepType = z.enum(['http', 'assertion', 'extract', 'call', 'load-dataset']);
export type StepType = z.infer<typeof StepType>;

// --- Step Config Schemas ---

export const HttpMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export const HttpStepConfigSchema = z.object({
  method: HttpMethod,
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  contentType: z.string().default('application/json'),
  timeout: z.number().positive().default(30000),
});

export const AssertionOperator = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'matches',
  'exists',
  'not_exists',
  'type_is',
]);

export const AssertionSource = z.enum(['status', 'header', 'body', 'jsonpath', 'variable']);

export const AssertionStepConfigSchema = z.object({
  source: AssertionSource,
  expression: z.string().optional(),
  operator: AssertionOperator,
  expected: z.any().optional(),
});

export const ExtractSource = z.enum(['body', 'jsonpath', 'header', 'status', 'regex']);

export const ExtractStepConfigSchema = z.object({
  source: ExtractSource,
  expression: z.string().optional(),
  variableName: z.string().min(1),
});

export const CallStepConfigSchema = z.object({
  testCaseId: z.string().min(1),
});

export const LoadDatasetStepConfigSchema = z.object({
  datasetId: z.string().min(1),
  variableName: z.string().min(1),
});

// --- Union config schema for validation dispatch ---

export const StepConfigSchema = z.union([
  HttpStepConfigSchema,
  AssertionStepConfigSchema,
  ExtractStepConfigSchema,
  CallStepConfigSchema,
  LoadDatasetStepConfigSchema,
]);

// --- TestStep ---

export const TestStepSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: StepType,
  config: z.record(z.any()), // validated per-type by executor
  order: z.number().int().min(0),
  continueOnFailure: z.boolean().default(false),
  retryCount: z.number().int().min(0).default(0),
});

export const CreateTestStepSchema = z.object({
  name: z.string().min(1),
  type: StepType,
  config: z.record(z.any()),
  order: z.number().int().min(0),
  continueOnFailure: z.boolean().default(false),
  retryCount: z.number().int().min(0).default(0),
});

// --- Types ---

export type HttpStepConfig = z.infer<typeof HttpStepConfigSchema>;
export type AssertionStepConfig = z.infer<typeof AssertionStepConfigSchema>;
export type ExtractStepConfig = z.infer<typeof ExtractStepConfigSchema>;
export type CallStepConfig = z.infer<typeof CallStepConfigSchema>;
export type LoadDatasetStepConfig = z.infer<typeof LoadDatasetStepConfigSchema>;
export type TestStep = z.infer<typeof TestStepSchema>;
export type CreateTestStep = z.infer<typeof CreateTestStepSchema>;
