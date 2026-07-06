import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpeechProfile } from '../types/speech.js';

const DEFAULT_PROFILE: SpeechProfile = {
  id: 'local',
  preferredName: 'User',
  speechPace: 'normal',
  pauseToleranceMs: 2000,
  substitutions: [],
  customVocabulary: [],
  commandAliases: {},
  clarificationMode: 'moderate',
  confirmationThreshold: 0.6,
  consentStoringCorrections: false,
  consentLocalLearning: false,
  wakeWord: {
    enabled: false,
    phrase: 'Hey J',
    sensitivity: 0.75,
  },
  trainingSessions: [],
  lastTrainingAt: null,
  updatedAt: new Date().toISOString(),
};

interface SpeechProfileState {
  profile: SpeechProfile;
  isDirty: boolean;

  updateProfile: (patch: Partial<SpeechProfile>) => void;
  replaceProfile: (profile: SpeechProfile) => void;
  addSubstitution: (heard: string, intended: string) => void;
  removeSubstitution: (heard: string) => void;
  addVocabularyWord: (word: string) => void;
  removeVocabularyWord: (word: string) => void;
  addAlias: (alias: string, expanded: string) => void;
  removeAlias: (alias: string) => void;
  setWakeWord: (patch: Partial<SpeechProfile['wakeWord']>) => void;
  markSaved: () => void;
  resetProfile: () => void;
}

function getPersistedProfile(profile: SpeechProfile): SpeechProfile {
  return {
    ...profile,
    preferredName: profile.consentLocalLearning ? profile.preferredName : DEFAULT_PROFILE.preferredName,
    substitutions: profile.consentStoringCorrections ? profile.substitutions : [],
    customVocabulary: profile.consentLocalLearning ? profile.customVocabulary : [],
    commandAliases: profile.consentLocalLearning ? profile.commandAliases : {},
    trainingSessions: profile.consentLocalLearning ? profile.trainingSessions : [],
    lastTrainingAt: profile.consentLocalLearning ? profile.lastTrainingAt : null,
  };
}

export const useSpeechProfileStore = create<SpeechProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      isDirty: false,

      updateProfile: (patch) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...patch,
            wakeWord: { ...state.profile.wakeWord, ...(patch.wakeWord ?? {}) },
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        })),

      replaceProfile: (profile) =>
        set({
          profile: {
            ...profile,
            wakeWord: { ...DEFAULT_PROFILE.wakeWord, ...profile.wakeWord },
            trainingSessions: profile.trainingSessions.map((session) => ({
              ...session,
              attempts: session.attempts.map((attempt) => ({ ...attempt })),
            })),
          },
          isDirty: false,
        }),

      addSubstitution: (heard, intended) =>
        set((state) => ({
          profile: {
            ...state.profile,
            substitutions: [
              ...state.profile.substitutions.filter((s) => s.heard !== heard),
              { heard, intended },
            ],
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        })),

      removeSubstitution: (heard) =>
        set((state) => ({
          profile: {
            ...state.profile,
            substitutions: state.profile.substitutions.filter((s) => s.heard !== heard),
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        })),

      addVocabularyWord: (word) =>
        set((state) => ({
          profile: {
            ...state.profile,
            customVocabulary: [...new Set([...state.profile.customVocabulary, word.trim()])],
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        })),

      removeVocabularyWord: (word) =>
        set((state) => ({
          profile: {
            ...state.profile,
            customVocabulary: state.profile.customVocabulary.filter((w) => w !== word),
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        })),

      addAlias: (alias, expanded) =>
        set((state) => ({
          profile: {
            ...state.profile,
            commandAliases: { ...state.profile.commandAliases, [alias]: expanded },
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        })),

      removeAlias: (alias) =>
        set((state) => {
          const { [alias]: _, ...rest } = state.profile.commandAliases;
          return {
            profile: { ...state.profile, commandAliases: rest, updatedAt: new Date().toISOString() },
            isDirty: true,
          };
        }),

      setWakeWord: (patch) =>
        set((state) => ({
          profile: {
            ...state.profile,
            wakeWord: { ...state.profile.wakeWord, ...patch },
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        })),

      markSaved: () => set({ isDirty: false }),

      resetProfile: () =>
        set({
          profile: { ...DEFAULT_PROFILE, updatedAt: new Date().toISOString() },
          isDirty: false,
        }),
    }),
    {
      name: 'aurora-speech-profile',
      partialize: (state) => ({
        profile: getPersistedProfile(state.profile),
        isDirty: state.isDirty,
      }),
    },
  ),
);
