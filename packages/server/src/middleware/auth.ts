import type { FastifyInstance } from 'fastify';

const PUBLIC_PATHS = ['/api/v1/health', '/api/v1/screenshots/', '/api/v1/baselines/'];

export function registerAuthHook(app: FastifyInstance) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    app.log.warn('API_KEY environment variable is not set. All API endpoints are unprotected.');
    return;
  }

  app.addHook('onRequest', async (request, reply) => {
    // Skip public paths (exact match or prefix match)
    if (PUBLIC_PATHS.some((path) => request.url === path || request.url.startsWith(path))) {
      return;
    }

    const providedKey = request.headers['x-api-key'];

    if (!providedKey || providedKey !== apiKey) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing API Key. Please provide a valid X-API-Key header.',
        },
      });
      return;
    }
  });
}
