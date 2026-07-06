import { describe, it, expect } from 'vitest';
import { redactSensitive, redactObject } from '../src/utils/redaction.js';

describe('redactSensitive', () => {
  it('redacts ******', () => {
    const input = 'Authorization: ******';
    const result = redactSensitive(input);
    expect(result).not.toContain('sk-abc123defghijklmnop');
    expect(result).toContain('******');
  });

  it('redacts OpenAI-style sk- keys', () => {
    const input = 'Using key sk-proj-abcdefghijklmnopqrstuvwxyz1234';
    const result = redactSensitive(input);
    expect(result).not.toContain('sk-proj-abcdefghijklmnopqrstuvwxyz1234');
    expect(result).toContain('[REDACTED_API_KEY]');
  });

  it('redacts Google AIza keys', () => {
    const input = 'key=AIzaSyD-9tSrke72I6e123456789abcdefghijklmno';
    const result = redactSensitive(input);
    expect(result).not.toContain('AIzaSyD-9tSrke72I6e123456789abcdefghijklmno');
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
    const obj = { apiKey: 'secret-key-123', message: 'hello', token: 'tok_abc' };
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
    const obj = { message: 'token sk-abc123defghijklmnop is invalid' };
    const result = redactObject(obj);
    expect((result['message'] as string)).not.toContain('sk-abc123defghijklmnop');
  });

  it('handles empty object', () => {
    expect(redactObject({})).toEqual({});
  });
});
