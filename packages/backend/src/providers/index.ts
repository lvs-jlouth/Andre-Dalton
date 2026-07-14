import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { GoogleGeminiProvider } from './GoogleGeminiProvider.js';
import { AzureOpenAIProvider } from './AzureOpenAIProvider.js';
import { MistralProvider } from './MistralProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import type { LlmProvider, ProviderInfo } from './types.js';
import { getEnv, getProviderApiKey } from '../utils/env.js';

export type { LlmProvider, ProviderInfo };
export * from './types.js';

/** All registered providers. Add new adapters here. */
const PROVIDERS: LlmProvider[] = [
  new OpenAIProvider(),
  new AnthropicProvider(),
  new GoogleGeminiProvider(),
  new AzureOpenAIProvider(),
  new MistralProvider(),
  new OpenRouterProvider(),
  new OllamaProvider(),
];

const providerMap = new Map<string, LlmProvider>(PROVIDERS.map((p) => [p.id, p]));

export function getAllProviders(): LlmProvider[] {
  return PROVIDERS;
}

export function getProvider(id: string): LlmProvider | undefined {
  return providerMap.get(id);
}

export function getDefaultProvider(): LlmProvider {
  const defaultId = getEnv().DEFAULT_PROVIDER;
  const provider = getProvider(defaultId);
  if (!provider || !isProviderConfigured(defaultId, getEnv())) {
    // Prefer Foundry/Azure first, then direct OpenAI when defaults are unavailable.
    const fallback = ['azure', 'openai']
      .map((id) => getProvider(id))
      .find((p) => p && isProviderConfigured(p.id, getEnv()));
    if (fallback) return fallback;
    throw new Error(`Default provider "${defaultId}" is unavailable or unconfigured. Check DEFAULT_PROVIDER and API settings.`);
  }
  return provider;
}

/** Returns safe summary list for GET /providers — never includes keys. */
export function getProviderInfoList(): ProviderInfo[] {
  const env = getEnv();
  return PROVIDERS.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    capabilities: p.capabilities,
    configured: isProviderConfigured(p.id, env),
  }));
}

function isProviderConfigured(id: string, env: ReturnType<typeof getEnv>): boolean {
  if (id === 'ollama') return true; // local, always available attempt
  const key = getProviderApiKey(id);
  if (id === 'azure') return !!(key && env.AZURE_OPENAI_ENDPOINT);
  return !!key;
}

export function isProviderAvailable(id: string): boolean {
  return isProviderConfigured(id, getEnv());
}
