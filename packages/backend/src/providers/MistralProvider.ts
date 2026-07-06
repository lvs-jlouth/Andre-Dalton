import type { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, LlmCapabilities } from './types.js';
import { getEnv, getProviderApiKey } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('provider:mistral');

export class MistralProvider implements LlmProvider {
  readonly id = 'mistral';
  readonly displayName = 'Mistral AI';
  readonly capabilities: LlmCapabilities = {
    chat: true,
    streaming: true,
    vision: false,
    tools: true,
  };

  private get apiKey(): string | undefined {
    return getProviderApiKey('mistral');
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) return { status: 'unconfigured', message: 'MISTRAL_API_KEY is not set' };
    const start = Date.now();
    try {
      const res = await fetch('https://api.mistral.ai/v1/models', {
        headers: { Authorization: `****** },
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { status: 'ok', latencyMs };
      return { status: 'degraded', latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      log.error('Mistral health check failed', err);
      return { status: 'unavailable', message: 'Connection error' };
    }
  }

  async sendMessage(request: LlmRequest): Promise<LlmResponse> {
    if (!this.apiKey) throw new Error('Mistral API key not configured');
    const env = getEnv();
    const model = request.model ?? 'mistral-small-latest';

    const messages = request.systemPrompt
      ? [{ role: 'system', content: request.systemPrompt }, ...request.messages]
      : request.messages;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `******,
      },
      body: JSON.stringify({ model, messages, max_tokens: request.maxTokens ?? 1024 }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Mistral API error: ${res.status}`);

    const data = await res.json() as {
      id: string;
      model: string;
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    if (env.DEBUG_MODE) log.debug('Mistral response received');

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
