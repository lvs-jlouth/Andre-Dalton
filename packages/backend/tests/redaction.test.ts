import { describe, it, expect } from 'vitest';
import { redactSensitive, redactObject } from '../src/utils/redaction.js';

// Helpers that build test strings without embedding real-looking secrets
// directly in literals (avoids false-positive secret-scanner hits).
function makeBearerInput(key: string) {
  return 'Authorization: Bearer ' + key;
}

function makeSkKeyInput(prefix: string, suffix: string) {
  return 'Using key ' + prefix + suffix;
}

describe('redactSensitive', () => {
  it('redacts a ******', () => {
    const input = makeBearerInput('abcdefghijklmnopqrstuvwxyz123456');
    const result = redactSensitive(input);
    expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
  });

  it('redacts OpenAI-style sk- keys (plain suffix)', () => {
    const input = makeSkKeyInput('sk-', 'abcdefghijklmnopqrstuvwxyz1234');
    const result = redactSensitive(input);
    expect(result).not.toContain('sk-abcdefghijklmnopqrstuvwxyz1234');
    expect(result).toContain('[REDACTED_API_KEY]');
  });

  it('redacts OpenAI sk-proj- style keys (hyphen in prefix segment)', () => {
    const input = makeSkKeyInput('sk-proj-', 'abcdefghijklmnopqrstuvwxyz1234');
    const result = redactSensitive(input);
    expect(result).not.toContain('sk-proj-abcdefghijklmnopqrstuvwxyz1234');
    expect(result).toContain('[REDACTED_API_KEY]');
  });

  it('redacts Anthropic sk-ant- style keys', () => {
    const input = makeSkKeyInput('sk-ant-api03-', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef');
    const result = redactSensitive(input);
    expect(result).not.toContain('sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef');
    expect(result).toContain('[REDACTED_API_KEY]');
  });

  it('redacts Google AIza keys', () => {
    const key = 'AIzaSyD-9tSrke72I6eABCDEFGHIJKLMNOPQRST';
    const result = redactSensitive('key=' + key);
    expect(result).not.toContain(key);
  });

  it('redacts email addresses', () => {
    const result = redactSensitive('Contact: user@example.com for help');
    expect(result).not.toContain('user@example.com');
    expect(result).toContain('[REDACTED_EMAIL]');
  });

  it('redacts private IPv4 addresses', () => {
    const result = redactSensitive('Server at 192.168.1.42 is down');
    expect(result).not.toContain('192.168.1.42');
    expect(result).toContain('[REDACTED_IP]');
  });

  it('returns plain text unchanged when no sensitive data present', () => {
    const plain = 'Hello, AURORA is ready.';
    expect(redactSensitive(plain)).toBe(plain);
  });

  it('handles empty string', () => {
    expect(redactSensitive('')).toBe('');
  });
});

describe('redactObject', () => {
  it('redacts keys named apiKey, token, password', () => {
    const obj = {
      apiKey: 'plainvalue-not-a-real-key',
      message: 'hello',
      token: 'tok_abc',
    };
    const result = redactObject(obj);
    expect(result['apiKey']).toBe('[REDACTED]');
    expect(result['token']).toBe('[REDACTED]');
    expect(result['message']).toBe('hello');
  });

  it('recursively redacts nested objects', () => {
    const obj = { credentials: { password: 'super-secret', username: 'admin' } };
    const result = redactObject(obj);
    const creds = result['credentials'] as Record<string, unknown>;
    expect(creds['password']).toBe('[REDACTED]');
    expect(creds['username']).toBe('admin');
  });

  it('applies string-level redaction to non-sensitive keys', () => {
    const obj = { message: 'key ' + makeSkKeyInput('sk-', 'abcdefghijklmnopqrstuvwxyz1234') + ' is invalid' };
    const result = redactObject(obj);
    expect((result['message'] as string)).not.toContain('sk-abcdefghijklmnopqrstuvwxyz1234');
  });

  it('handles empty object', () => {
    expect(redactObject({})).toEqual({});
  });
});
