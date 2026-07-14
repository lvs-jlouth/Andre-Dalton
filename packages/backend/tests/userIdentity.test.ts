import { describe, expect, it } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { getUserIdentityKey } from '../src/utils/userIdentity.js';

function makeRequest(headers: Record<string, string>): FastifyRequest {
  return { headers } as FastifyRequest;
}

function base64UrlEncode(json: object): string {
  return Buffer.from(JSON.stringify(json), 'utf-8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

describe('getUserIdentityKey', () => {
  it('prefers SWA principal id header', () => {
    const req = makeRequest({ 'x-ms-client-principal-id': 'user-123' });
    expect(getUserIdentityKey(req)).toBe('user-123');
  });

  it('extracts oid from bearer JWT when principal headers are absent', () => {
    const jwt = `${base64UrlEncode({ alg: 'none', typ: 'JWT' })}.${base64UrlEncode({ oid: 'oid-456', sub: 'sub-1' })}.`;
    const req = makeRequest({ authorization: `Bearer ${jwt}` });
    expect(getUserIdentityKey(req)).toBe('oid-456');
  });

  it('returns anonymous when no auth headers exist', () => {
    const req = makeRequest({});
    expect(getUserIdentityKey(req)).toBe('anonymous');
  });
});
