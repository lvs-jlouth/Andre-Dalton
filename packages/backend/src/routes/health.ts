import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      service: 'AURORA backend',
      timestamp: new Date().toISOString(),
    });
  });
}
