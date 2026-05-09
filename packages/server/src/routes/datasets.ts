import type { FastifyInstance } from 'fastify';
import { CreateTestDataSetSchema, UpdateTestDataSetSchema } from '@ai-tester/core';
import { testDataSetRepo } from '../services/container.js';

export async function datasetRoutes(app: FastifyInstance) {
  // Create dataset
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/datasets',
    async (request, reply) => {
      const body = CreateTestDataSetSchema.parse({
        ...(request.body as any),
        projectId: request.params.projectId,
      });
      const dataset = await testDataSetRepo.create(body);
      return reply.status(201).send({ data: dataset });
    },
  );

  // List datasets by project
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/datasets',
    async (request, reply) => {
      const datasets = await testDataSetRepo.findByProjectId(request.params.projectId);
      return reply.send({ data: datasets });
    },
  );

  // Get dataset by id
  app.get<{ Params: { id: string } }>('/api/v1/datasets/:id', async (request, reply) => {
    const dataset = await testDataSetRepo.findById(request.params.id);
    if (!dataset)
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'TestDataSet not found' } });
    return reply.send({ data: dataset });
  });

  // Update dataset
  app.put<{ Params: { id: string } }>('/api/v1/datasets/:id', async (request, reply) => {
    const body = UpdateTestDataSetSchema.parse(request.body);
    const dataset = await testDataSetRepo.update(request.params.id, body);
    return reply.send({ data: dataset });
  });

  // Delete dataset
  app.delete<{ Params: { id: string } }>('/api/v1/datasets/:id', async (request, reply) => {
    await testDataSetRepo.delete(request.params.id);
    return reply.status(204).send();
  });
}
