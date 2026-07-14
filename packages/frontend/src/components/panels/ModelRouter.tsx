import { useEffect, useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { AccordionSection } from '../ui/AccordionSection.js';
import { getProviders, testProvider } from '../../services/api.js';
import type { ProviderInfo } from '../../types/provider.js';
import { useAssistantStore } from '../../store/assistantStore.js';

/**
 * ModelRouter — displays LLM provider status and allows testing connectivity.
 * Never renders API keys or credentials.
 */
export function ModelRouter() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const preferredModel = useAssistantStore((s) => s.preferredModel);
  const setPreferredModel = useAssistantStore((s) => s.setPreferredModel);

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

  const azureProvider = providers.find((p) => p.id === 'azure');
  const azureReady = azureProvider?.configured ?? false;

  return (
    <Panel title="Model Router" aria-label="AI provider configuration panel">
      {providers.length === 0 ? (
        <p className="text-aurora-muted text-sm font-mono">Connecting to backend…</p>
      ) : (
        <div className="space-y-4">
          <AccordionSection
            id="provider-health"
            title="Provider health"
            subtitle="Connectivity and configuration status"
            defaultOpen
          >
            <ul className="space-y-2" role="list" aria-label="Available AI providers">
              {providers.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${statusDot(p.id)}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-mono text-aurora-white truncate">{p.displayName}</span>
                    {!p.configured && (
                      <span className="text-xs text-aurora-warn font-mono">(unconfigured)</span>
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
          </AccordionSection>

          <AccordionSection
            id="provider-routing"
            title="Routing policy"
            subtitle="Foundry/OpenAI model path mapping"
            defaultOpen
          >
            <section aria-label="Azure AI Foundry recommendations" className="space-y-2">
              <p className="text-sm font-mono text-aurora-cyan">
                Azure AI Foundry: {azureReady ? 'connected' : 'not connected'}
              </p>
              <p className="text-xs text-aurora-muted">
                Recommended model routing for this app:
              </p>
              <ul className="space-y-1 text-xs font-mono text-aurora-white" role="list">
                <li>gpt-5-mini - default for daily chat, voice, and settings support.</li>
                <li>gpt-5.5 - highest quality for complex multi-step reasoning.</li>
                <li>gpt-5-nano - low-latency fallback for lightweight prompts.</li>
              </ul>

              <div className="pt-2 border-t border-aurora-border/30 space-y-2">
                <p className="text-xs text-aurora-muted">
                  Active model path for chat requests:
                </p>
                <p className="text-xs text-aurora-muted">
                  Routing policy: <span className="text-aurora-white">gpt-5-mini → Foundry (Azure)</span>,{' '}
                  <span className="text-aurora-white">gpt-5.5 / gpt-5-nano → OpenAI</span>.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['gpt-5.5', 'gpt-5-mini', 'gpt-5-nano'] as const).map((model) => (
                    <Button
                      key={model}
                      variant={preferredModel === model ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setPreferredModel(model)}
                      aria-label={`Set active model to ${model}`}
                    >
                      {model}
                    </Button>
                  ))}
                </div>
              </div>
            </section>
          </AccordionSection>
        </div>
      )}
    </Panel>
  );
}
