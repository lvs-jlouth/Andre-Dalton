/**
 * LLM provider abstraction layer.
 *
 * All providers must implement LlmProvider. The backend routes only call the
 * interface, never individual provider SDKs directly, so swapping or adding a
 * provider is a matter of implementing this contract and registering the
 * adapter.
 */

export type ProviderHealthStatus = 'ok' | 'degraded' | 'unavailable' | 'unconfigured';

export interface ProviderHealth {
  status: ProviderHealthStatus;
  latencyMs?: number;
  message?: string;
}

export interface LlmCapabilities {
  chat: boolean;
  streaming: boolean;
  vision: boolean;
  tools: boolean;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface LlmResponse {
  id: string;
  content: string;
  model: string;
  finishReason: 'stop' | 'length' | 'error' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LlmStreamChunk {
  id: string;
  delta: string;
  done: boolean;
  finishReason?: string;
}

export interface LlmProvider {
  /** Unique machine-readable id, e.g. "openai" */
  readonly id: string;
  /** Human-friendly display name shown in the UI */
  readonly displayName: string;
  readonly capabilities: LlmCapabilities;

  /**
   * Test connectivity and credential validity.
   * Must NOT reveal the API key in the response or logs.
   */
  healthCheck(): Promise<ProviderHealth>;

  /** Single-turn or multi-turn chat completion */
  sendMessage(request: LlmRequest): Promise<LlmResponse>;

  /** Optional streaming variant */
  streamMessage?(request: LlmRequest): AsyncIterable<LlmStreamChunk>;
}

/** Registry entry returned by GET /providers */
export interface ProviderInfo {
  id: string;
  displayName: string;
  capabilities: LlmCapabilities;
  configured: boolean; // true if an API key / endpoint is present
}
