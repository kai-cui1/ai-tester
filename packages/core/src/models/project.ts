import { z } from 'zod';

export const EnvironmentSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  variables: z.record(z.string()).default({}),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  environments: z.array(EnvironmentSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  environments: z.array(EnvironmentSchema).default([]),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export type Environment = z.infer<typeof EnvironmentSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
