import { z } from 'zod';
import { TestStepSchema, CreateTestStepSchema } from './test-step.js';

export const Priority = z.enum(['critical', 'high', 'medium', 'low']);
export type Priority = z.infer<typeof Priority>;

export const TestCaseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  module: z.string().default(''),
  tags: z.array(z.string()).default([]),
  priority: Priority.default('medium'),
  steps: z.array(TestStepSchema).default([]),
  variables: z.record(z.string()).default({}),
  version: z.number().int().min(1).default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTestCaseSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  module: z.string().default(''),
  tags: z.array(z.string()).default([]),
  priority: Priority.default('medium'),
  steps: z.array(CreateTestStepSchema).default([]),
  variables: z.record(z.string()).default({}),
});

export const UpdateTestCaseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  module: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: Priority.optional(),
  steps: z.array(CreateTestStepSchema).optional(),
  variables: z.record(z.string()).optional(),
});

export type TestCase = z.infer<typeof TestCaseSchema>;
export type CreateTestCase = z.infer<typeof CreateTestCaseSchema>;
export type UpdateTestCase = z.infer<typeof UpdateTestCaseSchema>;
