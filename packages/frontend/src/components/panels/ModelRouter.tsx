import { useEffect, useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { getProviders, testProvider } from '../../services/api.js';
import type { ProviderInfo } from '../../types/provider.js';

/**
 * ModelRouter — displays LLM provider status and allows testing connectivity.
 * Never renders API keys or credentials.
 */
export function ModelRouter() {
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
    if (!result) return 'bg-jargiin-border/40';
    if (result === 'ok') return 'bg-jargiin-success';
    if (result === 'unconfigured') return 'bg-jargiin-warn';
    return 'bg-jargiin-danger';
  };

  return (
    <Panel title="Model Router" aria-label="AI provider configuration panel">
      {providers.length === 0 ? (
        <p className="text-jargiin-muted text-sm font-mono">Connecting to backend…</p>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Available AI providers">
          {providers.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${statusDot(p.id)}`}
                  aria-hidden="true"
                />
                <span className="text-sm font-mono text-jargiin-white truncate">{p.displayName}</span>
                {!p.configured && (
                  <span className="text-xs text-jargiin-warn font-mono">(unconfigured)</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleTest(p.id)}
                disabled={testing === p.id}
                aria-label={`Test connection to ${p.displayName}`}
              >
                {testing === p.id ? '…' : 'Test'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
