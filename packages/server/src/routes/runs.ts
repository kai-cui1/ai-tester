import type { FastifyInstance } from 'fastify';
import { CreateTestRunSchema } from '@ai-tester/core';
import { testRunRepo, orchestrator } from '../services/container.js';

export async function runRoutes(app: FastifyInstance) {
  // Trigger a run
  app.post('/api/v1/runs', async (request, reply) => {
    const body = CreateTestRunSchema.parse(request.body);

    // Execute asynchronously - return immediately with pending run
    const run = await orchestrator.executeRun(
      body.suiteId,
      body.environment,
      body.variables,
      body.triggeredBy,
    );

    return reply.status(201).send({ data: run });
  });

  // List runs
  app.get<{
    Querystring: { suiteId?: string; status?: string; page?: string; pageSize?: string };
  }>('/api/v1/runs', async (request, reply) => {
    const { suiteId, status, page, pageSize } = request.query;
    const result = await testRunRepo.findAll({
      suiteId,
      status,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
    return reply.send({
      data: result.items,
      meta: { total: result.total, page: page ? parseInt(page) : 1, pageSize: pageSize ? parseInt(pageSize) : 50 },
    });
  });

  // Get run detail
  app.get<{ Params: { id: string } }>('/api/v1/runs/:id', async (request, reply) => {
    const run = await testRunRepo.findById(request.params.id);
    if (!run) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'TestRun not found' } });
    return reply.send({ data: run });
  });
}
