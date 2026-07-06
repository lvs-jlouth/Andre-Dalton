import type { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, LlmCapabilities } from './types.js';
import { getEnv, getProviderApiKey } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('provider:openai');

export class OpenAIProvider implements LlmProvider {
  readonly id = 'openai';
  readonly displayName = 'OpenAI';
  readonly capabilities: LlmCapabilities = {
    chat: true,
    streaming: true,
    vision: true,
    tools: true,
  };

  private get apiKey(): string | undefined {
    return getProviderApiKey('openai');
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { status: 'unconfigured', message: 'OPENAI_API_KEY is not set' };
    }
    const start = Date.now();
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `****** },
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { status: 'ok', latencyMs };
      return { status: 'degraded', latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      log.error('OpenAI health check failed', err);
      return { status: 'unavailable', message: 'Connection error' };
    }
  }

  async sendMessage(request: LlmRequest): Promise<LlmResponse> {
    if (!this.apiKey) throw new Error('OpenAI API key not configured');
    const env = getEnv();
    const model = request.model ?? 'gpt-4o-mini';

    const messages = request.systemPrompt
      ? [{ role: 'system', content: request.systemPrompt }, ...request.messages]
      : request.messages;

    const body = {
      model,
      messages,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `******,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status}`);
    }

    const data = await res.json() as {
      id: string;
      model: string;
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    if (env.DEBUG_MODE) {
      log.debug('OpenAI response received');
    }

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
