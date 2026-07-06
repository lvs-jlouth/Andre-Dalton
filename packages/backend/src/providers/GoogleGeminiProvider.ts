import type { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, LlmCapabilities } from './types.js';
import { getEnv, getProviderApiKey } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('provider:gemini');

export class GoogleGeminiProvider implements LlmProvider {
  readonly id = 'gemini';
  readonly displayName = 'Google Gemini';
  readonly capabilities: LlmCapabilities = {
    chat: true,
    streaming: true,
    vision: true,
    tools: true,
  };

  private get apiKey(): string | undefined {
    return getProviderApiKey('gemini');
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) return { status: 'unconfigured', message: 'GOOGLE_GEMINI_API_KEY is not set' };
    const start = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${this.apiKey}`,
        { signal: AbortSignal.timeout(5000) },
      );
      const latencyMs = Date.now() - start;
      if (res.ok) return { status: 'ok', latencyMs };
      return { status: 'degraded', latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      log.error('Gemini health check failed', err);
      return { status: 'unavailable', message: 'Connection error' };
    }
  }

  async sendMessage(request: LlmRequest): Promise<LlmResponse> {
    if (!this.apiKey) throw new Error('Google Gemini API key not configured');
    const env = getEnv();
    const model = request.model ?? 'gemini-1.5-flash';

    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = { contents };
    if (request.systemPrompt) {
      body['systemInstruction'] = { parts: [{ text: request.systemPrompt }] };
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }>; role: string }; finishReason: string }>;
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
    };

    if (env.DEBUG_MODE) log.debug('Gemini response received');

    const candidate = data.candidates[0];
    return {
      id: `gemini-${Date.now()}`,
      content: candidate?.content?.parts?.[0]?.text ?? '',
      model,
      finishReason: candidate?.finishReason === 'STOP' ? 'stop' : 'error',
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }
}
