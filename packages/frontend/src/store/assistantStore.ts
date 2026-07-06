import { create } from 'zustand';
import type { LlmMessage, AssistantResponse } from '../types/provider.js';

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  providerId?: string;
  model?: string;
}

type AssistantStatus = 'idle' | 'thinking' | 'speaking' | 'listening' | 'error';

interface AssistantState {
  status: AssistantStatus;
  conversation: ConversationTurn[];
  lastResponse: AssistantResponse | null;
  currentCaption: string;
  errorMessage: string | null;

  // Actions
  setStatus: (status: AssistantStatus) => void;
  addTurn: (turn: Omit<ConversationTurn, 'id' | 'timestamp'>) => void;
  setLastResponse: (response: AssistantResponse) => void;
  setCaption: (text: string) => void;
  setError: (message: string | null) => void;
  clearConversation: () => void;
}

let turnCounter = 0;

export const useAssistantStore = create<AssistantState>((set) => ({
  status: 'idle',
  conversation: [],
  lastResponse: null,
  currentCaption: '',
  errorMessage: null,

  setStatus: (status) => set({ status }),

  addTurn: (turn) =>
    set((state) => ({
      conversation: [
        ...state.conversation,
        { ...turn, id: `turn-${++turnCounter}`, timestamp: Date.now() },
      ],
    })),

  setLastResponse: (response) => set({ lastResponse: response }),

  setCaption: (text) => set({ currentCaption: text }),

  setError: (message) => set({ errorMessage: message }),

  clearConversation: () => set({ conversation: [], lastResponse: null, currentCaption: '', errorMessage: null }),
}));
