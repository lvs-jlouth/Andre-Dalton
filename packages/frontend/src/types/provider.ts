/** Mirror of backend provider types — shared across frontend and backend. */

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

export interface ProviderInfo {
  id: string;
  displayName: string;
  capabilities: LlmCapabilities;
  configured: boolean;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AssistantRequest {
  messages: LlmMessage[];
  providerId?: string;
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  useWebSearch?: boolean;
  includeM365Context?: boolean;
}

export interface AssistantResponse {
  content: string;
  model: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  providerId: string;
  m365ContextUsed?: boolean;
}
