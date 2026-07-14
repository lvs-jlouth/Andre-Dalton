import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssistantResponse } from '../types/provider.js';

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  providerId?: string;
  model?: string;
}

type AssistantStatus = 'idle' | 'thinking' | 'speaking' | 'listening' | 'error';

export interface ConversationThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: ConversationTurn[];
}

interface AssistantState {
  status: AssistantStatus;
  conversation: ConversationTurn[];
  conversations: ConversationThread[];
  activeConversationId: string;
  preferredModel: 'gpt-5.5' | 'gpt-5-mini' | 'gpt-5-nano';
  lastResponse: AssistantResponse | null;
  currentCaption: string;
  errorMessage: string | null;

  // Actions
  setStatus: (status: AssistantStatus) => void;
  addTurn: (turn: Omit<ConversationTurn, 'id' | 'timestamp'>) => void;
  setLastResponse: (response: AssistantResponse) => void;
  setCaption: (text: string) => void;
  setError: (message: string | null) => void;
  setPreferredModel: (model: AssistantState['preferredModel']) => void;
  createConversation: (title?: string) => void;
  selectConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, title: string) => void;
  clearConversation: () => void;
}

let turnCounter = 0;
let conversationCounter = 1;

function createConversation(title?: string): ConversationThread {
  const now = Date.now();
  return {
    id: `conversation-${++conversationCounter}`,
    title: title?.trim() || `Conversation ${conversationCounter}`,
    createdAt: now,
    updatedAt: now,
    turns: [],
  };
}

const initialConversation = createConversation('Conversation 1');

function autoTitleForConversation(thread: ConversationThread, turn: ConversationTurn): string {
  if (thread.turns.length > 0 || turn.role !== 'user') return thread.title;
  const base = turn.content.trim().replace(/\s+/g, ' ');
  if (!base) return thread.title;
  return base.length > 48 ? `${base.slice(0, 48)}...` : base;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      status: 'idle',
      conversation: [],
      conversations: [initialConversation],
      activeConversationId: initialConversation.id,
      preferredModel: 'gpt-5-mini',
      lastResponse: null,
      currentCaption: '',
      errorMessage: null,

      setStatus: (status) => set({ status }),

      addTurn: (turn) =>
        set((state) => {
          const newTurn: ConversationTurn = {
            ...turn,
            id: `turn-${++turnCounter}`,
            timestamp: Date.now(),
          };
          const activeId = state.activeConversationId;
          const existing = state.conversations.find((c) => c.id === activeId);
          if (!existing) return state;

          const updatedConversations = state.conversations.map((thread) => {
            if (thread.id !== activeId) return thread;
            return {
              ...thread,
              title: autoTitleForConversation(thread, newTurn),
              updatedAt: Date.now(),
              turns: [...thread.turns, newTurn],
            };
          });

          const activeConversation = updatedConversations.find((c) => c.id === activeId);

          return {
            conversations: updatedConversations,
            conversation: activeConversation?.turns ?? [],
          };
        }),

      setLastResponse: (response) => set({ lastResponse: response }),

      setCaption: (text) => set({ currentCaption: text }),

      setError: (message) => set({ errorMessage: message }),
      setPreferredModel: (model) => set({ preferredModel: model }),

      createConversation: (title) =>
        set((state) => {
          const thread = createConversation(title);
          return {
            conversations: [thread, ...state.conversations],
            activeConversationId: thread.id,
            conversation: [],
            lastResponse: null,
            currentCaption: '',
            errorMessage: null,
          };
        }),

      selectConversation: (conversationId) =>
        set((state) => {
          const thread = state.conversations.find((c) => c.id === conversationId);
          if (!thread) return state;
          return {
            activeConversationId: conversationId,
            conversation: thread.turns,
            currentCaption: '',
            errorMessage: null,
          };
        }),

      renameConversation: (conversationId, title) =>
        set((state) => {
          const trimmed = title.trim();
          if (!trimmed) return state;
          return {
            conversations: state.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, title: trimmed, updatedAt: Date.now() }
                : c
            ),
          };
        }),

      clearConversation: () =>
        set((state) => ({
          conversations: state.conversations.map((thread) =>
            thread.id === state.activeConversationId
              ? { ...thread, turns: [], updatedAt: Date.now() }
              : thread
          ),
          conversation: [],
          lastResponse: null,
          currentCaption: '',
          errorMessage: null,
        })),
    }),
    {
      name: 'jargiin-conversations',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        conversation: state.conversation,
        preferredModel: state.preferredModel,
      }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<AssistantState> | undefined;
        const storedConversations = Array.isArray(stored?.conversations) && stored!.conversations.length > 0
          ? stored!.conversations
          : current.conversations;
        const activeId = stored?.activeConversationId
          && storedConversations.some((c) => c.id === stored.activeConversationId)
          ? stored.activeConversationId
          : storedConversations[0]?.id;
        const activeConversation = storedConversations.find((c) => c.id === activeId);

        return {
          ...current,
          ...stored,
          conversations: storedConversations,
          activeConversationId: activeId ?? current.activeConversationId,
          conversation: activeConversation?.turns ?? [],
          preferredModel: stored?.preferredModel ?? current.preferredModel,
        };
      },
    },
  ),
);
