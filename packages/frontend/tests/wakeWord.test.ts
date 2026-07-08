import { describe, it, expect } from 'vitest';

// Test the fuzzy matching logic in WakeWordDetector by importing
// and exercising just the similarity/matching behaviour through
// the exported class (methods are private but we can test via
// the public 'detected' callback with a mock SpeechRecognition).
// Since SpeechRecognition is browser-only, we test the pure
// matching logic extracted into a helper.

// --- Inline the matching logic for unit-testing purposes ---

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) =>
    Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return 1 - matrix[b.length][a.length] / Math.max(a.length, b.length);
}

function matchesPhrase(transcript: string, phrase: string, sensitivity = 0.75): boolean {
  const target = phrase.toLowerCase().trim();
  const input  = transcript.toLowerCase().trim();

  if (input.includes(target)) return true;

  const targetTokens     = target.split(/\s+/);
  const transcriptTokens = input.split(/\s+/);
  const matched = targetTokens.filter((t) =>
    transcriptTokens.some((tt) => tt.length > 0 && (tt.startsWith(t) || t.startsWith(tt))),
  );
  if (matched.length / targetTokens.length >= sensitivity) return true;

  const targetLen  = target.length;
  const windowSize = Math.ceil(targetLen * 1.4);
  let bestSim = 0;
  for (let start = 0; start <= input.length - Math.floor(targetLen * 0.5); start++) {
    const win = input.slice(start, start + windowSize);
    const s   = similarity(target, win);
    if (s > bestSim) bestSim = s;
  }
  return bestSim >= sensitivity;
}

// --- Tests ---

describe('WakeWord fuzzy matching — exact and substring', () => {
  it('matches exact phrase', () => {
    expect(matchesPhrase('hey j', 'Hey J')).toBe(true);
  });

  it('matches phrase embedded in longer transcript', () => {
    expect(matchesPhrase('ok so hey j what time is it', 'Hey J')).toBe(true);
  });

  it('rejects clearly different text', () => {
    expect(matchesPhrase('turn on the lights', 'Hey J', 0.9)).toBe(false);
  });

  it('does not false-positive on empty input', () => {
    expect(matchesPhrase('', 'Hey J')).toBe(false);
  });
});

describe('WakeWord fuzzy matching — token overlap', () => {
  it('matches when only first token heard ("hey")', () => {
    // sensitivity 0.4 = accept if 40% of target tokens matched
    expect(matchesPhrase('hey', 'Hey J', 0.4)).toBe(true);
  });

  it('rejects if no tokens overlap at strict sensitivity', () => {
    expect(matchesPhrase('hello world', 'Hey J', 0.9)).toBe(false);
  });
});

describe('WakeWord fuzzy matching — levenshtein similarity', () => {
  it('accepts "hey jay" for "hey j" at balanced sensitivity', () => {
    expect(matchesPhrase('hey jay', 'Hey J', 0.6)).toBe(true);
  });

  it('accepts "hey jee" for "hey j" at relaxed sensitivity', () => {
    expect(matchesPhrase('hey jee', 'Hey J', 0.5)).toBe(true);
  });

  it('respects strict sensitivity (1.0) — no fuzzy matches', () => {
    // 'hey wow' does not contain 'hey j' as a substring and
    // cannot reach similarity 1.0 through any strategy
    expect(matchesPhrase('hey wow', 'Hey J', 1.0)).toBe(false);
  });
});

describe('WakeWord fuzzy matching — custom phrases', () => {
  it('matches custom phrase "Go time"', () => {
    expect(matchesPhrase('go time', 'Go time')).toBe(true);
  });

  it('matches custom phrase "Hey J.A.R.G.I.I.N."', () => {
    expect(matchesPhrase('hey jargiin activate', 'Hey J.A.R.G.I.I.N.')).toBe(true);
  });

  it('matches two-character minimum phrase', () => {
    expect(matchesPhrase('hj start', 'HJ')).toBe(true);
  });
});

describe('Levenshtein similarity helper', () => {
  it('identical strings score 1', () => {
    expect(similarity('hello', 'hello')).toBe(1);
  });

  it('completely different strings score < 0.5', () => {
    expect(similarity('abc', 'xyz')).toBeLessThan(0.5);
  });

  it('one character difference scores high', () => {
    expect(similarity('hej', 'hey')).toBeGreaterThan(0.6);
  });

  it('empty string scores 0 against non-empty', () => {
    expect(similarity('', 'hey')).toBe(0);
  });
});
