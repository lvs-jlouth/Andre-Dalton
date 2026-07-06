/**
 * Redaction utilities.
 *
 * These functions scrub API keys, transcripts, prompts, and personal data
 * from strings before they reach logs or error messages.
 *
 * Design note: redaction must be cheap, side-effect free, and conservative —
 * it is better to over-redact than to leak a credential.
 */

/** Patterns that identify sensitive values that must never appear in logs. */
const REDACT_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Generic ****** API key headers
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replacement: '******' },

  // OpenAI / Anthropic style keys  (sk-… or sk-ant-… or sk-proj-…)
  { pattern: /\bsk-[A-Za-z0-9_-]{10,}/g, replacement: '[REDACTED_API_KEY]' },

  // Google / Gemini keys  (AIza…)
  { pattern: /\bAIza[A-Za-z0-9_-]{20,}/g, replacement: '[REDACTED_API_KEY]' },

  // Azure SAS tokens / connection strings
  { pattern: /AccountKey=[A-Za-z0-9+/=]{20,}/g, replacement: 'AccountKey=[REDACTED]' },

  // Generic long alphanumeric secrets (≥32 chars, looks like a token/key)
  { pattern: /\b[A-Za-z0-9_-]{40,}\b/g, replacement: '[REDACTED_TOKEN]' },

  // Email addresses
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },

  // IPv4 addresses (may appear in private network configs)
  {
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    replacement: '[REDACTED_IP]',
  },
];

/**
 * Scrubs a string of all known sensitive patterns.
 * Safe to call on log messages, error strings, or any user-originated text.
 */
export function redactSensitive(input: string): string {
  let result = input;
  for (const { pattern, replacement } of REDACT_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Redacts all values in an object that match a set of sensitive key names.
 * Useful for sanitising request bodies before logging.
 */
export function redactObject(
  obj: Record<string, unknown>,
  sensitiveKeys: string[] = ['apiKey', 'api_key', 'key', 'token', 'secret', 'password', 'credential'],
): Record<string, unknown> {
  const lower = sensitiveKeys.map((k) => k.toLowerCase());
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (lower.includes(k.toLowerCase())) {
      result[k] = '[REDACTED]';
    } else if (typeof v === 'string') {
      result[k] = redactSensitive(v);
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = redactObject(v as Record<string, unknown>, sensitiveKeys);
    } else {
      result[k] = v;
    }
  }
  return result;
}
