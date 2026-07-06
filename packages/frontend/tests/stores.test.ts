import { describe, it, expect, beforeEach } from 'vitest';
import { useAssistantStore } from '../src/store/assistantStore.js';
import { useSpeechProfileStore } from '../src/store/speechProfileStore.js';

describe('assistantStore', () => {
  beforeEach(() => {
    useAssistantStore.setState({
      status: 'idle',
      conversation: [],
      lastResponse: null,
      currentCaption: '',
      errorMessage: null,
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
});
