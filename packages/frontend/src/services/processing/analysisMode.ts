/**
 * Analysis Mode Service
 *
 * Analyzes documents, data, or content with token-efficient processing.
 * Minimizes tokens by:
 * - Pre-filtering content with keyword extraction (no LLM needed)
 * - Chunking large documents and only sending relevant chunks
 * - Using structured output formats (JSON) for compact responses
 * - Caching partial analyses to avoid reprocessing
 * - Supporting incremental analysis (add more data without restarting)
 */
import {
  type TokenBudget,
  type ProcessingChunk,
  createBudget,
  canAfford,
  spend,
  estimateTokens,
  compress,
  chunkText,
  extractKeyContent,
  PROMPTS,
} from './tokenEngine.js';

export type AnalysisType = 'summarize' | 'compare' | 'extract' | 'sentiment' | 'categorize' | 'custom';
export type AnalysisDepth = 'skim' | 'standard' | 'thorough';

export interface AnalysisInput {
  id: string;
  label: string;
  content: string;
  type: 'text' | 'url' | 'file' | 'data';
}

export interface AnalysisSession {
  id: string;
  type: AnalysisType;
  question: string;
  status: 'idle' | 'preprocessing' | 'analyzing' | 'synthesizing' | 'complete' | 'paused';
  inputs: AnalysisInput[];
  chunks: ProcessingChunk[];
  partialResults: string[];
  finalResult: string;
  budget: TokenBudget;
  metadata: {
    startedAt: number;
    completedAt?: number;
    skippedChunks: number;
    totalInputTokens: number;
    processedInputTokens: number;
  };
}

const DEPTH_CONFIG: Record<AnalysisDepth, { maxPerCall: number; maxTotal: number; chunkSize: number; relevanceThreshold: number }> = {
  skim: { maxPerCall: 400, maxTotal: 1500, chunkSize: 600, relevanceThreshold: 0.3 },
  standard: { maxPerCall: 800, maxTotal: 4000, chunkSize: 800, relevanceThreshold: 0.2 },
  thorough: { maxPerCall: 1500, maxTotal: 8000, chunkSize: 1200, relevanceThreshold: 0.1 },
};

/**
 * Create a new analysis session.
 */
export function createAnalysisSession(
  type: AnalysisType,
  question: string,
  depth: AnalysisDepth = 'standard',
): AnalysisSession {
  const cfg = DEPTH_CONFIG[depth];
  return {
    id: `analysis-${Date.now()}`,
    type,
    question,
    status: 'idle',
    inputs: [],
    chunks: [],
    partialResults: [],
    finalResult: '',
    budget: createBudget(cfg.maxPerCall, cfg.maxTotal),
    metadata: {
      startedAt: Date.now(),
      skippedChunks: 0,
      totalInputTokens: 0,
      processedInputTokens: 0,
    },
  };
}

/**
 * Add input to the analysis session and preprocess it.
 * Preprocessing extracts key content WITHOUT using the LLM (zero token cost).
 */
export function addInput(
  session: AnalysisSession,
  input: AnalysisInput,
  depth: AnalysisDepth = 'standard',
): AnalysisSession {
  const cfg = DEPTH_CONFIG[depth];
  const keywords = extractKeywords(session.question);

  // Pre-filter: extract only relevant content (free — no LLM)
  const relevantContent = extractKeyContent(compress(input.content), keywords);
  const totalInputTokens = estimateTokens(input.content);

  // Chunk the relevant content
  const newChunks = chunkText(relevantContent, cfg.chunkSize);

  // Score chunks by relevance (free — keyword matching)
  const scoredChunks = newChunks.map((chunk) => ({
    ...chunk,
    relevance: scoreRelevance(chunk.content, keywords),
  }));

  // Only keep chunks above relevance threshold
  const keptChunks = scoredChunks.filter((c) => c.relevance >= cfg.relevanceThreshold);
  const skipped = scoredChunks.length - keptChunks.length;

  return {
    ...session,
    inputs: [...session.inputs, input],
    chunks: [...session.chunks, ...keptChunks],
    status: 'preprocessing',
    metadata: {
      ...session.metadata,
      skippedChunks: session.metadata.skippedChunks + skipped,
      totalInputTokens: session.metadata.totalInputTokens + totalInputTokens,
      processedInputTokens:
        session.metadata.processedInputTokens + keptChunks.reduce((sum, c) => sum + c.estimatedTokens, 0),
    },
  };
}

/**
 * Generate analysis prompts for unprocessed chunks.
 * Returns prompts ordered by relevance (most relevant first).
 */
export function generateAnalysisPrompts(session: AnalysisSession): Array<{
  chunkId: string;
  prompt: string;
  estimatedTokens: number;
}> {
  const unprocessed = session.chunks
    .filter((c) => !c.processed)
    .sort((a, b) => (b as unknown as { relevance: number }).relevance - (a as unknown as { relevance: number }).relevance);

  return unprocessed.map((chunk) => {
    const prompt = buildAnalysisPrompt(session.type, session.question, chunk.content);
    return {
      chunkId: chunk.id,
      prompt,
      estimatedTokens: estimateTokens(prompt) + 200,
    };
  });
}

/**
 * Record analysis result for a chunk.
 */
export function recordChunkResult(
  session: AnalysisSession,
  chunkId: string,
  result: string,
  tokensUsed: number,
): AnalysisSession {
  const chunks = session.chunks.map((c) =>
    c.id === chunkId ? { ...c, processed: true, summary: result } : c,
  );

  return {
    ...session,
    chunks,
    partialResults: [...session.partialResults, result],
    budget: spend(session.budget, tokensUsed),
  };
}

/**
 * Check if we should stop processing (budget exhausted or all done).
 */
export function shouldStop(session: AnalysisSession): { stop: boolean; reason: string } {
  const unprocessed = session.chunks.filter((c) => !c.processed);

  if (unprocessed.length === 0) {
    return { stop: true, reason: 'All chunks processed' };
  }

  const nextEstimate = estimateTokens(
    buildAnalysisPrompt(session.type, session.question, unprocessed[0].content),
  ) + 200;

  if (!canAfford(session.budget, nextEstimate)) {
    return { stop: true, reason: 'Token budget exhausted' };
  }

  return { stop: false, reason: '' };
}

/**
 * Generate the synthesis prompt to combine partial results.
 */
export function generateSynthesisPrompt(session: AnalysisSession): {
  prompt: string;
  estimatedTokens: number;
  canProceed: boolean;
} {
  const results = session.partialResults.filter(Boolean);
  const combined = results.join('\n\n');

  let prompt: string;
  switch (session.type) {
    case 'compare':
      prompt = `Compare these findings. Question: ${session.question}\n\nFindings:\n${combined}\n\nProvide a structured comparison.`;
      break;
    case 'sentiment':
      prompt = `Based on these analyses, provide overall sentiment. Question: ${session.question}\n\n${combined}`;
      break;
    case 'extract':
      prompt = `Consolidate extracted items. Remove duplicates:\n\n${combined}`;
      break;
    default:
      prompt = PROMPTS.analyzeData(combined, session.question);
  }

  const est = estimateTokens(prompt) + 300;
  return {
    prompt,
    estimatedTokens: est,
    canProceed: canAfford(session.budget, est),
  };
}

/**
 * Finalize the analysis session.
 */
export function finalizeAnalysis(session: AnalysisSession, finalResult: string, tokensUsed: number): AnalysisSession {
  return {
    ...session,
    finalResult,
    status: 'complete',
    budget: spend(session.budget, tokensUsed),
    metadata: {
      ...session.metadata,
      completedAt: Date.now(),
    },
  };
}

/**
 * Get efficiency report.
 */
export function getEfficiencyReport(session: AnalysisSession): {
  tokensUsed: number;
  budgetTotal: number;
  percentUsed: number;
  compressionRatio: number;
  chunksProcessed: number;
  chunksSkipped: number;
  inputTokensSaved: number;
} {
  const processed = session.chunks.filter((c) => c.processed).length;
  const saved = session.metadata.totalInputTokens - session.metadata.processedInputTokens;

  return {
    tokensUsed: session.budget.used,
    budgetTotal: session.budget.maxTotal,
    percentUsed: Math.round((session.budget.used / session.budget.maxTotal) * 100),
    compressionRatio: session.metadata.totalInputTokens > 0
      ? Math.round((1 - session.metadata.processedInputTokens / session.metadata.totalInputTokens) * 100)
      : 0,
    chunksProcessed: processed,
    chunksSkipped: session.metadata.skippedChunks,
    inputTokensSaved: saved,
  };
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function extractKeywords(question: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'about', 'as', 'into', 'through', 'during', 'before', 'after',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'am', 'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
    'how', 'why', 'when', 'where', 'me', 'i', 'you', 'we', 'they',
  ]);

  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function scoreRelevance(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 1;
  const lower = content.toLowerCase();
  const matches = keywords.filter((kw) => lower.includes(kw));
  return matches.length / keywords.length;
}

function buildAnalysisPrompt(type: AnalysisType, question: string, content: string): string {
  switch (type) {
    case 'summarize':
      return `Q: ${question}\nContent:\n${content}\n\nSummarize relevant points in 2-3 sentences.`;
    case 'compare':
      return `Q: ${question}\nContent:\n${content}\n\nList key points for comparison. Be concise.`;
    case 'extract':
      return PROMPTS.extractFacts(content);
    case 'sentiment':
      return `Analyze sentiment of this content regarding "${question}":\n${content}\n\nRate: positive/negative/neutral + brief reason.`;
    case 'categorize':
      return `Q: ${question}\nContent:\n${content}\n\nCategorize this content. Respond as JSON: {"category": "", "confidence": 0.0, "reason": ""}`;
    case 'custom':
      return PROMPTS.analyzeData(content, question);
    default:
      return PROMPTS.analyzeData(content, question);
  }
}
