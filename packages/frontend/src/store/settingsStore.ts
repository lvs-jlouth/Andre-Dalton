import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccessibilitySettings, PrivacySettings } from '../types/settings.js';
import { DEFAULT_ACCESSIBILITY, DEFAULT_PRIVACY } from '../types/settings.js';

interface SettingsState {
  accessibility: AccessibilitySettings;
  privacy: PrivacySettings;
  activePanel: 'dashboard' | 'providers' | 'voice' | 'accessibility' | 'privacy' | 'microsoft' | 'personality' | 'browser' | 'processing';
  /** Boot mode — shows the configuration/training menu when active */
  bootMode: boolean;

  updateAccessibility: (patch: Partial<AccessibilitySettings>) => void;
  updatePrivacy: (patch: Partial<PrivacySettings>) => void;
  setActivePanel: (panel: SettingsState['activePanel']) => void;
  setBootMode: (active: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      accessibility: DEFAULT_ACCESSIBILITY,
      privacy: DEFAULT_PRIVACY,
      activePanel: 'dashboard',
      bootMode: false,

      updateAccessibility: (patch) =>
        set((state) => ({ accessibility: { ...state.accessibility, ...patch } })),

      updatePrivacy: (patch) =>
        set((state) => ({ privacy: { ...state.privacy, ...patch } })),

      setActivePanel: (panel) => set({ activePanel: panel }),

      setBootMode: (active) => set({ bootMode: active }),
    }),
    {
      name: 'jargiin-settings',
    },
  ),
);
