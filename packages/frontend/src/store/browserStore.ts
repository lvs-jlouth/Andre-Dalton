/**
 * Browser store — manages browser integration settings.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type BrowserEngine, type SearchEngine, detectBrowser } from '../services/browser/browserController.js';

interface BrowserState {
  /** Preferred browser engine */
  preferredBrowser: BrowserEngine;
  /** Default search engine */
  searchEngine: SearchEngine;
  /** Whether voice browser commands are enabled */
  voiceBrowsingEnabled: boolean;
  /** Whether to announce actions via TTS */
  announceActions: boolean;

  setPreferredBrowser: (browser: BrowserEngine) => void;
  setSearchEngine: (engine: SearchEngine) => void;
  setVoiceBrowsingEnabled: (enabled: boolean) => void;
  setAnnounceActions: (enabled: boolean) => void;
}

export const useBrowserStore = create<BrowserState>()(
  persist(
    (set) => ({
      preferredBrowser: detectBrowser(),
      searchEngine: 'google',
      voiceBrowsingEnabled: true,
      announceActions: true,

      setPreferredBrowser: (browser) => set({ preferredBrowser: browser }),
      setSearchEngine: (engine) => set({ searchEngine: engine }),
      setVoiceBrowsingEnabled: (enabled) => set({ voiceBrowsingEnabled: enabled }),
      setAnnounceActions: (enabled) => set({ announceActions: enabled }),
    }),
    { name: 'jargiin-browser' },
  ),
);
