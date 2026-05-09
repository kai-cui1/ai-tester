import type { FastifyInstance } from 'fastify';
import { CreateTestSuiteSchema, UpdateTestSuiteSchema } from '@ai-tester/core';
import { testSuiteRepo } from '../services/container.js';

export async function testSuiteRoutes(app: FastifyInstance) {
  // Create suite
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/suites',
    async (request, reply) => {
      const body = CreateTestSuiteSchema.parse({
        ...(request.body as any),
        projectId: request.params.projectId,
      });
      const suite = await testSuiteRepo.create(body);
      return reply.status(201).send({ data: suite });
    },
  );

  // List suites by project
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/suites',
    async (request, reply) => {
      const suites = await testSuiteRepo.findByProjectId(request.params.projectId);
      return reply.send({ data: suites });
    },
  );

  // Get suite by id
  app.get<{ Params: { id: string } }>('/api/v1/suites/:id', async (request, reply) => {
    const suite = await testSuiteRepo.findById(request.params.id);
    if (!suite)
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'TestSuite not found' } });
    return reply.send({ data: suite });
  });

  // Update suite
  app.put<{ Params: { id: string } }>('/api/v1/suites/:id', async (request, reply) => {
    const body = UpdateTestSuiteSchema.parse(request.body);
    const suite = await testSuiteRepo.update(request.params.id, body);
    return reply.send({ data: suite });
  });

  // Delete suite
  app.delete<{ Params: { id: string } }>('/api/v1/suites/:id', async (request, reply) => {
    await testSuiteRepo.delete(request.params.id);
    return reply.status(204).send();
  });
}
