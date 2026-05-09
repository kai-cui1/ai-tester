import { z } from 'zod';

export const TestSuiteSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  testCaseIds: z.array(z.string()).default([]),
  parallelism: z.number().int().min(1).default(1),
  environment: z.string().optional(),
  variables: z.record(z.string()).default({}),
  setupCaseId: z.string().optional(),
  teardownCaseId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTestSuiteSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  testCaseIds: z.array(z.string()).default([]),
  parallelism: z.number().int().min(1).default(1),
  environment: z.string().optional(),
  variables: z.record(z.string()).default({}),
  setupCaseId: z.string().optional(),
  teardownCaseId: z.string().optional(),
});

export const UpdateTestSuiteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  testCaseIds: z.array(z.string()).optional(),
  parallelism: z.number().int().min(1).optional(),
  environment: z.string().optional(),
  variables: z.record(z.string()).optional(),
  setupCaseId: z.string().nullable().optional(),
  teardownCaseId: z.string().nullable().optional(),
});

export type TestSuite = z.infer<typeof TestSuiteSchema>;
export type CreateTestSuite = z.infer<typeof CreateTestSuiteSchema>;
export type UpdateTestSuite = z.infer<typeof UpdateTestSuiteSchema>;
