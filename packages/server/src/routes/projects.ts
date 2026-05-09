import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateProjectSchema, UpdateProjectSchema } from '@ai-tester/core';
import { projectRepo } from '../services/container.js';

export async function projectRoutes(app: FastifyInstance) {
  // Create project
  app.post('/api/v1/projects', async (request, reply) => {
    const body = CreateProjectSchema.parse(request.body);
    const project = await projectRepo.create(body);
    return reply.status(201).send({ data: project });
  });

  // List projects
  app.get('/api/v1/projects', async (_request, reply) => {
    const projects = await projectRepo.findAll();
    return reply.send({ data: projects });
  });

  // Get project by id
  app.get<{ Params: { id: string } }>('/api/v1/projects/:id', async (request, reply) => {
    const project = await projectRepo.findById(request.params.id);
    if (!project) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return reply.send({ data: project });
  });

  // Update project
  app.put<{ Params: { id: string } }>('/api/v1/projects/:id', async (request, reply) => {
    const body = UpdateProjectSchema.parse(request.body);
    const project = await projectRepo.update(request.params.id, body);
    return reply.send({ data: project });
  });

  // Delete project
  app.delete<{ Params: { id: string } }>('/api/v1/projects/:id', async (request, reply) => {
    await projectRepo.delete(request.params.id);
    return reply.status(204).send();
  });
}
