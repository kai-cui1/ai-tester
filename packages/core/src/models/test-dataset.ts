import { z } from 'zod';

export const DataFieldType = z.enum([
  'string',
  'number',
  'boolean',
  'email',
  'uuid',
  'date',
  'custom',
]);

export const DataFieldSchema = z.object({
  name: z.string().min(1),
  type: DataFieldType,
});

export const TestDataSetSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  fields: z.array(DataFieldSchema).default([]),
  rows: z.array(z.record(z.any())).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTestDataSetSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  fields: z.array(DataFieldSchema).default([]),
  rows: z.array(z.record(z.any())).default([]),
});

export const UpdateTestDataSetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  fields: z.array(DataFieldSchema).optional(),
  rows: z.array(z.record(z.any())).optional(),
});

export type DataField = z.infer<typeof DataFieldSchema>;
export type TestDataSet = z.infer<typeof TestDataSetSchema>;
export type CreateTestDataSet = z.infer<typeof CreateTestDataSetSchema>;
export type UpdateTestDataSet = z.infer<typeof UpdateTestDataSetSchema>;
