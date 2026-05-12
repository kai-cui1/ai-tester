import type { FastifyInstance } from 'fastify';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getBaselineDir(projectId: string): string {
  const dir = path.join(__dirname, '../../../.ai-tester-baselines', projectId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function baselineRoutes(app: FastifyInstance) {
  // Upload a baseline image (base64 encoded PNG in JSON body)
  app.post<{ Params: { id: string }; Body: { name: string; data: string } }>(
    '/api/v1/projects/:id/baselines',
    async (request, reply) => {
      const projectId = request.params.id;
      const { name, data } = request.body;
      if (!name || !data) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'name and data (base64) are required' } });
      }

      const baselineDir = getBaselineDir(projectId);
      const filename = name.endsWith('.png') ? name : `${name}.png`;
      const filePath = path.join(baselineDir, filename);

      // Decode base64 and write file
      const buffer = Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64');
      await fs.writeFile(filePath, buffer);

      return reply.status(201).send({
        data: { name: filename, path: filePath, size: buffer.length },
      });
    },
  );

  // List baseline images for a project
  app.get<{ Params: { id: string } }>('/api/v1/projects/:id/baselines', async (request, reply) => {
    const projectId = request.params.id;
    const baselineDir = getBaselineDir(projectId);

    try {
      const files = await fs.readdir(baselineDir);
      const baselines = await Promise.all(
        files
          .filter((f) => f.endsWith('.png'))
          .map(async (f) => {
            const stat = await fs.stat(path.join(baselineDir, f));
            return { name: f, path: path.join(baselineDir, f), size: stat.size, updatedAt: stat.mtime };
          }),
      );
      return reply.send({ data: baselines });
    } catch {
      return reply.send({ data: [] });
    }
  });

  // Delete a baseline image
  app.delete<{ Params: { id: string; name: string } }>('/api/v1/projects/:id/baselines/:name', async (request, reply) => {
    const { id, name } = request.params;
    const baselineDir = getBaselineDir(id);
    const filePath = path.join(baselineDir, name);

    // Security: prevent path traversal
    if (!filePath.startsWith(baselineDir)) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid filename' } });
    }

    try {
      await fs.unlink(filePath);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Baseline not found' } });
    }
  });
}
