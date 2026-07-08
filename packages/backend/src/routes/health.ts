import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      service: 'J.A.R.G.I.I.N. backend',
      timestamp: new Date().toISOString(),
    });
  });
}
