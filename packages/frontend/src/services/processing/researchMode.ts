/**
 * Research Mode Service
 *
 * Conducts multi-step research with progressive summarization.
 * Minimizes tokens by:
 * - Fetching only snippets from search results (not full pages)
 * - Summarizing each source independently with small prompts
 * - Merging summaries via pyramid reduction
 * - Caching findings to avoid re-fetching
 * - Stopping when token budget is exhausted
 */
import {
  type TokenBudget,
  createBudget,
  canAfford,
  spend,
  estimateTokens,
  compress,
  pyramidReduce,
  PROMPTS,
} from './tokenEngine.js';

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  summary?: string;
}

export interface ResearchSession {
  id: string;
  topic: string;
  status: 'idle' | 'searching' | 'processing' | 'summarizing' | 'complete' | 'paused';
  sources: ResearchSource[];
  findings: string[];
  finalSummary: string;
  budget: TokenBudget;
  startedAt: number;
  completedAt?: number;
}

export type ResearchDepth = 'quick' | 'standard' | 'deep';

interface ResearchConfig {
  depth: ResearchDepth;
  maxSources: number;
  budget: TokenBudget;
}

const DEPTH_CONFIG: Record<ResearchDepth, { maxSources: number; maxPerCall: number; maxTotal: number }> = {
  quick: { maxSources: 3, maxPerCall: 500, maxTotal: 2000 },
  standard: { maxSources: 6, maxPerCall: 800, maxTotal: 5000 },
  deep: { maxSources: 10, maxPerCall: 1200, maxTotal: 10000 },
};

/**
 * Create a research session configuration.
 */
export function createResearchConfig(depth: ResearchDepth): ResearchConfig {
  const cfg = DEPTH_CONFIG[depth];
  return {
    depth,
    maxSources: cfg.maxSources,
    budget: createBudget(cfg.maxPerCall, cfg.maxTotal),
  };
}

/**
 * Create a new research session.
 */
export function createResearchSession(topic: string, depth: ResearchDepth = 'standard'): ResearchSession {
  const cfg = DEPTH_CONFIG[depth];
  return {
    id: `research-${Date.now()}`,
    topic,
    status: 'idle',
    sources: [],
    findings: [],
    finalSummary: '',
    budget: createBudget(cfg.maxPerCall, cfg.maxTotal),
    startedAt: Date.now(),
  };
}

/**
 * Process search results into the research session.
 * Only keeps snippets (not full page content) to save tokens.
 */
export function ingestSearchResults(
  session: ResearchSession,
  results: Array<{ title: string; url: string; snippet: string }>,
  maxSources: number,
): ResearchSession {
  const newSources: ResearchSource[] = results
    .slice(0, maxSources)
    .map((r) => ({
      title: r.title,
      url: r.url,
      snippet: compress(r.snippet).slice(0, 500), // Cap snippet length
    }));

  return {
    ...session,
    sources: [...session.sources, ...newSources],
    status: 'processing',
  };
}

/**
 * Generate prompts for summarizing sources.
 * Returns an array of {prompt, estimatedTokens} pairs.
 * The caller sends these to the LLM one at a time, staying within budget.
 */
export function generateSourcePrompts(session: ResearchSession): Array<{
  sourceIndex: number;
  prompt: string;
  estimatedTokens: number;
}> {
  return session.sources
    .filter((s) => !s.summary)
    .map((source, i) => {
      const prompt = PROMPTS.summarizeChunk(
        `Source: ${source.title}\nURL: ${source.url}\n\n${source.snippet}`,
      );
      return {
        sourceIndex: i,
        prompt,
        estimatedTokens: estimateTokens(prompt) + 150, // response estimate
      };
    });
}

/**
 * Record a source summary from the LLM.
 */
export function recordSourceSummary(
  session: ResearchSession,
  sourceIndex: number,
  summary: string,
  tokensUsed: number,
): ResearchSession {
  const sources = [...session.sources];
  if (sources[sourceIndex]) {
    sources[sourceIndex] = { ...sources[sourceIndex], summary };
  }
  return {
    ...session,
    sources,
    findings: [...session.findings, summary],
    budget: spend(session.budget, tokensUsed),
  };
}

/**
 * Generate the final merge prompt from all findings.
 * Uses pyramid reduction if there are many findings.
 */
export function generateMergePrompt(session: ResearchSession): {
  prompt: string;
  estimatedTokens: number;
  canProceed: boolean;
} {
  let summaries = session.findings.filter(Boolean);

  // Pyramid reduce if too many
  while (summaries.length > 3) {
    summaries = pyramidReduce(summaries, 3);
  }

  const combined = summaries.join('\n\n---\n\n');
  const prompt = `Topic: ${session.topic}\n\n${PROMPTS.mergeSummaries(combined)}`;
  const est = estimateTokens(prompt) + 300;

  return {
    prompt,
    estimatedTokens: est,
    canProceed: canAfford(session.budget, est),
  };
}

/**
 * Finalize the research session with the merged summary.
 */
export function finalizeResearch(session: ResearchSession, finalSummary: string, tokensUsed: number): ResearchSession {
  return {
    ...session,
    finalSummary,
    status: 'complete',
    budget: spend(session.budget, tokensUsed),
    completedAt: Date.now(),
  };
}

/**
 * Get a token usage report for the session.
 */
export function getUsageReport(session: ResearchSession): {
  tokensUsed: number;
  budgetTotal: number;
  percentUsed: number;
  sourcesProcessed: number;
  totalSources: number;
} {
  return {
    tokensUsed: session.budget.used,
    budgetTotal: session.budget.maxTotal,
    percentUsed: Math.round((session.budget.used / session.budget.maxTotal) * 100),
    sourcesProcessed: session.sources.filter((s) => s.summary).length,
    totalSources: session.sources.length,
  };
}
