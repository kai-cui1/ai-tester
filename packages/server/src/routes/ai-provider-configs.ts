import type { FastifyInstance } from 'fastify';
import {
  CreateAiProviderConfigSchema,
  UpdateAiProviderConfigSchema,
} from '@ai-tester/ai';
import { aiProviderConfigRepo } from '../services/container.js';

export async function aiProviderConfigRoutes(app: FastifyInstance) {
  // List all provider configs
  app.get('/api/v1/ai-provider-configs', async (_request, reply) => {
    const configs = await aiProviderConfigRepo.findAll();
    return reply.send({ data: configs });
  });

  // Get provider config by id
  app.get<{ Params: { id: string } }>(
    '/api/v1/ai-provider-configs/:id',
    async (request, reply) => {
      const config = await aiProviderConfigRepo.findById(request.params.id);
      if (!config) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Provider config not found' },
        });
      }
      return reply.send({ data: config });
    },
  );

  // Create provider config
  app.post('/api/v1/ai-provider-configs', async (request, reply) => {
    const body = CreateAiProviderConfigSchema.parse(request.body);
    const config = await aiProviderConfigRepo.create(body);
    return reply.status(201).send({ data: config });
  });

  // Update provider config
  app.put<{ Params: { id: string } }>(
    '/api/v1/ai-provider-configs/:id',
    async (request, reply) => {
      const body = UpdateAiProviderConfigSchema.parse(request.body);
      const config = await aiProviderConfigRepo.update(request.params.id, body);
      return reply.send({ data: config });
    },
  );

  // Delete provider config
  app.delete<{ Params: { id: string } }>(
    '/api/v1/ai-provider-configs/:id',
    async (request, reply) => {
      await aiProviderConfigRepo.delete(request.params.id);
      return reply.status(204).send();
    },
  );
}
