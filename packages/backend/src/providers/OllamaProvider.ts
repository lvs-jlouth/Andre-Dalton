import type { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, LlmCapabilities } from './types.js';
import { getEnv } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('provider:ollama');

/**
 * Ollama-compatible local model endpoint.
 * No API key required — communicates with a local server (default: http://localhost:11434).
 */
export class OllamaProvider implements LlmProvider {
  readonly id = 'ollama';
  readonly displayName = 'Local (Ollama)';
  readonly capabilities: LlmCapabilities = {
    chat: true,
    streaming: false,
    vision: false,
    tools: false,
  };

  private get baseUrl(): string {
    return getEnv().LOCAL_LLM_BASE_URL;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { status: 'ok', latencyMs };
      return { status: 'degraded', latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      log.error('Ollama health check failed', err);
      return { status: 'unavailable', message: 'Cannot reach local Ollama server' };
    }
  }

  async sendMessage(request: LlmRequest): Promise<LlmResponse> {
    const env = getEnv();
    const model = request.model ?? 'llama3';

    const prompt = [
      ...(request.systemPrompt ? [`System: ${request.systemPrompt}`] : []),
      ...request.messages.map((m) => `${m.role}: ${m.content}`),
    ].join('\n');

    const body = { model, prompt, stream: false };

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);

    const data = await res.json() as {
      model: string;
      response: string;
      done: boolean;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    if (env.DEBUG_MODE) log.debug('Ollama response received');

    return {
      id: `ollama-${Date.now()}`,
      content: data.response,
      model: data.model,
      finishReason: 'stop',
      usage: data.prompt_eval_count !== undefined
        ? {
            promptTokens: data.prompt_eval_count,
            completionTokens: data.eval_count ?? 0,
            totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
          }
        : undefined,
    };
  }
}
