/**
 * Token-Efficient Processing Engine
 *
 * Provides chunked, progressive summarization to minimize token usage
 * during research and analysis operations. Instead of sending entire
 * documents to the LLM, this engine:
 *
 * 1. Chunks input into small pieces
 * 2. Summarizes each chunk independently (small context window)
 * 3. Merges summaries progressively (pyramid reduction)
 * 4. Caches intermediate results to avoid re-processing
 * 5. Tracks token budgets and stops when limits are hit
 */

export interface TokenBudget {
  /** Max tokens per individual LLM call */
  maxPerCall: number;
  /** Max total tokens for the entire operation */
  maxTotal: number;
  /** Tokens used so far */
  used: number;
}

export interface ProcessingChunk {
  id: string;
  content: string;
  /** Estimated token count (chars / 4 approximation) */
  estimatedTokens: number;
  /** Whether this chunk has been processed */
  processed: boolean;
  /** Summary after processing */
  summary?: string;
}

export interface ProcessingResult {
  /** Final consolidated output */
  output: string;
  /** How many tokens were used */
  tokensUsed: number;
  /** How many chunks were processed */
  chunksProcessed: number;
  /** Whether the budget was exhausted */
  budgetExhausted: boolean;
  /** Intermediate summaries (for transparency) */
  intermediates: string[];
}

// ─── Token Estimation ───────────────────────────────────────────────────────

/** Estimate token count from text (approx 4 chars per token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Estimate tokens for a structured prompt */
export function estimatePromptTokens(systemPrompt: string, userContent: string): number {
  return estimateTokens(systemPrompt) + estimateTokens(userContent) + 50;
}

// ─── Chunking ───────────────────────────────────────────────────────────────

/**
 * Split text into chunks that fit within a token budget per call.
 * Splits on paragraph boundaries first, then sentences, then hard splits.
 */
export function chunkText(text: string, maxTokensPerChunk: number): ProcessingChunk[] {
  const maxChars = maxTokensPerChunk * 4;
  const paragraphs = text.split(/\n\n+/);
  const chunks: ProcessingChunk[] = [];
  let current = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChars) {
      if (current.length > 0) {
        chunks.push(createChunk(current, chunkIndex++));
        current = '';
      }
      if (para.length > maxChars) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
        for (const sentence of sentences) {
          if (current.length + sentence.length > maxChars) {
            if (current.length > 0) {
              chunks.push(createChunk(current, chunkIndex++));
              current = '';
            }
            if (sentence.length > maxChars) {
              for (let i = 0; i < sentence.length; i += maxChars) {
                chunks.push(createChunk(sentence.slice(i, i + maxChars), chunkIndex++));
              }
            } else {
              current = sentence;
            }
          } else {
            current += sentence;
          }
        }
      } else {
        current = para;
      }
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current.length > 0) {
    chunks.push(createChunk(current, chunkIndex++));
  }

  return chunks;
}

function createChunk(content: string, index: number): ProcessingChunk {
  return {
    id: `chunk-${index}`,
    content: content.trim(),
    estimatedTokens: estimateTokens(content),
    processed: false,
  };
}

// ─── Progressive Summarization ──────────────────────────────────────────────

/**
 * Merge multiple summaries into groups for pyramid reduction.
 */
export function pyramidReduce(summaries: string[], maxGroupSize = 3): string[] {
  if (summaries.length <= maxGroupSize) {
    return summaries;
  }

  const groups: string[][] = [];
  for (let i = 0; i < summaries.length; i += maxGroupSize) {
    groups.push(summaries.slice(i, i + maxGroupSize));
  }

  return groups.map((group) => group.join('\n---\n'));
}

// ─── Budget Tracking ────────────────────────────────────────────────────────

export function createBudget(maxPerCall: number, maxTotal: number): TokenBudget {
  return { maxPerCall, maxTotal, used: 0 };
}

export function canAfford(budget: TokenBudget, estimatedTokens: number): boolean {
  return budget.used + estimatedTokens <= budget.maxTotal;
}

export function spend(budget: TokenBudget, tokens: number): TokenBudget {
  return { ...budget, used: budget.used + tokens };
}

// ─── Compression Utilities ──────────────────────────────────────────────────

/** Strip redundant whitespace to reduce token count */
export function compress(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+$/gm, '')
    .trim();
}

/** Extract key sentences (first/last of each paragraph + keyword matches) */
export function extractKeyContent(text: string, keywords: string[] = []): string {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const keyParts: string[] = [];

  for (const para of paragraphs) {
    const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
    if (sentences.length <= 2) {
      keyParts.push(para);
    } else {
      const kept = new Set<number>([0, sentences.length - 1]);
      for (let i = 0; i < sentences.length; i++) {
        if (keywords.some((kw) => sentences[i].toLowerCase().includes(kw.toLowerCase()))) {
          kept.add(i);
        }
      }
      keyParts.push(
        [...kept].sort((a, b) => a - b).map((i) => sentences[i]).join(' '),
      );
    }
  }

  return keyParts.join('\n\n');
}

// ─── Prompt Templates (minimal to save tokens) ─────────────────────────────

export const PROMPTS = {
  summarizeChunk: (content: string) =>
    `Summarize in 2-3 sentences. Keep facts, numbers, names:\n\n${content}`,

  mergeSummaries: (summaries: string) =>
    `Consolidate these summaries into one coherent paragraph. No redundancy:\n\n${summaries}`,

  researchQuery: (topic: string, context: string) =>
    `Research topic: ${topic}\nContext so far: ${context}\nProvide key findings in bullet points.`,

  analyzeData: (data: string, question: string) =>
    `Data:\n${data}\n\nQuestion: ${question}\nAnswer concisely with evidence.`,

  extractFacts: (content: string) =>
    `Extract key facts as a JSON array of strings. Max 10 items:\n\n${content}`,
} as const;
