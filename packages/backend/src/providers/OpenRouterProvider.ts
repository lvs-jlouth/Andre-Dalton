import type { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, LlmCapabilities } from './types.js';
import { getEnv, getProviderApiKey } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('provider:openrouter');

export class OpenRouterProvider implements LlmProvider {
  readonly id = 'openrouter';
  readonly displayName = 'OpenRouter';
  readonly capabilities: LlmCapabilities = {
    chat: true,
    streaming: true,
    vision: true,
    tools: false,
  };

  private get apiKey(): string | undefined {
    return getProviderApiKey('openrouter');
  }

  private get baseUrl(): string {
    return getEnv().OPENROUTER_BASE_URL;
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) return { status: 'unconfigured', message: 'OPENROUTER_API_KEY is not set' };
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: 'Bearer ' + this.apiKey },
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { status: 'ok', latencyMs };
      return { status: 'degraded', latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      log.error('OpenRouter health check failed', err);
      return { status: 'unavailable', message: 'Connection error' };
    }
  }

  async sendMessage(request: LlmRequest): Promise<LlmResponse> {
    if (!this.apiKey) throw new Error('OpenRouter API key not configured');
    const env = getEnv();
    const model = request.model ?? 'openai/gpt-4o-mini';

    const messages = request.systemPrompt
      ? [{ role: 'system', content: request.systemPrompt }, ...request.messages]
      : request.messages;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.apiKey,
      },
      body: JSON.stringify({ model, messages, max_tokens: request.maxTokens ?? 1024 }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);

    const data = await res.json() as {
      id: string;
      model: string;
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    if (env.DEBUG_MODE) log.debug('OpenRouter response received');

    return {
      id: data.id,
      content: data.choices[0]?.message?.content ?? '',
      model: data.model,
      finishReason: (data.choices[0]?.finish_reason as LlmResponse['finishReason']) ?? 'stop',
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}
