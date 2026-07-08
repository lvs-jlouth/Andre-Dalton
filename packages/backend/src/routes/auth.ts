/**
 * Auth routes — handles token exchange and user profile endpoints.
 */
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/tokenValidator.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /auth/me — returns the authenticated user's profile from the token.
   */
  app.get('/me', { preHandler: requireAuth }, async (request) => {
    const user = request.user!;
    return {
      id: user.oid,
      name: user.name,
      email: user.preferred_username || user.email,
      tenantId: user.tid,
      roles: user.roles ?? [],
    };
  });

  /**
   * GET /auth/status — check if Entra ID is configured.
   * Public endpoint (no auth required).
   */
  app.get('/status', async () => {
    const { getEnv } = await import('../utils/env.js');
    const env = getEnv();
    return {
      entraConfigured: !!(env.ENTRA_CLIENT_ID && env.ENTRA_TENANT_ID),
      provider: 'Microsoft Entra ID',
    };
  });
}
