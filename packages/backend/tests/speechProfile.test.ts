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
  });

  it('returns independent copies — mutation does not affect the module', () => {
    const a = getDefaultSpeechProfile();
    const b = getDefaultSpeechProfile();
    a.preferredName = 'Andre';
    expect(b.preferredName).toBe('User');
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
