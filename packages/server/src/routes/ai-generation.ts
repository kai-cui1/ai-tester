import type { FastifyInstance } from 'fastify';
import { generateId } from '@ai-tester/shared';
import {
  CreateGenerationTaskSchema,
  TestCaseGenerator,
  createProviderFromModel,
} from '@ai-tester/ai';
import type { CreateTestCase } from '@ai-tester/core';
import {
  aiModelRepo,
  apiEndpointRepo,
  generationTaskRepo,
} from '../services/container.js';
import { testCaseRepo } from '../services/container.js';

export async function aiGenerationRoutes(app: FastifyInstance) {
  // Trigger generation
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/ai/generate',
    async (request, reply) => {
      const body = CreateGenerationTaskSchema.parse({
        ...(request.body as any),
        projectId: request.params.projectId,
      });

      // Get active AI model
      const activeModel = await aiModelRepo.findActive(request.params.projectId);
      if (!activeModel) {
        return reply.status(400).send({
          error: { code: 'AI_NOT_CONFIGURED', message: 'Please configure AI settings first' },
        });
      }

      // Load selected endpoints
      const endpoints = await Promise.all(
        body.endpointIds.map((id) => apiEndpointRepo.findById(id)),
      );
      const validEndpoints = endpoints.filter((e) => e !== null);

      if (validEndpoints.length === 0) {
        return reply.status(400).send({
          error: { code: 'NO_ENDPOINTS', message: 'No valid endpoints found' },
        });
      }

      // Create task record
      const task = await generationTaskRepo.create({
        id: generateId(),
        projectId: request.params.projectId,
        endpointIds: body.endpointIds,
        strategy: body.strategy,
        status: 'running',
        generatedCases: [],
        confirmedCaseIds: [],
      });

      const startTime = Date.now();

      try {
        const provider = createProviderFromModel(activeModel, activeModel.decryptedApiKey);
        const generator = new TestCaseGenerator({ provider });

        const cases = await generator.generate(
          validEndpoints,
          body.strategy,
          body.customPrompt,
        );

        const durationMs = Date.now() - startTime;

        const updated = await generationTaskRepo.update(task.id, {
          status: 'completed',
          generatedCases: cases,
          durationMs,
          completedAt: new Date(),
        });

        return reply.send({ data: updated });
      } catch (err) {
        const durationMs = Date.now() - startTime;
        await generationTaskRepo.update(task.id, {
          status: 'failed',
          error: (err as Error).message,
          durationMs,
          completedAt: new Date(),
        });
        return reply.status(500).send({
          error: { code: 'GENERATION_FAILED', message: (err as Error).message },
        });
      }
    },
  );

  // List generation tasks
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/ai/tasks',
    async (request, reply) => {
      const tasks = await generationTaskRepo.findByProjectId(request.params.projectId);
      return reply.send({ data: tasks });
    },
  );

  // Get task detail
  app.get<{ Params: { id: string } }>(
    '/api/v1/ai/tasks/:id',
    async (request, reply) => {
      const task = await generationTaskRepo.findById(request.params.id);
      if (!task) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Generation task not found' },
        });
      }
      return reply.send({ data: task });
    },
  );

  // Confirm and persist selected generated cases
  app.post<{ Params: { id: string } }>(
    '/api/v1/ai/tasks/:id/confirm',
    async (request, reply) => {
      const { selectedIndices } = request.body as { selectedIndices: number[] };
      if (!selectedIndices || !Array.isArray(selectedIndices)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'selectedIndices array is required' },
        });
      }

      const task = await generationTaskRepo.findById(request.params.id);
      if (!task) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Generation task not found' },
        });
      }

      if (task.status !== 'completed') {
        return reply.status(400).send({
          error: { code: 'INVALID_STATUS', message: 'Task must be completed to confirm cases' },
        });
      }

      const selectedCases = selectedIndices
        .filter((i) => i >= 0 && i < task.generatedCases.length)
        .map((i) => task.generatedCases[i]);

      const createdIds: string[] = [];

      for (const preview of selectedCases) {
        const createData: CreateTestCase = {
          projectId: task.projectId,
          name: preview.name,
          description: preview.description,
          module: preview.module || '',
          tags: preview.tags || [],
          priority: preview.priority || 'medium',
          steps: preview.steps.map((s, idx) => ({
            name: s.name,
            type: s.type,
            config: s.config,
            order: idx,
            continueOnFailure: s.continueOnFailure ?? false,
            retryCount: s.retryCount ?? 0,
          })),
          variables: preview.variables || {},
        };

        const created = await testCaseRepo.create(createData);
        createdIds.push(created.id);
      }

      await generationTaskRepo.update(task.id, {
        confirmedCaseIds: [...task.confirmedCaseIds, ...createdIds],
      });

      return reply.send({
        data: { confirmedCount: createdIds.length, testCaseIds: createdIds },
      });
    },
  );
}
