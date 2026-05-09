import type { FastifyInstance } from 'fastify';
import {
  CreateAiModelSchema,
  createProviderFromModel,
} from '@ai-tester/ai';
import { aiModelRepo } from '../services/container.js';
import { findDecryptedModel, findMaskedModel } from '@ai-tester/ai';

export async function aiModelRoutes(app: FastifyInstance) {
  // List models for a project
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/ai-models',
    async (request, reply) => {
      const models = await aiModelRepo.findByProjectId(request.params.projectId);
      const masked = await Promise.all(
        models.map((m) => findMaskedModel(aiModelRepo, m.id)),
      );
      return reply.send({ data: masked.filter(Boolean) });
    },
  );

  // Get active model
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/ai-models/active',
    async (request, reply) => {
      const active = await aiModelRepo.findActive(request.params.projectId);
      if (!active) {
        return reply.send({ data: null });
      }
      return reply.send({
        data: {
          ...active,
          apiKey: '********',
          maskedApiKey: active.decryptedApiKey.slice(0, 4) + '****' + active.decryptedApiKey.slice(-4),
        },
      });
    },
  );

  // Set active model
  app.put<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/ai-models/active',
    async (request, reply) => {
      const { modelId } = request.body as { modelId: string | null };
      await aiModelRepo.setActive(request.params.projectId, modelId);
      return reply.send({ data: { success: true } });
    },
  );

  // Create model
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/ai-models',
    async (request, reply) => {
      const body = CreateAiModelSchema.parse({
        ...(request.body as any),
        projectId: request.params.projectId,
      });
      const model = await aiModelRepo.create(body);
      return reply.status(201).send({ data: model });
    },
  );

  // Update model
  app.put<{ Params: { id: string } }>(
    '/api/v1/ai-models/:id',
    async (request, reply) => {
      const body = CreateAiModelSchema.partial().omit({ projectId: true }).parse(request.body);
      const model = await aiModelRepo.update(request.params.id, body);
      return reply.send({ data: model });
    },
  );

  // Delete model
  app.delete<{ Params: { id: string } }>(
    '/api/v1/ai-models/:id',
    async (request, reply) => {
      await aiModelRepo.delete(request.params.id);
      return reply.status(204).send();
    },
  );

  // Test model connection
  app.post<{ Params: { id: string } }>(
    '/api/v1/ai-models/:id/test',
    async (request, reply) => {
      const model = await findDecryptedModel(aiModelRepo, request.params.id);
      if (!model) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Model not found' },
        });
      }

      const provider = createProviderFromModel(model, model.decryptedApiKey);
      const result = await provider.testConnection();
      return reply.send({ data: result });
    },
  );
}
