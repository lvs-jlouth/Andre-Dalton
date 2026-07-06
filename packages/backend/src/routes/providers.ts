import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAllProviders, getProvider, getProviderInfoList } from '../providers/index.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('route:providers');

export async function providerRoutes(app: FastifyInstance): Promise<void> {
  /** GET /providers — list all providers and their configuration status */
  app.get('/', async (_req, reply) => {
    const providers = getProviderInfoList();
    return reply.send({ providers });
  });

  /** POST /providers/test — run a health check on a specific provider */
  const testSchema = z.object({ providerId: z.string() });

  app.post('/test', async (req, reply) => {
    const parsed = testSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'providerId is required' });
    }

    const { providerId } = parsed.data;
    const provider = getProvider(providerId);
    if (!provider) {
      return reply.status(404).send({ error: `Provider "${providerId}" not found` });
    }

    try {
      const health = await provider.healthCheck();
      // Never expose credential info in the response
      return reply.send({ providerId, health });
    } catch (err) {
      log.error(`Health check error for ${providerId}`, err);
      return reply.status(500).send({ error: 'Health check failed' });
    }
  });
}
