import { create } from 'zustand';
import { useSettingsStore } from './settingsStore.js';
import type { AssistantResponse } from '../types/provider.js';

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  providerId?: string;
  model?: string;
  localOnly?: boolean;
}

type AssistantStatus = 'idle' | 'thinking' | 'speaking' | 'listening' | 'error';

interface PendingConfirmation {
  message: string;
  reason: string;
  createdAt: number;
}

interface AssistantState {
  status: AssistantStatus;
  conversation: ConversationTurn[];
  lastResponse: AssistantResponse | null;
  currentCaption: string;
  errorMessage: string | null;
  pendingConfirmation: PendingConfirmation | null;

  // Actions
  setStatus: (status: AssistantStatus) => void;
  addTurn: (turn: Omit<ConversationTurn, 'id' | 'timestamp'>) => void;
  setLastResponse: (response: AssistantResponse) => void;
  setCaption: (text: string) => void;
  setError: (message: string | null) => void;
  clearConversation: () => void;
  requestConfirmation: (message: string, reason: string) => void;
  clearPendingConfirmation: () => void;
}

let turnCounter = 0;
const TRANSCRIPT_STORAGE_KEY = 'aurora-transcripts';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function loadPersistedConversation(): ConversationTurn[] {
  const storage = getStorage();
  if (!storage || !useSettingsStore.getState().privacy.persistTranscripts) return [];

  try {
    const raw = storage.getItem(TRANSCRIPT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ConversationTurn[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((turn) =>
      turn &&
      typeof turn.id === 'string' &&
      (turn.role === 'user' || turn.role === 'assistant' || turn.role === 'system') &&
      typeof turn.content === 'string' &&
      typeof turn.timestamp === 'number',
    );
  } catch {
    return [];
  }
}

function syncConversationPersistence(conversation: ConversationTurn[]): void {
  const storage = getStorage();
  if (!storage) return;

  if (!useSettingsStore.getState().privacy.persistTranscripts) {
    storage.removeItem(TRANSCRIPT_STORAGE_KEY);
    return;
  }

  storage.setItem(TRANSCRIPT_STORAGE_KEY, JSON.stringify(conversation));
}

export const useAssistantStore = create<AssistantState>((set) => ({
  status: 'idle',
  conversation: loadPersistedConversation(),
  lastResponse: null,
  currentCaption: '',
  errorMessage: null,
  pendingConfirmation: null,

  setStatus: (status) => set({ status }),

  addTurn: (turn) =>
    set((state) => {
      const conversation = [
        ...state.conversation,
        { ...turn, id: `turn-${++turnCounter}`, timestamp: Date.now() },
      ];
      syncConversationPersistence(conversation);
      return { conversation };
    }),

  setLastResponse: (response) => set({ lastResponse: response }),

  setCaption: (text) => set({ currentCaption: text }),

  setError: (message) => set({ errorMessage: message }),

  clearConversation: () => {
    syncConversationPersistence([]);
    set({ conversation: [], lastResponse: null, currentCaption: '', errorMessage: null, pendingConfirmation: null });
  },

  requestConfirmation: (message, reason) =>
    set({
      pendingConfirmation: {
        message,
        reason,
        createdAt: Date.now(),
      },
    }),

  clearPendingConfirmation: () => set({ pendingConfirmation: null }),
}));

let previousTranscriptSetting = useSettingsStore.getState().privacy.persistTranscripts;
useSettingsStore.subscribe((state) => {
  const enabled = state.privacy.persistTranscripts;
  if (enabled === previousTranscriptSetting) return;
  previousTranscriptSetting = enabled;

  if (enabled) {
    syncConversationPersistence(useAssistantStore.getState().conversation);
    return;
  }

  syncConversationPersistence([]);
});
