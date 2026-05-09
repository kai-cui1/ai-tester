import type { FastifyInstance } from 'fastify';

const PUBLIC_PATHS = ['/api/v1/health'];

export function registerAuthHook(app: FastifyInstance) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    app.log.warn('API_KEY environment variable is not set. All API endpoints are unprotected.');
    return;
  }

  app.addHook('onRequest', async (request, reply) => {
    // Skip public paths
    if (PUBLIC_PATHS.includes(request.url)) {
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
