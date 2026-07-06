import { BrowserSTTAdapter } from './BrowserSTTAdapter.js';
import type { STTAdapter } from '../../types/speech.js';

export type STTProviderName = 'browser';

const adapters: Record<STTProviderName, () => STTAdapter> = {
  browser: () => new BrowserSTTAdapter(),
};

/** Returns a fresh STT adapter instance for the given provider. */
export function createSTTAdapter(provider: STTProviderName = 'browser'): STTAdapter {
  const factory = adapters[provider];
  if (!factory) {
    console.warn(`STT provider "${provider}" not found, falling back to browser`);
    return new BrowserSTTAdapter();
  }
  return factory();
}

export { BrowserSTTAdapter };
export type { STTAdapter };
