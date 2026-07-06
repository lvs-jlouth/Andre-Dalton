import { useEffect, useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { getProviders, testProvider } from '../../services/api.js';
import type { ProviderInfo } from '../../types/provider.js';

interface ModelRouterProps {
  compact?: boolean;
}

/**
 * ModelRouter — displays LLM provider status and allows testing connectivity.
 * Never renders API keys or credentials.
 */
export function ModelRouter({ compact = false }: ModelRouterProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  useEffect(() => {
    getProviders()
      .then((data) => setProviders(data.providers))
      .catch(() => {/* Backend not available yet */});
  }, []);

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const result = await testProvider(id);
      setTestResults((prev) => ({ ...prev, [id]: result.health.status }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: 'error' }));
    } finally {
      setTesting(null);
    }
  }

  const statusDot = (id: string) => {
    const result = testResults[id];
    if (!result) return 'bg-aurora-border/40';
    if (result === 'ok') return 'bg-aurora-success';
    if (result === 'unconfigured') return 'bg-aurora-warn';
    return 'bg-aurora-danger';
  };

  return (
    <Panel title="Model Router" aria-label="AI provider configuration panel">
      {providers.length === 0 ? (
        <p className="text-aurora-muted text-sm font-mono">Connecting to backend…</p>
      ) : (
        <ul className={compact ? 'space-y-2' : 'space-y-3'} role="list" aria-label="Available AI providers">
          {providers.map((p) => (
            <li key={p.id} className="rounded-2xl border border-aurora-border/30 bg-black/10 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${statusDot(p.id)}`}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-mono text-aurora-white">{p.displayName}</span>
                    {!p.configured && (
                      <span className="text-xs font-mono text-aurora-warn">(unconfigured)</span>
                    )}
                  </div>
                  {!compact && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.capabilities.chat && <CapabilityPill label="chat" />}
                      {p.capabilities.streaming && <CapabilityPill label="stream" />}
                      {p.capabilities.vision && <CapabilityPill label="vision" />}
                      {p.capabilities.tools && <CapabilityPill label="tools" />}
                    </div>
                  )}
                </div>
                {!compact && (
                  <div className="text-right text-[10px] font-mono uppercase tracking-[0.2em] text-aurora-muted">
                    {testResults[p.id] ?? 'standby'}
                  </div>
                )}
              </div>
              <Button
                variant={compact ? 'ghost' : 'secondary'}
                size={compact ? 'sm' : 'md'}
                onClick={() => void handleTest(p.id)}
                disabled={testing === p.id}
                aria-label={`Test connection to ${p.displayName}`}
                className="mt-3 w-full"
              >
                {testing === p.id ? 'Testing…' : compact ? 'Ping route' : 'Test route'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function CapabilityPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-aurora-border/30 bg-black/10 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-aurora-muted">
      {label}
    </span>
  );
}
