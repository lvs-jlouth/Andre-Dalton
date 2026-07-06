import { describe, it, expect, beforeEach } from 'vitest';
import { useAssistantStore } from '../src/store/assistantStore.js';
import { useSettingsStore } from '../src/store/settingsStore.js';
import { useSpeechProfileStore } from '../src/store/speechProfileStore.js';

describe('assistantStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        largeText: false,
        fontScale: 1.0,
        captions: true,
        onHandedLayout: 'none',
        keyboardNavigation: true,
        largeHitTargets: true,
      },
      privacy: {
        persistTranscripts: false,
        consentSpeechImprovement: false,
        debugMode: false,
      },
      activePanel: 'dashboard',
    });
    useAssistantStore.setState({
      status: 'idle',
      conversation: [],
      lastResponse: null,
      currentCaption: '',
      errorMessage: null,
      pendingConfirmation: null,
    });
  });

  it('initial state is idle', () => {
    expect(useAssistantStore.getState().status).toBe('idle');
  });

  it('setStatus changes status', () => {
    useAssistantStore.getState().setStatus('thinking');
    expect(useAssistantStore.getState().status).toBe('thinking');
  });

  it('addTurn appends to conversation', () => {
    useAssistantStore.getState().addTurn({ role: 'user', content: 'Hello AURORA' });
    const conv = useAssistantStore.getState().conversation;
    expect(conv.length).toBe(1);
    expect(conv[0].content).toBe('Hello AURORA');
    expect(conv[0].role).toBe('user');
    expect(typeof conv[0].id).toBe('string');
    expect(typeof conv[0].timestamp).toBe('number');
  });

  it('clearConversation resets state', () => {
    useAssistantStore.getState().addTurn({ role: 'user', content: 'test' });
    useAssistantStore.getState().setError('Something went wrong');
    useAssistantStore.getState().clearConversation();

    const state = useAssistantStore.getState();
    expect(state.conversation).toHaveLength(0);
    expect(state.errorMessage).toBeNull();
    expect(state.currentCaption).toBe('');
  });

  it('setCaption updates caption', () => {
    useAssistantStore.getState().setCaption('Hello there');
    expect(useAssistantStore.getState().currentCaption).toBe('Hello there');
  });

  it('persists transcripts only when enabled', () => {
    useAssistantStore.getState().addTurn({ role: 'user', content: 'do not retain me' });
    expect(localStorage.getItem('aurora-transcripts')).toBeNull();

    useSettingsStore.getState().updatePrivacy({ persistTranscripts: true });
    useAssistantStore.getState().addTurn({ role: 'assistant', content: 'retain me' });

    expect(localStorage.getItem('aurora-transcripts')).toContain('retain me');

    useSettingsStore.getState().updatePrivacy({ persistTranscripts: false });
    expect(localStorage.getItem('aurora-transcripts')).toBeNull();
  });

  it('tracks pending confirmations for risky actions', () => {
    useAssistantStore.getState().requestConfirmation('delete all notes', 'destructive changes');
    expect(useAssistantStore.getState().pendingConfirmation?.message).toBe('delete all notes');
    useAssistantStore.getState().clearPendingConfirmation();
    expect(useAssistantStore.getState().pendingConfirmation).toBeNull();
  });
});

describe('speechProfileStore', () => {
  beforeEach(() => {
    useSpeechProfileStore.setState({
      profile: {
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
      },
      isDirty: false,
    });
  });

  it('updateProfile changes preferredName', () => {
    useSpeechProfileStore.getState().updateProfile({ preferredName: 'Andre' });
    expect(useSpeechProfileStore.getState().profile.preferredName).toBe('Andre');
    expect(useSpeechProfileStore.getState().isDirty).toBe(true);
  });

  it('addSubstitution adds entry', () => {
    useSpeechProfileStore.getState().addSubstitution('open lights', 'turn on lights');
    const subs = useSpeechProfileStore.getState().profile.substitutions;
    expect(subs).toHaveLength(1);
    expect(subs[0].heard).toBe('open lights');
    expect(subs[0].intended).toBe('turn on lights');
  });

  it('removeSubstitution removes entry', () => {
    useSpeechProfileStore.getState().addSubstitution('open lights', 'turn on lights');
    useSpeechProfileStore.getState().removeSubstitution('open lights');
    expect(useSpeechProfileStore.getState().profile.substitutions).toHaveLength(0);
  });

  it('addVocabularyWord deduplicates', () => {
    useSpeechProfileStore.getState().addVocabularyWord('AURORA');
    useSpeechProfileStore.getState().addVocabularyWord('AURORA');
    expect(useSpeechProfileStore.getState().profile.customVocabulary).toHaveLength(1);
  });

  it('removeVocabularyWord removes word', () => {
    useSpeechProfileStore.getState().addVocabularyWord('AURORA');
    useSpeechProfileStore.getState().removeVocabularyWord('AURORA');
    expect(useSpeechProfileStore.getState().profile.customVocabulary).toHaveLength(0);
  });

  it('addAlias stores alias mapping', () => {
    useSpeechProfileStore.getState().addAlias('lights off', 'turn off all lights');
    expect(useSpeechProfileStore.getState().profile.commandAliases['lights off']).toBe('turn off all lights');
  });

  it('removeAlias deletes alias', () => {
    useSpeechProfileStore.getState().addAlias('lights off', 'turn off all lights');
    useSpeechProfileStore.getState().removeAlias('lights off');
    expect(useSpeechProfileStore.getState().profile.commandAliases['lights off']).toBeUndefined();
  });

  it('default wakeWord is disabled with phrase "Hey J"', () => {
    const { wakeWord } = useSpeechProfileStore.getState().profile;
    expect(wakeWord.enabled).toBe(false);
    expect(wakeWord.phrase).toBe('Hey J');
    expect(wakeWord.sensitivity).toBe(0.75);
  });

  it('setWakeWord enables the wake word listener', () => {
    useSpeechProfileStore.getState().setWakeWord({ enabled: true });
    expect(useSpeechProfileStore.getState().profile.wakeWord.enabled).toBe(true);
    // other fields unchanged
    expect(useSpeechProfileStore.getState().profile.wakeWord.phrase).toBe('Hey J');
  });

  it('setWakeWord updates phrase only', () => {
    useSpeechProfileStore.getState().setWakeWord({ phrase: 'Go time' });
    const { wakeWord } = useSpeechProfileStore.getState().profile;
    expect(wakeWord.phrase).toBe('Go time');
    expect(wakeWord.enabled).toBe(false); // unchanged
    expect(wakeWord.sensitivity).toBe(0.75); // unchanged
  });

  it('setWakeWord updates sensitivity', () => {
    useSpeechProfileStore.getState().setWakeWord({ sensitivity: 0.5 });
    expect(useSpeechProfileStore.getState().profile.wakeWord.sensitivity).toBe(0.5);
  });

  it('setWakeWord marks profile as dirty', () => {
    useSpeechProfileStore.getState().setWakeWord({ enabled: true });
    expect(useSpeechProfileStore.getState().isDirty).toBe(true);
  });

  it('drops sensitive learning data from persisted profile without consent', () => {
    useSpeechProfileStore.getState().updateProfile({
      preferredName: 'Andre',
      consentLocalLearning: false,
      consentStoringCorrections: false,
      customVocabulary: ['secret phrase'],
      commandAliases: { unlock: 'open the front door' },
      substitutions: [{ heard: 'locks', intended: 'locks' }],
      trainingSessions: [
        {
          id: 'session-1',
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:10:00.000Z',
          promptsCompleted: 1,
          averageConfidence: 0.8,
          averageMatchScore: 0.9,
          attempts: [
            {
              promptId: 'prompt-1',
              expectedText: 'Please bring my notebook.',
              spokenText: 'Please bring my notebook.',
              confidence: 0.8,
              matchScore: 1,
              recordedAt: '2024-01-01T00:05:00.000Z',
            },
          ],
        },
      ],
      lastTrainingAt: '2024-01-01T00:10:00.000Z',
    });

    const raw = localStorage.getItem('aurora-speech-profile');
    expect(raw).not.toContain('secret phrase');
    expect(raw).not.toContain('open the front door');
    expect(raw).not.toContain('Andre');
    expect(raw).not.toContain('Please bring my notebook.');
  });

  it('replaceProfile hydrates remote profile and clears dirty state', () => {
    useSpeechProfileStore.getState().updateProfile({ preferredName: 'Draft' });
    useSpeechProfileStore.getState().replaceProfile({
      id: 'remote',
      preferredName: 'Andre',
      speechPace: 'slow',
      pauseToleranceMs: 3000,
      substitutions: [],
      customVocabulary: ['AURORA'],
      commandAliases: {},
      clarificationMode: 'moderate',
      confirmationThreshold: 0.6,
      consentStoringCorrections: false,
      consentLocalLearning: true,
      wakeWord: {
        enabled: true,
        phrase: 'Go time',
        sensitivity: 0.8,
      },
      trainingSessions: [],
      lastTrainingAt: null,
      updatedAt: new Date().toISOString(),
    });

    const state = useSpeechProfileStore.getState();
    expect(state.profile.preferredName).toBe('Andre');
    expect(state.profile.wakeWord.phrase).toBe('Go time');
    expect(state.isDirty).toBe(false);
  });
});
