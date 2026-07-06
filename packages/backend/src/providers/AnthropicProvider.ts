import type { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, LlmCapabilities } from './types.js';
import { getEnv, getProviderApiKey } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('provider:anthropic');

export class AnthropicProvider implements LlmProvider {
  readonly id = 'anthropic';
  readonly displayName = 'Anthropic Claude';
  readonly capabilities: LlmCapabilities = {
    chat: true,
    streaming: true,
    vision: true,
    tools: true,
  };

  private get apiKey(): string | undefined {
    return getProviderApiKey('anthropic');
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { status: 'unconfigured', message: 'ANTHROPIC_API_KEY is not set' };
    }
    const start = Date.now();
    try {
      // Anthropic has no dedicated health endpoint; use a minimal completion
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok || res.status === 400) return { status: 'ok', latencyMs };
      return { status: 'degraded', latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      log.error('Anthropic health check failed', err);
      return { status: 'unavailable', message: 'Connection error' };
    }
  }

  async sendMessage(request: LlmRequest): Promise<LlmResponse> {
    if (!this.apiKey) throw new Error('Anthropic API key not configured');
    const env = getEnv();
    const model = request.model ?? 'claude-3-haiku-20240307';

    const body: Record<string, unknown> = {
      model,
      max_tokens: request.maxTokens ?? 1024,
      messages: request.messages,
    };
    if (request.systemPrompt) body['system'] = request.systemPrompt;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);

    const data = await res.json() as {
      id: string;
      model: string;
      content: Array<{ text: string }>;
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    if (env.DEBUG_MODE) log.debug('Anthropic response received');

    return {
      id: data.id,
      content: data.content[0]?.text ?? '',
      model: data.model,
      finishReason: (data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason) as LlmResponse['finishReason'],
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }
}
