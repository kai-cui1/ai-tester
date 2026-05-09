import type { FastifyInstance } from 'fastify';
import { CreateTestCaseSchema, UpdateTestCaseSchema } from '@ai-tester/core';
import { testCaseRepo } from '../services/container.js';

export async function testCaseRoutes(app: FastifyInstance) {
  // Create test case
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/test-cases',
    async (request, reply) => {
      const body = CreateTestCaseSchema.parse({
        ...(request.body as any),
        projectId: request.params.projectId,
      });
      const testCase = await testCaseRepo.create(body);
      return reply.status(201).send({ data: testCase });
    },
  );

  // List test cases by project
  app.get<{
    Params: { projectId: string };
    Querystring: { module?: string; tags?: string; priority?: string; search?: string; page?: string; pageSize?: string };
  }>('/api/v1/projects/:projectId/test-cases', async (request, reply) => {
    const { module, tags, priority, search, page, pageSize } = request.query;
    const result = await testCaseRepo.findByProjectId(request.params.projectId, {
      module,
      tags: tags ? tags.split(',') : undefined,
      priority,
      search,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
    return reply.send({
      data: result.items,
      meta: { total: result.total, page: page ? parseInt(page) : 1, pageSize: pageSize ? parseInt(pageSize) : 50 },
    });
  });

  // Get test case by id
  app.get<{ Params: { id: string } }>('/api/v1/test-cases/:id', async (request, reply) => {
    const testCase = await testCaseRepo.findById(request.params.id);
    if (!testCase)
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'TestCase not found' } });
    return reply.send({ data: testCase });
  });

  // Update test case
  app.put<{ Params: { id: string } }>('/api/v1/test-cases/:id', async (request, reply) => {
    const body = UpdateTestCaseSchema.parse(request.body);
    const testCase = await testCaseRepo.update(request.params.id, body);
    return reply.send({ data: testCase });
  });

  // Delete test case
  app.delete<{ Params: { id: string } }>('/api/v1/test-cases/:id', async (request, reply) => {
    await testCaseRepo.delete(request.params.id);
    return reply.status(204).send();
  });

  // Duplicate test case
  app.post<{ Params: { id: string } }>(
    '/api/v1/test-cases/:id/duplicate',
    async (request, reply) => {
      const testCase = await testCaseRepo.duplicate(request.params.id);
      return reply.status(201).send({ data: testCase });
    },
  );
}
