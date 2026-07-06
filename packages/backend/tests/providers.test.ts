import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAllProviders, getProvider, getProviderInfoList } from '../src/providers/index.js';

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
  it('registers all seven providers', () => {
    const providers = getAllProviders();
    const ids = providers.map((p) => p.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('gemini');
    expect(ids).toContain('azure');
    expect(ids).toContain('mistral');
    expect(ids).toContain('openrouter');
    expect(ids).toContain('ollama');
    expect(providers.length).toBe(7);
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
