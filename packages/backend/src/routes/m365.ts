import type { FastifyInstance } from 'fastify';
import { createLogger } from '../utils/logger.js';
import { getUserIdentityKey } from '../utils/userIdentity.js';
import { fetchM365Context } from '../services/graphContextService.js';

const log = createLogger('route:m365');

export async function m365Routes(app: FastifyInstance): Promise<void> {
  /**
   * GET /m365/context
   * Returns calendar + email context for the authenticated user.
   * Used by the frontend to optionally inject M365 awareness into JARGIIIN.
   */
  app.get('/context', async (req, reply) => {
    const delegatedToken = (req.headers['x-ms-token-aad-access-token'] as string) || null;
    const userKey = getUserIdentityKey(req);

    // Extract OID from userKey if it looks like a UUID (for client-credentials fallback)
    const oidMatch = userKey.match(/^[0-9a-f-]{36}$/i);
    const userObjectId = oidMatch ? userKey : null;

    log.info('M365 context requested', { hasToken: !!delegatedToken, hasOid: !!userObjectId });

    const ctx = await fetchM365Context(delegatedToken, userObjectId);

    if (!ctx) {
      return reply.status(200).send({
        available: false,
        reason: 'M365 context not configured or no permissions granted yet',
      });
    }

    return reply.send({ available: true, context: ctx });
  });

  /**
   * GET /m365/status
   * Returns whether M365 integration is configured on this server.
   */
  app.get('/status', async (_req, reply) => {
    const { getEnv } = await import('../utils/env.js');
    const env = getEnv();
    return reply.send({
      clientCredentials: !!(env.M365_TENANT_ID && env.M365_CLIENT_ID && env.M365_CLIENT_SECRET),
      blobStorage: !!env.AZURE_STORAGE_ACCOUNT_NAME,
      note: 'Client credentials require admin-consented Graph Application permissions. See docs/M365-SETUP.md',
    });
  });
}
