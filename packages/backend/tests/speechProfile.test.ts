import { describe, it, expect } from 'vitest';
import {
  getDefaultSpeechProfile,
  validateSpeechProfile,
  parseSpeechProfile,
} from '../src/services/speechProfile.js';

describe('getDefaultSpeechProfile', () => {
  it('returns a profile with expected default fields', () => {
    const profile = getDefaultSpeechProfile();
    expect(profile.id).toBe('default');
    expect(profile.preferredName).toBe('User');
    expect(profile.speechPace).toBe('normal');
    expect(profile.pauseToleranceMs).toBe(2000);
    expect(profile.substitutions).toEqual([]);
    expect(profile.customVocabulary).toEqual([]);
    expect(profile.commandAliases).toEqual({});
    expect(profile.clarificationMode).toBe('moderate');
    expect(profile.confirmationThreshold).toBe(0.6);
    expect(profile.consentStoringCorrections).toBe(false);
    expect(profile.trainingSessions).toEqual([]);
    expect(profile.lastTrainingAt).toBeNull();
  });

  it('returns independent copies — mutation does not affect the module', () => {
    const a = getDefaultSpeechProfile();
    const b = getDefaultSpeechProfile();
    a.preferredName = 'Andre';
    a.wakeWord.phrase = 'Go time';
    expect(b.preferredName).toBe('User');
    expect(b.wakeWord.phrase).toBe('Hey J');
  });
});

describe('validateSpeechProfile', () => {
  it('returns valid:true for empty object (all fields optional)', () => {
    expect(validateSpeechProfile({}).valid).toBe(true);
  });

  it('accepts valid paces', () => {
    for (const pace of ['very_slow', 'slow', 'normal', 'fast']) {
      const r = validateSpeechProfile({ speechPace: pace });
      expect(r.valid).toBe(true);
    }
  });

  it('rejects invalid speechPace', () => {
    const r = validateSpeechProfile({ speechPace: 'turbo' });
    expect(r.valid).toBe(false);
    expect(r.errors?.some((e) => e.includes('speechPace'))).toBe(true);
  });

  it('rejects pauseToleranceMs below 500', () => {
    const r = validateSpeechProfile({ pauseToleranceMs: 100 });
    expect(r.valid).toBe(false);
    expect(r.errors?.some((e) => e.includes('pauseToleranceMs'))).toBe(true);
  });

  it('rejects pauseToleranceMs above 30000', () => {
    const r = validateSpeechProfile({ pauseToleranceMs: 999999 });
    expect(r.valid).toBe(false);
  });

  it('accepts valid pauseToleranceMs', () => {
    expect(validateSpeechProfile({ pauseToleranceMs: 3000 }).valid).toBe(true);
  });

  it('rejects confirmationThreshold outside 0-1', () => {
    expect(validateSpeechProfile({ confirmationThreshold: -0.1 }).valid).toBe(false);
    expect(validateSpeechProfile({ confirmationThreshold: 1.5 }).valid).toBe(false);
  });

  it('accepts confirmationThreshold at boundaries 0 and 1', () => {
    expect(validateSpeechProfile({ confirmationThreshold: 0 }).valid).toBe(true);
    expect(validateSpeechProfile({ confirmationThreshold: 1 }).valid).toBe(true);
  });

  it('rejects invalid clarificationMode', () => {
    const r = validateSpeechProfile({ clarificationMode: 'extreme' });
    expect(r.valid).toBe(false);
    expect(r.errors?.some((e) => e.includes('clarificationMode'))).toBe(true);
  });

  it('rejects substitutions that are not arrays', () => {
    const r = validateSpeechProfile({ substitutions: 'bad' });
    expect(r.valid).toBe(false);
  });

  it('rejects non-object payload', () => {
    expect(validateSpeechProfile(null).valid).toBe(false);
    expect(validateSpeechProfile('string').valid).toBe(false);
    expect(validateSpeechProfile(42).valid).toBe(false);
  });

  it('accepts valid training session history', () => {
    const result = validateSpeechProfile({
      trainingSessions: [
        {
          id: 'session-1',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          promptsCompleted: 1,
          averageConfidence: 0.9,
          averageMatchScore: 0.85,
          attempts: [
            {
              promptId: 'prompt-1',
              expectedText: 'She sells seashells by the seashore.',
              spokenText: 'She sells seashells by the sea shore.',
              confidence: 0.92,
              matchScore: 0.88,
              recordedAt: new Date().toISOString(),
            },
          ],
        },
      ],
      lastTrainingAt: new Date().toISOString(),
    });

    expect(result.valid).toBe(true);
  });

  it('rejects invalid training session history', () => {
    const result = validateSpeechProfile({
      trainingSessions: [
        {
          id: 'session-1',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          promptsCompleted: 1,
          averageConfidence: 2,
          averageMatchScore: 0.85,
          attempts: [],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors?.some((error) => error.includes('averageConfidence'))).toBe(true);
  });
});

describe('parseSpeechProfile', () => {
  it('merges provided fields over defaults', () => {
    const profile = parseSpeechProfile({
      preferredName: 'Andre',
      speechPace: 'slow',
      pauseToleranceMs: 4000,
    });
    expect(profile.preferredName).toBe('Andre');
    expect(profile.speechPace).toBe('slow');
    expect(profile.pauseToleranceMs).toBe(4000);
    // defaults preserved
    expect(profile.clarificationMode).toBe('moderate');
  });

  it('updates the updatedAt timestamp', () => {
    const before = new Date();
    const profile = parseSpeechProfile({});
    const after = new Date();
    const updated = new Date(profile.updatedAt);
    expect(updated.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('handles null/undefined payload gracefully', () => {
    const profile = parseSpeechProfile(null);
    expect(profile.preferredName).toBe('User');
  });

  it('persists substitution list', () => {
    const subs = [{ heard: 'open lights', intended: 'turn on lights' }];
    const profile = parseSpeechProfile({ substitutions: subs });
    expect(profile.substitutions).toEqual(subs);
  });

  it('persists command aliases', () => {
    const aliases = { 'off': 'turn off all lights' };
    const profile = parseSpeechProfile({ commandAliases: aliases });
    expect(profile.commandAliases).toEqual(aliases);
  });

  it('deep-merges wakeWord so partial updates preserve other fields', () => {
    // Only updating the phrase should leave enabled and sensitivity at defaults
    const profile = parseSpeechProfile({ wakeWord: { phrase: 'Go time', enabled: false, sensitivity: 0.75 } });
    expect(profile.wakeWord.phrase).toBe('Go time');
    expect(profile.wakeWord.enabled).toBe(false);
    expect(profile.wakeWord.sensitivity).toBe(0.75);
  });

  it('defaults wakeWord.enabled to false', () => {
    const profile = parseSpeechProfile({});
    expect(profile.wakeWord.enabled).toBe(false);
  });

  it('defaults wakeWord.phrase to "Hey J"', () => {
    const profile = parseSpeechProfile({});
    expect(profile.wakeWord.phrase).toBe('Hey J');
  });

  it('merges updates over an existing profile', () => {
    const existing = parseSpeechProfile({
      preferredName: 'Andre',
      trainingSessions: [
        {
          id: 'session-1',
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:10:00.000Z',
          promptsCompleted: 1,
          averageConfidence: 0.8,
          averageMatchScore: 0.75,
          attempts: [
            {
              promptId: 'prompt-1',
              expectedText: 'Bright birds build blue nests.',
              spokenText: 'Bright birds build blue nests.',
              confidence: 0.8,
              matchScore: 1,
              recordedAt: '2024-01-01T00:05:00.000Z',
            },
          ],
        },
      ],
      lastTrainingAt: '2024-01-01T00:10:00.000Z',
    });

    const profile = parseSpeechProfile({ speechPace: 'slow' }, existing);

    expect(profile.preferredName).toBe('Andre');
    expect(profile.speechPace).toBe('slow');
    expect(profile.trainingSessions).toHaveLength(1);
    expect(profile.lastTrainingAt).toBe('2024-01-01T00:10:00.000Z');
  });
});

describe('validateSpeechProfile — wake word fields', () => {
  it('accepts a valid wakeWord object', () => {
    const r = validateSpeechProfile({
      wakeWord: { enabled: true, phrase: 'Hey J', sensitivity: 0.8 },
    });
    expect(r.valid).toBe(true);
  });

  it('rejects wakeWord that is not an object', () => {
    const r = validateSpeechProfile({ wakeWord: 'bad' });
    expect(r.valid).toBe(false);
    expect(r.errors?.some((e) => e.includes('wakeWord'))).toBe(true);
  });

  it('rejects wakeWord.enabled that is not boolean', () => {
    const r = validateSpeechProfile({ wakeWord: { enabled: 'yes', phrase: 'Hey J', sensitivity: 0.8 } });
    expect(r.valid).toBe(false);
    expect(r.errors?.some((e) => e.includes('wakeWord.enabled'))).toBe(true);
  });

  it('rejects wakeWord.phrase shorter than 2 chars', () => {
    const r = validateSpeechProfile({ wakeWord: { enabled: false, phrase: 'A', sensitivity: 0.75 } });
    expect(r.valid).toBe(false);
    expect(r.errors?.some((e) => e.includes('wakeWord.phrase'))).toBe(true);
  });

  it('accepts wakeWord.phrase of exactly 2 chars', () => {
    const r = validateSpeechProfile({ wakeWord: { enabled: false, phrase: 'HJ', sensitivity: 0.75 } });
    expect(r.valid).toBe(true);
  });

  it('rejects wakeWord.sensitivity outside 0-1', () => {
    expect(
      validateSpeechProfile({ wakeWord: { enabled: false, phrase: 'Hey J', sensitivity: 1.5 } }).valid,
    ).toBe(false);
    expect(
      validateSpeechProfile({ wakeWord: { enabled: false, phrase: 'Hey J', sensitivity: -0.1 } }).valid,
    ).toBe(false);
  });

  it('accepts wakeWord.sensitivity at boundaries 0 and 1', () => {
    expect(
      validateSpeechProfile({ wakeWord: { enabled: false, phrase: 'Hey J', sensitivity: 0 } }).valid,
    ).toBe(true);
    expect(
      validateSpeechProfile({ wakeWord: { enabled: false, phrase: 'Hey J', sensitivity: 1 } }).valid,
    ).toBe(true);
  });
});
