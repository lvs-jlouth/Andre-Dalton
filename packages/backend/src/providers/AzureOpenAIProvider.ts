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
    const endpoint = getEnv().AZURE_OPENAI_ENDPOINT;
    return endpoint ? endpoint.replace(/\/+$/, '') : undefined;
  }

  private resolveDeployment(model?: string): string {
    const env = getEnv();
    const modelId = (model ?? '').trim().toLowerCase();
    if (modelId === 'gpt-5.5') return env.AZURE_OPENAI_DEPLOYMENT_GPT_5_5 ?? 'gpt-5.5';
    if (modelId === 'gpt-5-mini') return env.AZURE_OPENAI_DEPLOYMENT_GPT_5_MINI ?? env.AZURE_OPENAI_DEPLOYMENT ?? 'jargiin-primary';
    if (modelId === 'gpt-5-nano') return env.AZURE_OPENAI_DEPLOYMENT_GPT_5_NANO ?? 'gpt-5-nano';
    return env.AZURE_OPENAI_DEPLOYMENT ?? 'jargiin-primary';
  }

  private get apiVersion(): string {
    return getEnv().AZURE_OPENAI_API_VERSION ?? '2025-04-01-preview';
  }

  private chatUrl(deployment: string): string {
    return `${this.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${this.apiVersion}`;
  }

  private async sendChatWithTokenParam(
    messages: Array<{ role: string; content: string }>,
    tokenParam: 'max_completion_tokens' | 'max_tokens',
    maxTokens: number,
    deployment: string,
  ): Promise<Response> {
    return fetch(this.chatUrl(deployment), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey! },
      body: JSON.stringify({ messages, [tokenParam]: maxTokens }),
      signal: AbortSignal.timeout(30000),
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey || !this.endpoint) {
      return { status: 'unconfigured', message: 'AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT must be set' };
    }
    const start = Date.now();
    try {
      const messages = [{ role: 'user', content: 'health check' }];
      const deployment = this.resolveDeployment('gpt-5-mini');
      let res = await this.sendChatWithTokenParam(messages, 'max_completion_tokens', 8, deployment);
      if (!res.ok && res.status === 400) {
        res = await this.sendChatWithTokenParam(messages, 'max_tokens', 8, deployment);
      }
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

    const messages = request.systemPrompt
      ? [{ role: 'system', content: request.systemPrompt }, ...request.messages]
      : request.messages;
    const deployment = this.resolveDeployment(request.model);

    let res = await this.sendChatWithTokenParam(messages, 'max_completion_tokens', request.maxTokens ?? 1024, deployment);
    if (!res.ok && res.status === 400) {
      res = await this.sendChatWithTokenParam(messages, 'max_tokens', request.maxTokens ?? 1024, deployment);
    }

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
      model: request.model ?? data.model ?? deployment,
      finishReason: (data.choices[0]?.finish_reason as LlmResponse['finishReason']) ?? 'stop',
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}
