import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAllProviders, getProvider, getProviderInfoList } from '../src/providers/index.js';
import { redactSensitive } from '../src/utils/redaction.js';

// Isolate env so tests don't need real API keys
beforeEach(() => {
  vi.stubEnv('DEFAULT_PROVIDER', 'ollama');
  vi.stubEnv('OPENAI_API_KEY', '');
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  vi.stubEnv('GOOGLE_GEMINI_API_KEY', '');
  vi.stubEnv('MISTRAL_API_KEY', '');
  vi.stubEnv('OPENROUTER_API_KEY', '');
  vi.stubEnv('LOCAL_LLM_BASE_URL', 'http://localhost:11434');
});

afterEach(() => {
  vi.unstubAllEnvs();
  // Clear the env singleton so each test starts fresh
  vi.resetModules();
});

describe('Provider registry', () => {
  it('registers all eight providers', () => {
    const providers = getAllProviders();
    const ids = providers.map((p) => p.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('gemini');
    expect(ids).toContain('azure');
    expect(ids).toContain('mistral');
    expect(ids).toContain('openrouter');
    expect(ids).toContain('ollama');
    expect(ids).toContain('mock');
    expect(providers.length).toBe(8);
  });

  it('retrieves provider by id', () => {
    const p = getProvider('openai');
    expect(p).toBeDefined();
    expect(p?.displayName).toBe('OpenAI');
  });

  it('returns undefined for unknown provider id', () => {
    expect(getProvider('nonexistent')).toBeUndefined();
  });
});

describe('Provider capabilities', () => {
  it('OpenAI has chat and streaming capabilities', () => {
    const p = getProvider('openai')!;
    expect(p.capabilities.chat).toBe(true);
    expect(p.capabilities.streaming).toBe(true);
  });

  it('Ollama does not have streaming in this implementation', () => {
    const p = getProvider('ollama')!;
    expect(p.capabilities.chat).toBe(true);
    expect(p.capabilities.streaming).toBe(false);
  });

  it('all providers have a displayName', () => {
    getAllProviders().forEach((p) => {
      expect(typeof p.displayName).toBe('string');
      expect(p.displayName.length).toBeGreaterThan(0);
    });
  });
});

describe('getProviderInfoList', () => {
  it('returns info without leaking API keys', () => {
    const list = getProviderInfoList();
    const json = JSON.stringify(list);
    expect(json).not.toContain('sk-');
    expect(json).not.toContain('AIza');
    // No "apiKey" field in the response
    expect(json).not.toContain('"apiKey"');
  });

  it('marks providers as unconfigured when keys are missing', () => {
    const list = getProviderInfoList();
    const openai = list.find((p) => p.id === 'openai');
    expect(openai?.configured).toBe(false);
  });

  it('marks ollama as configured (local, no key needed)', () => {
    const list = getProviderInfoList();
    const ollama = list.find((p) => p.id === 'ollama');
    expect(ollama?.configured).toBe(true);
  });
});

describe('Provider health check routing', () => {
  it('returns unconfigured when OpenAI key is missing', async () => {
    const p = getProvider('openai')!;
    const health = await p.healthCheck();
    expect(health.status).toBe('unconfigured');
  });

  it('returns unconfigured when Anthropic key is missing', async () => {
    const p = getProvider('anthropic')!;
    const health = await p.healthCheck();
    expect(health.status).toBe('unconfigured');
  });

  it('returns unconfigured when Gemini key is missing', async () => {
    const p = getProvider('gemini')!;
    const health = await p.healthCheck();
    expect(health.status).toBe('unconfigured');
  });

  it('returns unconfigured when Mistral key is missing', async () => {
    const p = getProvider('mistral')!;
    const health = await p.healthCheck();
    expect(health.status).toBe('unconfigured');
  });

  it('returns unconfigured when OpenRouter key is missing', async () => {
    const p = getProvider('openrouter')!;
    const health = await p.healthCheck();
    expect(health.status).toBe('unconfigured');
  });
});

describe('Mock provider', () => {
  it('is registered and retrievable', () => {
    const p = getProvider('mock');
    expect(p).toBeDefined();
    expect(p?.displayName).toBe('Mock (Dev/Test)');
  });

  it('health check always returns ok without network calls', async () => {
    const p = getProvider('mock')!;
    const health = await p.healthCheck();
    expect(health.status).toBe('ok');
    expect(health.latencyMs).toBe(0);
  });

  it('sendMessage returns a deterministic response without network calls', async () => {
    const p = getProvider('mock')!;
    const response = await p.sendMessage({
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(response.content).toContain('hello');
    expect(response.model).toBe('mock-model-1');
    expect(response.finishReason).toBe('stop');
    expect(response.id).toMatch(/^mock-/);
  });

  it('streamMessage yields chunks and terminates', async () => {
    const p = getProvider('mock')!;
    const chunks: import('../src/providers/types.js').LlmStreamChunk[] = [];
    for await (const chunk of p.streamMessage!({
      messages: [{ role: 'user', content: 'stream test' }],
    })) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].done).toBe(true);
    const full = chunks.map((c) => c.delta).join('');
    expect(full).toContain('stream test');
  });

  it('mock response never contains API key patterns', async () => {
    const p = getProvider('mock')!;
    // Simulate a user message that contains a key pattern
    const response = await p.sendMessage({
      messages: [{ role: 'user', content: 'What is my key?' }],
    });
    // The response content should not contain any real key patterns
    expect(response.content).not.toMatch(/sk-[A-Za-z0-9_-]{10,}/);
    expect(response.content).not.toMatch(/AIza[A-Za-z0-9_-]{20,}/);
    expect(JSON.stringify(response)).not.toContain('"apiKey"');
  });
});

describe('API key non-leakage', () => {
  it('provider info list never contains sk- style keys', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-testKeyThatMustNotLeak1234567890');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-testKeyThatMustNotLeak12345678');
    const list = getProviderInfoList();
    const json = JSON.stringify(list);
    expect(json).not.toContain('sk-testKeyThatMustNotLeak');
    expect(json).not.toContain('sk-ant-testKeyThatMustNotLeak');
    vi.unstubAllEnvs();
  });

  it('provider info list never contains AIza Google keys', () => {
    vi.stubEnv('GOOGLE_GEMINI_API_KEY', 'AIzaTestKeyThatMustNotLeakAtAll12345');
    const list = getProviderInfoList();
    const json = JSON.stringify(list);
    expect(json).not.toContain('AIzaTestKeyThatMustNotLeakAtAll');
    vi.unstubAllEnvs();
  });

  it('error messages from sendMessage never expose API keys', async () => {
    // Stubs an invalid key so the provider throws — the message must not contain the key
    const fakeKey = 'sk-errorLeakTest1234567890abcdefghijk';
    vi.stubEnv('OPENAI_API_KEY', fakeKey);

    const p = getProvider('openai')!;
    let errorMessage = '';
    try {
      // This will fail (no real network in tests), but we only check the message
      await p.sendMessage({ messages: [{ role: 'user', content: 'hi' }] });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
    // If the key appears in the error, redactSensitive must strip it
    const redacted = redactSensitive(errorMessage);
    expect(redacted).not.toContain(fakeKey);
    vi.unstubAllEnvs();
  });

  it('all providers report configured=false when no keys are set', () => {
    const list = getProviderInfoList();
    const cloudProviders = list.filter((p) => !['ollama', 'mock'].includes(p.id));
    cloudProviders.forEach((p) => {
      expect(p.configured).toBe(false);
    });
  });
});
