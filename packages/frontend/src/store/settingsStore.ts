import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccessibilitySettings, PrivacySettings } from '../types/settings.js';
import { DEFAULT_ACCESSIBILITY, DEFAULT_PRIVACY } from '../types/settings.js';

interface SettingsState {
  accessibility: AccessibilitySettings;
  privacy: PrivacySettings;
  activePanel: 'dashboard' | 'providers' | 'voice' | 'accessibility' | 'privacy';

  updateAccessibility: (patch: Partial<AccessibilitySettings>) => void;
  updatePrivacy: (patch: Partial<PrivacySettings>) => void;
  setActivePanel: (panel: SettingsState['activePanel']) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      accessibility: DEFAULT_ACCESSIBILITY,
      privacy: DEFAULT_PRIVACY,
      activePanel: 'dashboard',

      updateAccessibility: (patch) =>
        set((state) => ({ accessibility: { ...state.accessibility, ...patch } })),

      updatePrivacy: (patch) =>
        set((state) => ({ privacy: { ...state.privacy, ...patch } })),

      setActivePanel: (panel) => set({ activePanel: panel }),
    }),
    {
      name: 'jargiin-settings',
    },
  ),
);
