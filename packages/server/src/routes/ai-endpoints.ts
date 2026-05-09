import type { FastifyInstance } from 'fastify';
import {
  CreateApiEndpointSchema,
  UpdateApiEndpointSchema,
  OpenApiParser,
  CurlParser,
} from '@ai-tester/ai';
import type { CreateApiEndpoint } from '@ai-tester/ai';
import { apiEndpointRepo, aiModelRepo } from '../services/container.js';
import { createProviderFromModel } from '@ai-tester/ai';

export async function aiEndpointRoutes(app: FastifyInstance) {
  // Create endpoint manually
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/endpoints',
    async (request, reply) => {
      const body = CreateApiEndpointSchema.parse({
        ...(request.body as any),
        projectId: request.params.projectId,
        source: 'manual',
      });
      const endpoint = await apiEndpointRepo.create(body);
      return reply.status(201).send({ data: endpoint });
    },
  );

  // List endpoints
  app.get<{ Params: { projectId: string }; Querystring: { method?: string; search?: string } }>(
    '/api/v1/projects/:projectId/endpoints',
    async (request, reply) => {
      const endpoints = await apiEndpointRepo.findByProjectId(
        request.params.projectId,
        {
          method: request.query.method,
          search: request.query.search,
        },
      );
      return reply.send({ data: endpoints });
    },
  );

  // Get endpoint by id
  app.get<{ Params: { id: string } }>(
    '/api/v1/endpoints/:id',
    async (request, reply) => {
      const endpoint = await apiEndpointRepo.findById(request.params.id);
      if (!endpoint) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
        });
      }
      return reply.send({ data: endpoint });
    },
  );

  // Update endpoint
  app.put<{ Params: { id: string } }>(
    '/api/v1/endpoints/:id',
    async (request, reply) => {
      const body = UpdateApiEndpointSchema.parse(request.body);
      const endpoint = await apiEndpointRepo.update(request.params.id, body);
      return reply.send({ data: endpoint });
    },
  );

  // Delete endpoint
  app.delete<{ Params: { id: string } }>(
    '/api/v1/endpoints/:id',
    async (request, reply) => {
      await apiEndpointRepo.delete(request.params.id);
      return reply.status(204).send();
    },
  );

  // Import OpenAPI document
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/endpoints/import/openapi',
    async (request, reply) => {
      const { content } = request.body as { content: string };
      if (!content) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'content field is required' },
        });
      }

      const parser = new OpenApiParser();
      const parsed = await parser.parse(content, request.params.projectId);
      const endpoints = await apiEndpointRepo.createMany(parsed);
      return reply.status(201).send({ data: endpoints, meta: { imported: endpoints.length } });
    },
  );

  // Parse cURL command
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/endpoints/import/curl',
    async (request, reply) => {
      const { content } = request.body as { content: string };
      if (!content) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'content field is required' },
        });
      }

      const parser = new CurlParser();
      const parsed = await parser.parse(content, request.params.projectId);
      const endpoints = await apiEndpointRepo.createMany(parsed);
      return reply.status(201).send({ data: endpoints, meta: { imported: endpoints.length } });
    },
  );

  // Parse free text with LLM (returns preview, does not persist)
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/endpoints/parse-text',
    async (request, reply) => {
      const { content } = request.body as { content: string };
      if (!content) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'content field is required' },
        });
      }

      const activeModel = await aiModelRepo.findActive(request.params.projectId);
      if (!activeModel) {
        return reply.status(400).send({
          error: { code: 'AI_NOT_CONFIGURED', message: 'Please configure AI settings first' },
        });
      }

      const provider = createProviderFromModel(activeModel, activeModel.decryptedApiKey);

      const systemPrompt = `You are an API documentation parser. Extract API endpoint information from the following text description.
For each endpoint found, extract:
- method: HTTP method (GET, POST, PUT, PATCH, DELETE)
- path: API path (e.g., /api/users/:id)
- summary: Brief summary of what the endpoint does
- description: Detailed description if available
- parameters: Query/path/header parameters
- requestBody: Request body schema if applicable
- responseBody: Response body schema if applicable
- authentication: Auth type (bearer, api-key, basic, none)

Return a JSON object with a single "endpoints" array.`;

      const result = await provider.chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        { temperature: 0.3 },
      );

      // Try to parse the LLM response as JSON
      let parsed: CreateApiEndpoint[] = [];
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          const rawEndpoints = data.endpoints || data;
          parsed = (Array.isArray(rawEndpoints) ? rawEndpoints : []).map((ep: any) => ({
            projectId: request.params.projectId,
            method: ep.method || 'GET',
            path: ep.path || '/',
            summary: ep.summary || `${ep.method} ${ep.path}`,
            description: ep.description,
            tags: ep.tags || [],
            parameters: ep.parameters || [],
            requestBody: ep.requestBody ? JSON.stringify(ep.requestBody) : undefined,
            responseBody: ep.responseBody ? JSON.stringify(ep.responseBody) : undefined,
            authentication: ep.authentication,
            source: 'text' as const,
          }));
        }
      } catch {
        return reply.status(422).send({
          error: { code: 'PARSE_ERROR', message: 'Failed to parse LLM response', raw: result },
        });
      }

      return reply.send({ data: parsed });
    },
  );
}
