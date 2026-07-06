import { describe, expect, it } from 'vitest';
import { SpeechIntentNormalizer } from '../src/services/speechIntentNormalizer.js';

describe('SpeechIntentNormalizer', () => {
  it('preserves the raw transcript while normalizing a dysfluent utterance', () => {
    const normalizer = new SpeechIntentNormalizer({
      substitutions: [{ heard: 'lytes', intended: 'lights' }],
    });

    const result = normalizer.normalize(['um uh turn on the lytes']);

    expect(result.rawPartials).toEqual(['um uh turn on the lytes']);
    expect(result.rawTranscript).toBe('um uh turn on the lytes');
    expect(result.normalizedIntent).toBe('turn on the lights');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.clarificationPrompt).toBeUndefined();
  });

  it('collapses repeated fragments from partial transcripts', () => {
    const normalizer = new SpeechIntentNormalizer();

    const result = normalizer.normalize([
      'turn',
      'turn on',
      'turn on the',
      'turn on the lights',
      'turn on the lights',
    ]);

    expect(result.normalizedIntent).toBe('turn on the lights');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.clarificationPrompt).toBeUndefined();
  });

  it('handles interrupted utterances with pauses without losing intent', () => {
    const normalizer = new SpeechIntentNormalizer();

    const result = normalizer.normalize(['turn on', '', 'the kitchen lights']);

    expect(result.rawPartials).toEqual(['turn on', '', 'the kitchen lights']);
    expect(result.normalizedIntent).toBe('turn on the kitchen lights');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('prefers the corrected utterance and asks for confirmation when confidence drops', () => {
    const normalizer = new SpeechIntentNormalizer();

    const result = normalizer.normalize([
      'turn on the bedroom light',
      'no turn off the bedroom light',
    ]);

    expect(result.normalizedIntent).toBe('turn off the bedroom light');
    expect(result.confidence).toBeLessThan(0.6);
    expect(result.clarificationPrompt).toBe('Did you mean: "turn off the bedroom light"?');
  });

  it('applies command aliases after normalization', () => {
    const normalizer = new SpeechIntentNormalizer({
      commandAliases: {
        bedtime: 'turn off all lights and lock the doors',
      },
    });

    const result = normalizer.normalize(['uh bedtime']);

    expect(result.normalizedIntent).toBe('turn off all lights and lock the doors');
  });

  it('asks for clarification instead of over-normalizing an empty or filler-only input', () => {
    const normalizer = new SpeechIntentNormalizer();

    const result = normalizer.normalize(['um', 'uh']);

    expect(result.normalizedIntent).toBe('');
    expect(result.confidence).toBe(0);
    expect(result.clarificationPrompt).toBe('I’m not sure what you meant. Could you say that again?');
  });
});
