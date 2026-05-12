import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { ZodError } from 'zod';

// Load .env from project root (monorepo root is two levels up from packages/server)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
import { projectRoutes } from './routes/projects.js';
import { testCaseRoutes } from './routes/test-cases.js';
import { testSuiteRoutes } from './routes/suites.js';
import { runRoutes } from './routes/runs.js';
import { datasetRoutes } from './routes/datasets.js';
import { aiModelRoutes } from './routes/ai-models.js';
import { aiProviderConfigRoutes } from './routes/ai-provider-configs.js';
import { aiEndpointRoutes } from './routes/ai-endpoints.js';
import { aiGenerationRoutes } from './routes/ai-generation.js';
import { baselineRoutes } from './routes/baselines.js';
import { registerAuthHook } from './middleware/auth.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // CORS
  await app.register(cors, { origin: true });

  // Auth hook (skips /health)
  registerAuthHook(app);

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.errors,
        },
      });
    }

    const statusCode = (error as any).statusCode || 500;
    app.log.error(error);
    return reply.status(statusCode).send({
      error: {
        code: (error as any).code || 'INTERNAL_ERROR',
        message: (error as Error).message || 'Internal server error',
      },
    });
  });

  // Health check
  app.get('/api/v1/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // Screenshot static file serving
  const screenshotBaseDir = join(tmpdir(), 'ai-tester-screenshots');
  if (!existsSync(screenshotBaseDir)) {
    mkdirSync(screenshotBaseDir, { recursive: true });
  }
  await app.register(staticPlugin, {
    root: screenshotBaseDir,
    prefix: '/api/v1/screenshots/',
    decorateReply: false,
  });

  // Register routes
  await app.register(projectRoutes);
  await app.register(testCaseRoutes);
  await app.register(testSuiteRoutes);
  await app.register(runRoutes);
  await app.register(datasetRoutes);
  await app.register(aiModelRoutes);
  await app.register(aiProviderConfigRoutes);
  await app.register(aiEndpointRoutes);
  await app.register(aiGenerationRoutes);
  await app.register(baselineRoutes);

  // Baseline static file serving (project root, same as where baseline routes write)
  const baselineBaseDir = path.join(__dirname, '../../../.ai-tester-baselines');
  if (!existsSync(baselineBaseDir)) {
    mkdirSync(baselineBaseDir, { recursive: true });
  }
  await app.register(staticPlugin, {
    root: baselineBaseDir,
    prefix: '/api/v1/baselines/',
    decorateReply: false,
  });

  return app;
}

// Start server if run directly
const port = parseInt(process.env.PORT || '3100');
const host = process.env.HOST || '0.0.0.0';

buildApp().then((app) => {
  app.listen({ port, host }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`AI-Tester server listening on ${address}`);
  });
});
