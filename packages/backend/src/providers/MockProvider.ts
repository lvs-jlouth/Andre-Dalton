import type { LlmProvider, LlmRequest, LlmResponse, ProviderHealth, LlmCapabilities, LlmStreamChunk } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('provider:mock');

/**
 * Mock LLM provider — for development and testing only.
 * Returns deterministic responses without making any network calls.
 * No API key is required or accepted; secrets never touch this provider.
 */
export class MockProvider implements LlmProvider {
  readonly id = 'mock';
  readonly displayName = 'Mock (Dev/Test)';
  readonly capabilities: LlmCapabilities = {
    chat: true,
    streaming: true,
    vision: false,
    tools: false,
  };

  async healthCheck(): Promise<ProviderHealth> {
    log.debug('Mock health check — always ok');
    return { status: 'ok', latencyMs: 0 };
  }

  async sendMessage(request: LlmRequest): Promise<LlmResponse> {
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user');
    const echo = lastUserMessage?.content ?? '(no user message)';
    log.debug('Mock sendMessage called');

    return {
      id: `mock-${Date.now()}`,
      content: `[Mock response to: "${echo}"]`,
      model: 'mock-model-1',
      finishReason: 'stop',
      usage: {
        promptTokens: echo.split(' ').length,
        completionTokens: 6,
        totalTokens: echo.split(' ').length + 6,
      },
    };
  }

  async *streamMessage(request: LlmRequest): AsyncIterable<LlmStreamChunk> {
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user');
    const echo = lastUserMessage?.content ?? '(no user message)';
    const chunks = `[Mock stream response to: "${echo}"]`.split(' ');
    const id = `mock-stream-${Date.now()}`;

    for (let i = 0; i < chunks.length; i++) {
      yield {
        id,
        delta: (i === 0 ? '' : ' ') + chunks[i],
        done: i === chunks.length - 1,
        finishReason: i === chunks.length - 1 ? 'stop' : undefined,
      };
    }
  }
}
