import { z } from 'zod';

export const EndpointSourceEnum = z.enum(['manual', 'openapi', 'curl', 'text']);
export const AuthTypeEnum = z.enum(['bearer', 'api-key', 'basic', 'none']);

export const EndpointParameterSchema = z.object({
  name: z.string(),
  in: z.enum(['query', 'path', 'header', 'cookie']),
  type: z.string().default('string'),
  required: z.boolean().default(false),
  description: z.string().optional(),
});

export const ApiEndpointSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  method: z.string(),
  path: z.string(),
  summary: z.string(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  parameters: z.array(EndpointParameterSchema).default([]),
  requestBody: z.string().nullable().optional(),
  responseBody: z.string().nullable().optional(),
  authentication: AuthTypeEnum.nullable().optional(),
  source: EndpointSourceEnum.default('manual'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateApiEndpointSchema = z.object({
  projectId: z.string(),
  method: z.string().min(1),
  path: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  parameters: z.array(EndpointParameterSchema).default([]),
  requestBody: z.string().nullable().optional(),
  responseBody: z.string().nullable().optional(),
  authentication: AuthTypeEnum.nullable().optional(),
  source: EndpointSourceEnum.default('manual'),
});

export const UpdateApiEndpointSchema = CreateApiEndpointSchema.omit({ projectId: true, source: true }).partial();

export type EndpointSource = z.infer<typeof EndpointSourceEnum>;
export type AuthType = z.infer<typeof AuthTypeEnum>;
export type EndpointParameter = z.infer<typeof EndpointParameterSchema>;
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
export type CreateApiEndpoint = z.infer<typeof CreateApiEndpointSchema>;
export type UpdateApiEndpoint = z.infer<typeof UpdateApiEndpointSchema>;
