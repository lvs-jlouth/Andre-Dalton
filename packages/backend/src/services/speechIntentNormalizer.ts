import type { ClarificationMode, SpeechProfile, SpeechSubstitution } from './speechProfile.js';

export interface SpeechIntentNormalizationResult {
  rawPartials: string[];
  rawTranscript: string;
  normalizedIntent: string;
  confidence: number;
  clarificationPrompt?: string;
}

export interface SpeechIntentNormalizerConfig {
  substitutions: SpeechSubstitution[];
  commandAliases: Record<string, string>;
  confirmationThreshold: number;
  clarificationMode: ClarificationMode;
}

const DEFAULT_CONFIG: SpeechIntentNormalizerConfig = {
  substitutions: [],
  commandAliases: {},
  confirmationThreshold: 0.6,
  clarificationMode: 'moderate',
};

const FILLER_WORDS = new Set(['uh', 'um', 'er', 'ah', 'hmm', 'mm']);
const CORRECTION_MARKERS = ['i mean', 'sorry', 'actually', 'no wait', 'rather'];

export class SpeechIntentNormalizer {
  private readonly config: SpeechIntentNormalizerConfig;

  constructor(profile?: Partial<Pick<SpeechProfile, 'substitutions' | 'commandAliases' | 'confirmationThreshold' | 'clarificationMode'>>) {
    this.config = {
      substitutions: profile?.substitutions ?? DEFAULT_CONFIG.substitutions,
      commandAliases: profile?.commandAliases ?? DEFAULT_CONFIG.commandAliases,
      confirmationThreshold: profile?.confirmationThreshold ?? DEFAULT_CONFIG.confirmationThreshold,
      clarificationMode: profile?.clarificationMode ?? DEFAULT_CONFIG.clarificationMode,
    };
  }

  normalize(rawPartials: string[]): SpeechIntentNormalizationResult {
    const safePartials = rawPartials.map((partial) => partial ?? '');
    const rawTranscript = safePartials.join(' ').replace(/\s+/g, ' ').trim();

    const assembled = this.assemblePartials(safePartials);
    const withoutFillers = removeFillers(assembled);
    const corrected = extractCorrection(withoutFillers.text);
    const substituted = applySubstitutions(corrected.text, this.config.substitutions);
    const aliasApplied = applyAlias(substituted, this.config.commandAliases);
    const deduped = collapseRepeatedWords(aliasApplied);

    const normalizedIntent = normalizeSpacing(deduped).toLowerCase();
    const confidence = scoreConfidence({
      normalizedIntent,
      hadPause: safePartials.some((partial) => partial.trim().length === 0),
      hadMergedBranches: assembled.hadMergedBranches,
      fillerRemovals: withoutFillers.removedCount,
      usedCorrection: corrected.usedCorrection,
      repeatedFragmentsCollapsed: deduped !== aliasApplied,
    }, this.config.confirmationThreshold);

    return {
      rawPartials: [...safePartials],
      rawTranscript,
      normalizedIntent,
      confidence,
      clarificationPrompt: buildClarificationPrompt(
        normalizedIntent,
        confidence,
        this.config.confirmationThreshold,
        this.config.clarificationMode,
      ),
    };
  }

  private assemblePartials(rawPartials: string[]): { text: string; hadMergedBranches: boolean } {
    let current = '';
    let hadMergedBranches = false;

    for (const partial of rawPartials) {
      const cleaned = normalizeSpacing(partial);
      if (!cleaned) continue;

      if (!current) {
        current = cleaned;
        continue;
      }

      const currentComparable = comparable(current);
      const cleanedComparable = comparable(cleaned);

      if (!cleanedComparable || cleanedComparable === currentComparable) {
        continue;
      }

      if (cleanedComparable.startsWith(currentComparable)) {
        current = cleaned;
        continue;
      }

      if (currentComparable.startsWith(cleanedComparable)) {
        continue;
      }

      const merged = mergeByOverlap(current, cleaned);
      hadMergedBranches = hadMergedBranches || merged.hadMergedBranches;
      current = merged.text;
    }

    return { text: current, hadMergedBranches };
  }
}

function normalizeSpacing(input: string): string {
  return input
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparable(input: string): string {
  return normalizeSpacing(input).toLowerCase();
}

function mergeByOverlap(base: string, next: string): { text: string; hadMergedBranches: boolean } {
  const baseWords = normalizeSpacing(base).split(' ').filter(Boolean);
  const nextWords = normalizeSpacing(next).split(' ').filter(Boolean);
  const maxOverlap = Math.min(baseWords.length, nextWords.length);

  for (let size = maxOverlap; size >= 1; size--) {
    const baseSuffix = baseWords.slice(-size).join(' ').toLowerCase();
    const nextPrefix = nextWords.slice(0, size).join(' ').toLowerCase();
    if (baseSuffix === nextPrefix) {
      return {
        text: [...baseWords, ...nextWords.slice(size)].join(' '),
        hadMergedBranches: true,
      };
    }
  }

  return {
    text: [...baseWords, ...nextWords].join(' '),
    hadMergedBranches: true,
  };
}

function removeFillers(input: string): { text: string; removedCount: number } {
  const words = normalizeSpacing(input).split(' ').filter(Boolean);
  const keptWords: string[] = [];
  let removedCount = 0;

  for (const word of words) {
    if (FILLER_WORDS.has(word.toLowerCase())) {
      removedCount += 1;
      continue;
    }
    keptWords.push(word);
  }

  return {
    text: keptWords.join(' '),
    removedCount,
  };
}

function extractCorrection(input: string): { text: string; usedCorrection: boolean } {
  const comparableInput = comparable(input);

  for (const marker of CORRECTION_MARKERS) {
    const index = comparableInput.lastIndexOf(marker);
    if (index > 0) {
      const before = normalizeSpacing(input.slice(0, index));
      const after = normalizeSpacing(input.slice(index + marker.length));
      if (before.split(' ').filter(Boolean).length >= 1 && after.split(' ').filter(Boolean).length >= 2) {
        return { text: after, usedCorrection: true };
      }
    }
  }

  const tokens = normalizeSpacing(input).split(' ').filter(Boolean);
  for (let i = 1; i < tokens.length - 1; i++) {
    if (tokens[i].toLowerCase() === 'no') {
      const before = tokens.slice(0, i);
      const after = tokens.slice(i + 1);
      if (before.length >= 1 && after.length >= 2) {
        return { text: after.join(' '), usedCorrection: true };
      }
    }
  }

  return { text: normalizeSpacing(input), usedCorrection: false };
}

function applySubstitutions(input: string, substitutions: SpeechSubstitution[]): string {
  return substitutions.reduce((result, substitution) => {
    const heard = escapeRegExp(substitution.heard.trim());
    if (!heard) return result;
    return result.replace(new RegExp(`\\b${heard}\\b`, 'gi'), substitution.intended.trim());
  }, input);
}

function applyAlias(input: string, aliases: Record<string, string>): string {
  const normalized = comparable(input);
  for (const [heard, intended] of Object.entries(aliases)) {
    if (normalized === comparable(heard)) {
      return intended.trim();
    }
  }
  return input;
}

function collapseRepeatedWords(input: string): string {
  let words = normalizeSpacing(input).split(' ').filter(Boolean);
  if (words.length === 0) return '';

  const collapsedSingles: string[] = [];
  for (const word of words) {
    if (collapsedSingles.at(-1)?.toLowerCase() === word.toLowerCase()) {
      continue;
    }
    collapsedSingles.push(word);
  }

  words = collapsedSingles;

  const collapsedPhrases: string[] = [];
  for (let index = 0; index < words.length; index++) {
    const nextPair = words.slice(index, index + 2).join(' ').toLowerCase();
    const followingPair = words.slice(index + 2, index + 4).join(' ').toLowerCase();
    if (index + 3 < words.length && nextPair === followingPair) {
      collapsedPhrases.push(words[index], words[index + 1]);
      index += 3;
      continue;
    }
    collapsedPhrases.push(words[index]);
  }

  return collapsedPhrases.join(' ');
}

function scoreConfidence(
  signals: {
    normalizedIntent: string;
    hadPause: boolean;
    hadMergedBranches: boolean;
    fillerRemovals: number;
    usedCorrection: boolean;
    repeatedFragmentsCollapsed: boolean;
  },
  confirmationThreshold: number,
): number {
  if (!signals.normalizedIntent) return 0;

  let confidence = 0.92;

  if (signals.hadPause) confidence -= 0.08;
  if (signals.hadMergedBranches) confidence -= 0.08;
  if (signals.fillerRemovals > 0) confidence -= Math.min(0.1, signals.fillerRemovals * 0.03);
  if (signals.usedCorrection) confidence -= 0.18;
  if (signals.repeatedFragmentsCollapsed) confidence -= 0.08;
  if (signals.normalizedIntent.split(' ').length <= 2) confidence -= 0.06;

  if (signals.usedCorrection && confidence <= confirmationThreshold + 0.1) {
    confidence = Math.min(confidence, confirmationThreshold - 0.02);
  }

  return Math.max(0, Math.min(0.99, Number(confidence.toFixed(2))));
}

function buildClarificationPrompt(
  normalizedIntent: string,
  confidence: number,
  confirmationThreshold: number,
  clarificationMode: ClarificationMode,
): string | undefined {
  if (!normalizedIntent) {
    return 'I’m not sure what you meant. Could you say that again?';
  }

  if (confidence >= confirmationThreshold) {
    return undefined;
  }

  if (clarificationMode === 'relaxed') {
    return `I heard "${normalizedIntent}". Want me to use that?`;
  }

  if (clarificationMode === 'aggressive') {
    return `Please confirm: "${normalizedIntent}".`;
  }

  return `Did you mean: "${normalizedIntent}"?`;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
