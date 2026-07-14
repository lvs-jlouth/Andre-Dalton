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
  voiceEngine: 'browser',
  voiceModel: 'Natural British Male (Browser auto-select)',
  voiceEndpoint: '',
  voiceId: '',
  voiceRate: 0.95,
  voicePitch: 0.92,
  voiceVolume: 1.0,
  personalityStyle: 'british-butler',
  personalityPrompt:
    'Speak like a polished British butler with scientific rigor, curious reasoning, confident authority, and a lightly sassy wit. Be concise, practical, and respectful.',
  wakeWord: {
    enabled: false,
    phrase: 'Hey J',
    sensitivity: 0.75,
  },
  updatedAt: new Date().toISOString(),
};

function normalizeProfile(profile: Partial<SpeechProfile> | undefined): SpeechProfile {
  const rawWakeWord = profile?.wakeWord as Partial<SpeechProfile['wakeWord']> | undefined;
  const rawSubstitutions = Array.isArray(profile?.substitutions) ? profile.substitutions : [];
  const substitutions = rawSubstitutions
    .filter((entry): entry is { heard: string; intended: string } => {
      return Boolean(
        entry
        && typeof entry === 'object'
        && typeof (entry as { heard?: unknown }).heard === 'string'
        && typeof (entry as { intended?: unknown }).intended === 'string',
      );
    })
    .map((entry) => ({ heard: entry.heard.trim(), intended: entry.intended.trim() }))
    .filter((entry) => entry.heard.length > 0 && entry.intended.length > 0);

  const customVocabulary = Array.isArray(profile?.customVocabulary)
    ? profile.customVocabulary.filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
    : [];

  const rawAliases = profile?.commandAliases && typeof profile.commandAliases === 'object'
    ? profile.commandAliases
    : {};
  const commandAliases = Object.fromEntries(
    Object.entries(rawAliases).filter(
      (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string',
    ),
  );

  return {
    ...DEFAULT_PROFILE,
    ...profile,
    substitutions,
    customVocabulary,
    commandAliases,
    wakeWord: {
      ...DEFAULT_PROFILE.wakeWord,
      ...(rawWakeWord ?? {}),
    },
    updatedAt: profile?.updatedAt ?? new Date().toISOString(),
  };
}

interface SpeechProfileState {
  profile: SpeechProfile;
  isDirty: boolean;

  updateProfile: (patch: Partial<SpeechProfile>) => void;
  addSubstitution: (heard: string, intended: string) => void;
  removeSubstitution: (heard: string) => void;
  addVocabularyWord: (word: string) => void;
  removeVocabularyWord: (word: string) => void;
  addAlias: (alias: string, expanded: string) => void;
  removeAlias: (alias: string) => void;
  setWakeWord: (patch: Partial<SpeechProfile['wakeWord']>) => void;
  setProfile: (profile: Partial<SpeechProfile>) => void;
  markSaved: () => void;
}

export const useSpeechProfileStore = create<SpeechProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      isDirty: false,

      updateProfile: (patch) =>
        set((state) => ({
          profile: { ...state.profile, ...patch, updatedAt: new Date().toISOString() },
          isDirty: true,
        })),

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

      setProfile: (profile) =>
        set({
          profile: normalizeProfile(profile),
          isDirty: false,
        }),

      markSaved: () => set({ isDirty: false }),
    }),
    {
      name: 'aurora-speech-profile',
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<SpeechProfileState> | undefined;
        return {
          ...currentState,
          ...state,
          profile: normalizeProfile(state?.profile),
        };
      },
    },
  ),
);
