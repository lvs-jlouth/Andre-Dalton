import type { FastifyRequest } from 'fastify';

interface ClientPrincipalClaim {
  typ?: string;
  val?: string;
}

interface ClientPrincipalPayload {
  userId?: string;
  userDetails?: string;
  claims?: ClientPrincipalClaim[];
}

interface JwtPayload {
  oid?: string;
  sub?: string;
  upn?: string;
  preferred_username?: string;
}

function decodeBase64Json<T>(value: string): T | null {
  try {
    const json = Buffer.from(value, 'base64').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function decodeBase64UrlJson<T>(value: string): T | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function getBearerToken(authValue: string): string | null {
  const match = authValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function getIdentityFromJwt(token: string): string | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = decodeBase64UrlJson<JwtPayload>(parts[1]);
  if (!payload) return null;
  if (payload.oid) return payload.oid;
  if (payload.sub) return payload.sub;
  if (payload.upn) return payload.upn;
  if (payload.preferred_username) return payload.preferred_username;
  return null;
}

export function getUserIdentityKey(req: FastifyRequest): string {
  const principalIdHeader = req.headers['x-ms-client-principal-id'];
  const principalId = Array.isArray(principalIdHeader) ? principalIdHeader[0] : principalIdHeader;
  if (typeof principalId === 'string' && principalId.length > 0) {
    return principalId;
  }

  const principalHeader = req.headers['x-ms-client-principal'];
  const headerValue = Array.isArray(principalHeader) ? principalHeader[0] : principalHeader;
  if (typeof headerValue === 'string' && headerValue.length > 0) {
    const payload = decodeBase64Json<ClientPrincipalPayload>(headerValue);
    if (payload?.userId) return payload.userId;
    if (payload?.userDetails) return payload.userDetails;
    const claimOid = payload?.claims?.find((c) => c?.typ === 'http://schemas.microsoft.com/identity/claims/objectidentifier')?.val;
    if (claimOid) return claimOid;
  }

  const authHeader = req.headers.authorization;
  const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (typeof authValue === 'string' && authValue.length > 0) {
    const token = getBearerToken(authValue);
    if (token) {
      const jwtIdentity = getIdentityFromJwt(token);
      if (jwtIdentity) return jwtIdentity;
    }
    return authValue;
  }

  return 'anonymous';
}
