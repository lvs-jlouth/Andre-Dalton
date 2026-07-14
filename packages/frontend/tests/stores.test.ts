import { describe, it, expect, beforeEach } from 'vitest';
import { useAssistantStore } from '../src/store/assistantStore.js';
import { useSpeechProfileStore } from '../src/store/speechProfileStore.js';

describe('assistantStore', () => {
  beforeEach(() => {
    const now = Date.now();
    const seedConversation = {
      id: 'conversation-1',
      title: 'Conversation 1',
      createdAt: now,
      updatedAt: now,
      turns: [],
    };
    useAssistantStore.setState({
      status: 'idle',
      conversation: [],
      conversations: [seedConversation],
      activeConversationId: seedConversation.id,
      preferredModel: 'gpt-5-mini',
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
    useAssistantStore.getState().addTurn({ role: 'user', content: 'Hello J.A.R.G.I.I.N.' });
    const conv = useAssistantStore.getState().conversation;
    expect(conv.length).toBe(1);
    expect(conv[0].content).toBe('Hello J.A.R.G.I.I.N.');
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

  it('creates and renames conversations', () => {
    const store = useAssistantStore.getState();
    store.createConversation('Release Notes');
    const created = useAssistantStore.getState().conversations[0];
    expect(created.title).toBe('Release Notes');

    useAssistantStore.getState().renameConversation(created.id, 'Weekly Review');
    const renamed = useAssistantStore.getState().conversations.find((c) => c.id === created.id);
    expect(renamed?.title).toBe('Weekly Review');
  });

  it('setCaption updates caption', () => {
    useAssistantStore.getState().setCaption('Hello there');
    expect(useAssistantStore.getState().currentCaption).toBe('Hello there');
  });

  it('updates preferred model path', () => {
    useAssistantStore.getState().setPreferredModel('gpt-5.5');
    expect(useAssistantStore.getState().preferredModel).toBe('gpt-5.5');
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
        voiceEngine: 'browser',
        voiceModel: 'Browser default voice',
        voiceEndpoint: '',
        voiceId: '',
        voiceRate: 0.9,
        voicePitch: 1.0,
        voiceVolume: 1.0,
        personalityStyle: 'balanced',
        personalityPrompt: 'Speak clearly, calmly, and helpfully with concise responses.',
        wakeWord: {
          enabled: false,
          phrase: 'Hey J',
          sensitivity: 0.75,
        },
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
    useSpeechProfileStore.getState().addVocabularyWord('J.A.R.G.I.I.N.');
    useSpeechProfileStore.getState().addVocabularyWord('J.A.R.G.I.I.N.');
    expect(useSpeechProfileStore.getState().profile.customVocabulary).toHaveLength(1);
  });

  it('removeVocabularyWord removes word', () => {
    useSpeechProfileStore.getState().addVocabularyWord('J.A.R.G.I.I.N.');
    useSpeechProfileStore.getState().removeVocabularyWord('J.A.R.G.I.I.N.');
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
});
