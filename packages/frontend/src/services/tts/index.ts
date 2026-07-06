import { BrowserTTSAdapter } from './BrowserTTSAdapter.js';
import type { TTSAdapter } from '../../types/speech.js';

export type TTSProviderName = 'browser';

const adapters: Record<TTSProviderName, () => TTSAdapter> = {
  browser: () => new BrowserTTSAdapter(),
};

export function createTTSAdapter(provider: TTSProviderName = 'browser'): TTSAdapter {
  const factory = adapters[provider];
  if (!factory) {
    console.warn(`TTS provider "${provider}" not found, falling back to browser`);
    return new BrowserTTSAdapter();
  }
  return factory();
}

export { BrowserTTSAdapter };
export type { TTSAdapter };
