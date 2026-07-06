import type { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, LlmCapabilities } from './types.js';
import { getEnv, getProviderApiKey } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('provider:azure');

export class AzureOpenAIProvider implements LlmProvider {
  readonly id = 'azure';
  readonly displayName = 'Azure OpenAI';
  readonly capabilities: LlmCapabilities = {
    chat: true,
    streaming: true,
    vision: true,
    tools: true,
  };

  private get apiKey(): string | undefined {
    return getProviderApiKey('azure');
  }

  private get endpoint(): string | undefined {
    return getEnv().AZURE_OPENAI_ENDPOINT;
  }

  private get deployment(): string {
    return getEnv().AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini';
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey || !this.endpoint) {
      return { status: 'unconfigured', message: 'AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT must be set' };
    }
    const start = Date.now();
    try {
      const url = `${this.endpoint}/openai/deployments?api-version=2024-02-01`;
      const res = await fetch(url, {
        headers: { 'api-key': this.apiKey },
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { status: 'ok', latencyMs };
      return { status: 'degraded', latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      log.error('Azure OpenAI health check failed', err);
      return { status: 'unavailable', message: 'Connection error' };
    }
  }

  async sendMessage(request: LlmRequest): Promise<LlmResponse> {
    if (!this.apiKey || !this.endpoint) throw new Error('Azure OpenAI credentials not configured');
    const env = getEnv();

    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=2024-02-01`;

    const messages = request.systemPrompt
      ? [{ role: 'system', content: request.systemPrompt }, ...request.messages]
      : request.messages;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey },
      body: JSON.stringify({ messages, max_tokens: request.maxTokens ?? 1024 }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Azure OpenAI API error: ${res.status}`);

    const data = await res.json() as {
      id: string;
      model: string;
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    if (env.DEBUG_MODE) log.debug('Azure OpenAI response received');

    return {
      id: data.id,
      content: data.choices[0]?.message?.content ?? '',
      model: data.model ?? this.deployment,
      finishReason: (data.choices[0]?.finish_reason as LlmResponse['finishReason']) ?? 'stop',
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}
