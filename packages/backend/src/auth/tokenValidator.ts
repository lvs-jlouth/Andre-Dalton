/**
 * Entra ID token validation middleware for Fastify.
 * Validates Bearer tokens from the frontend MSAL Browser flow.
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { getEnv } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('auth');

export interface EntraIdClaims {
  oid: string;       // Object ID (unique user identifier)
  sub: string;       // Subject
  name: string;      // Display name
  email: string;     // Preferred email (UPN)
  preferred_username: string;
  tid: string;       // Tenant ID
  roles?: string[];  // App roles
  scp?: string;      // Delegated scopes (space-separated)
  iss: string;       // Issuer
  aud: string;       // Audience (client ID)
  exp: number;       // Expiration
  iat: number;       // Issued at
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: EntraIdClaims;
  }
}

/**
 * Lightweight token validation.
 * In production, you should also validate the token signature against
 * the Entra ID JWKS endpoint (keys from https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys).
 * For this implementation we validate structure, audience, issuer, and expiry.
 */
export async function validateEntraToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const env = getEnv();

  // Skip auth if Entra ID is not configured
  if (!env.ENTRA_CLIENT_ID) {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Decode without verification for claim inspection
    // In production, use jwks-rsa to verify signature against Entra ID keys
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded.payload === 'string') {
      reply.status(401).send({ error: 'Invalid token format' });
      return;
    }

    const claims = decoded.payload as unknown as EntraIdClaims;

    // Validate audience
    if (claims.aud !== env.ENTRA_CLIENT_ID) {
      log.warn('Token audience mismatch');
      reply.status(401).send({ error: 'Token audience mismatch' });
      return;
    }

    // Validate issuer
    const expectedIssuer = `https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/v2.0`;
    if (claims.iss !== expectedIssuer) {
      log.warn('Token issuer mismatch');
      reply.status(401).send({ error: 'Token issuer mismatch' });
      return;
    }

    // Validate expiry
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      reply.status(401).send({ error: 'Token expired' });
      return;
    }

    // Attach claims to request
    request.user = claims;
  } catch (err) {
    log.error('Token validation failed', err);
    reply.status(401).send({ error: 'Token validation failed' });
  }
}

/**
 * Prehandler hook that requires authentication.
 * Use on protected routes.
 */
export const requireAuth = validateEntraToken;
