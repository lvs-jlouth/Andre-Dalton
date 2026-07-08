/**
 * ResearchAnalysisPanel — UI for research and analysis modes.
 * Shows mode selection, progress, token budget, and results.
 */
import { useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { useProcessingStore } from '../../store/processingStore.js';
import { type ResearchDepth } from '../../services/processing/researchMode.js';
import { type AnalysisType, type AnalysisDepth } from '../../services/processing/analysisMode.js';

export function ResearchAnalysisPanel() {
  const { activeMode, researchSession, analysisSession, startResearch, startAnalysis, stopProcessing } = useProcessingStore();

  if (activeMode === 'research' && researchSession) {
    return <ResearchProgress session={researchSession} onStop={stopProcessing} />;
  }
  if (activeMode === 'analysis' && analysisSession) {
    return <AnalysisProgress session={analysisSession} onStop={stopProcessing} />;
  }

  return <ModeSelector onStartResearch={startResearch} onStartAnalysis={startAnalysis} />;
}

// ─── Mode Selector ──────────────────────────────────────────────────────────

function ModeSelector({
  onStartResearch,
  onStartAnalysis,
}: {
  onStartResearch: (topic: string, depth: ResearchDepth) => void;
  onStartAnalysis: (type: AnalysisType, question: string, depth: AnalysisDepth) => void;
}) {
  const [mode, setMode] = useState<'select' | 'research' | 'analysis'>('select');
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<ResearchDepth>('standard');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('summarize');
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('standard');
  const history = useProcessingStore((s) => s.history);

  if (mode === 'research') {
    return (
      <Panel title="Start Research" aria-label="Research configuration">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-jargiin-muted mb-1">Research Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What would you like me to research?"
              className="w-full bg-jargiin-bg/50 border border-jargiin-border rounded-lg px-3 py-2 text-sm text-jargiin-white font-mono placeholder:text-jargiin-muted/50 focus:border-jargiin-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-jargiin-muted mb-2">Depth (affects token budget)</label>
            <div className="flex gap-2">
              {(['quick', 'standard', 'deep'] as ResearchDepth[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border transition-colors ${
                    depth === d
                      ? 'border-jargiin-cyan bg-jargiin-cyan/10 text-jargiin-cyan'
                      : 'border-jargiin-border text-jargiin-muted hover:text-jargiin-white'
                  }`}
                >
                  <div className="font-semibold capitalize">{d}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">
                    {d === 'quick' && '~2K tokens'}
                    {d === 'standard' && '~5K tokens'}
                    {d === 'deep' && '~10K tokens'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode('select')}>Back</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!topic.trim()}
              onClick={() => onStartResearch(topic.trim(), depth)}
            >
              Begin Research
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  if (mode === 'analysis') {
    return (
      <Panel title="Start Analysis" aria-label="Analysis configuration">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-jargiin-muted mb-1">Analysis Question</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What would you like me to analyze?"
              className="w-full bg-jargiin-bg/50 border border-jargiin-border rounded-lg px-3 py-2 text-sm text-jargiin-white font-mono placeholder:text-jargiin-muted/50 focus:border-jargiin-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-jargiin-muted mb-2">Analysis Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'summarize', label: '📝 Summarize' },
                { id: 'compare', label: '⚖️ Compare' },
                { id: 'extract', label: '🔍 Extract' },
                { id: 'sentiment', label: '💬 Sentiment' },
                { id: 'categorize', label: '📂 Categorize' },
                { id: 'custom', label: '⚙️ Custom' },
              ] as { id: AnalysisType; label: string }[]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setAnalysisType(id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                    analysisType === id
                      ? 'border-jargiin-cyan bg-jargiin-cyan/10 text-jargiin-cyan'
                      : 'border-jargiin-border text-jargiin-muted hover:text-jargiin-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-jargiin-muted mb-2">Depth</label>
            <div className="flex gap-2">
              {(['skim', 'standard', 'thorough'] as AnalysisDepth[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setAnalysisDepth(d)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border transition-colors ${
                    analysisDepth === d
                      ? 'border-jargiin-cyan bg-jargiin-cyan/10 text-jargiin-cyan'
                      : 'border-jargiin-border text-jargiin-muted hover:text-jargiin-white'
                  }`}
                >
                  <div className="font-semibold capitalize">{d}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">
                    {d === 'skim' && '~1.5K tokens'}
                    {d === 'standard' && '~4K tokens'}
                    {d === 'thorough' && '~8K tokens'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode('select')}>Back</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!topic.trim()}
              onClick={() => onStartAnalysis(analysisType, topic.trim(), analysisDepth)}
            >
              Begin Analysis
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  // Mode selection
  return (
    <Panel title="Processing Modes" aria-label="Select processing mode">
      <div className="space-y-4">
        <p className="text-xs text-jargiin-muted font-mono">
          Token-efficient processing modes that minimize API costs while maximizing insight.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModeCard
            icon="🔬"
            title="Research Mode"
            description="Multi-source web research with progressive summarization"
            features={['Search → Fetch snippets → Summarize → Merge', 'Token budget: 2K–10K per session', 'Pyramid reduction for efficient consolidation']}
            onClick={() => setMode('research')}
          />
          <ModeCard
            icon="📊"
            title="Analysis Mode"
            description="Document & data analysis with smart chunking"
            features={['Pre-filter by relevance (zero token cost)', 'Only process relevant chunks', 'Structured output for compact results']}
            onClick={() => setMode('analysis')}
          />
        </div>

        {/* Token Efficiency Info */}
        <div className="p-3 rounded-lg bg-jargiin-bg/50 border border-jargiin-border">
          <h4 className="text-jargiin-cyan font-mono text-xs font-semibold mb-2">TOKEN EFFICIENCY</h4>
          <ul className="space-y-1 text-xs text-jargiin-muted font-mono">
            <li>• Keyword pre-filtering skips irrelevant content (free)</li>
            <li>• Chunks processed independently with small prompts</li>
            <li>• Progressive merge avoids sending all data at once</li>
            <li>• Budget caps prevent runaway token usage</li>
            <li>• Cached summaries avoid reprocessing</li>
          </ul>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h4 className="text-xs font-mono text-jargiin-muted mb-2">RECENT SESSIONS</h4>
            <div className="space-y-1">
              {history.slice(-5).reverse().map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-xs font-mono text-jargiin-muted">
                  <span>{h.type === 'research' ? '🔬' : '📊'}</span>
                  <span className="truncate flex-1">{h.topic}</span>
                  <span className="text-[10px] opacity-60">
                    {new Date(h.completedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── Progress Views ─────────────────────────────────────────────────────────

function ResearchProgress({
  session,
  onStop,
}: {
  session: NonNullable<ReturnType<typeof useProcessingStore.getState>['researchSession']>;
  onStop: () => void;
}) {
  const sourcesProcessed = session.sources.filter((s) => s.summary).length;

  return (
    <Panel title={`🔬 Research: ${session.topic}`} aria-label="Research progress">
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusDot status={session.status} />
          <span className="text-sm font-mono text-jargiin-white capitalize">{session.status}</span>
        </div>

        {/* Token Budget Bar */}
        <BudgetBar used={session.budget.used} total={session.budget.maxTotal} />

        {/* Sources */}
        <div className="text-xs font-mono text-jargiin-muted">
          Sources: {sourcesProcessed}/{session.sources.length} processed
        </div>

        {/* Findings */}
        {session.findings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-mono text-jargiin-cyan">FINDINGS</h4>
            {session.findings.map((f, i) => (
              <p key={i} className="text-xs text-jargiin-muted font-mono p-2 bg-jargiin-bg/30 rounded">
                {f}
              </p>
            ))}
          </div>
        )}

        {/* Final Summary */}
        {session.finalSummary && (
          <div className="p-3 rounded-lg border border-jargiin-cyan/30 bg-jargiin-cyan/5">
            <h4 className="text-xs font-mono text-jargiin-cyan mb-1">SUMMARY</h4>
            <p className="text-sm text-jargiin-white">{session.finalSummary}</p>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={onStop}>
          {session.status === 'complete' ? 'Done' : 'Stop'}
        </Button>
      </div>
    </Panel>
  );
}

function AnalysisProgress({
  session,
  onStop,
}: {
  session: NonNullable<ReturnType<typeof useProcessingStore.getState>['analysisSession']>;
  onStop: () => void;
}) {
  const chunksProcessed = session.chunks.filter((c) => c.processed).length;
  const compressionPct = session.metadata.totalInputTokens > 0
    ? Math.round((1 - session.metadata.processedInputTokens / session.metadata.totalInputTokens) * 100)
    : 0;

  return (
    <Panel title={`📊 Analysis: ${session.question}`} aria-label="Analysis progress">
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusDot status={session.status} />
          <span className="text-sm font-mono text-jargiin-white capitalize">{session.status}</span>
          <span className="text-xs text-jargiin-muted ml-auto">Type: {session.type}</span>
        </div>

        {/* Token Budget Bar */}
        <BudgetBar used={session.budget.used} total={session.budget.maxTotal} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatBox label="Chunks" value={`${chunksProcessed}/${session.chunks.length}`} />
          <StatBox label="Skipped" value={String(session.metadata.skippedChunks)} />
          <StatBox label="Compression" value={`${compressionPct}%`} />
        </div>

        {/* Final Result */}
        {session.finalResult && (
          <div className="p-3 rounded-lg border border-jargiin-cyan/30 bg-jargiin-cyan/5">
            <h4 className="text-xs font-mono text-jargiin-cyan mb-1">RESULT</h4>
            <p className="text-sm text-jargiin-white whitespace-pre-wrap">{session.finalResult}</p>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={onStop}>
          {session.status === 'complete' ? 'Done' : 'Stop'}
        </Button>
      </div>
    </Panel>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function ModeCard({
  icon,
  title,
  description,
  features,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  features: string[];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border border-jargiin-border bg-jargiin-bg/30 text-left hover:border-jargiin-cyan/50 transition-colors group"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="text-sm font-mono text-jargiin-white group-hover:text-jargiin-cyan transition-colors">
        {title}
      </h3>
      <p className="text-xs text-jargiin-muted mt-1">{description}</p>
      <ul className="mt-2 space-y-0.5">
        {features.map((f, i) => (
          <li key={i} className="text-[10px] text-jargiin-muted/70 font-mono">• {f}</li>
        ))}
      </ul>
    </button>
  );
}

function BudgetBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-jargiin-cyan';

  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-jargiin-muted mb-1">
        <span>Token Budget</span>
        <span>{used.toLocaleString()} / {total.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-jargiin-bg/50 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'complete' ? 'bg-green-500'
    : status === 'paused' ? 'bg-yellow-500'
    : 'bg-jargiin-cyan animate-pulse';

  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-jargiin-bg/30 border border-jargiin-border">
      <div className="text-xs font-mono text-jargiin-white">{value}</div>
      <div className="text-[10px] text-jargiin-muted">{label}</div>
    </div>
  );
}
