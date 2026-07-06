import { useEffect, useRef, useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { useAssistantStore } from '../../store/assistantStore.js';
import { useSettingsStore } from '../../store/settingsStore.js';

interface StreamEntry {
  id: number;
  time: string;
  text: string;
  type: 'info' | 'warn' | 'error' | 'activity';
}

let entryId = 0;

/**
 * SystemsStream — a terminal-style feed of AURORA's operational log.
 * Privacy note: never shows message content, only operational metadata.
 */
export function SystemsStream() {
  const status = useAssistantStore((s) => s.status);
  const errorMessage = useAssistantStore((s) => s.errorMessage);
  const lastResponse = useAssistantStore((s) => s.lastResponse);
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);
  const [entries, setEntries] = useState<StreamEntry[]>([
    { id: ++entryId, time: now(), text: 'AURORA systems initialised', type: 'info' },
    { id: ++entryId, time: now(), text: 'Voice subsystem ready', type: 'info' },
    { id: ++entryId, time: now(), text: 'Provider router standby', type: 'info' },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messages: Record<typeof status, { text: string; type: StreamEntry['type'] }> = {
      idle: { text: 'System idle', type: 'info' },
      thinking: { text: 'Processing intent...', type: 'activity' },
      speaking: { text: 'Synthesising speech...', type: 'activity' },
      listening: { text: 'Audio capture active', type: 'activity' },
      error: { text: `Error state: ${errorMessage ?? 'unknown'}`, type: 'error' },
    };

    setEntries((prev) => [
      ...prev.slice(-50), // Keep last 50 entries
      { id: ++entryId, time: now(), ...messages[status] },
    ]);
  }, [status, errorMessage]);

  useEffect(() => {
    if (!lastResponse) return;
    setEntries((prev) => [
      ...prev.slice(-50),
      {
        id: ++entryId,
        time: now(),
        text: `Response routed via ${lastResponse.providerId} · ${lastResponse.model}`,
        type: 'activity',
      },
    ]);
  }, [lastResponse]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [entries, reducedMotion]);

  const typeColors = {
    info: 'text-aurora-muted',
    warn: 'text-aurora-warn',
    error: 'text-aurora-danger',
    activity: 'text-aurora-cyan',
  };

  return (
    <Panel
      title="Systems Stream"
      aria-label="AURORA systems activity log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="mb-3 grid grid-cols-3 gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-aurora-muted">
        <div className="rounded-2xl border border-aurora-border/30 bg-black/10 px-3 py-2">
          stream
        </div>
        <div className="rounded-2xl border border-aurora-border/30 bg-black/10 px-3 py-2">
          privacy-safe
        </div>
        <div className="rounded-2xl border border-aurora-border/30 bg-black/10 px-3 py-2 text-aurora-cyan">
          live
        </div>
      </div>
      <div className="h-44 space-y-1 overflow-y-auto rounded-2xl border border-aurora-border/25 bg-black/15 p-3 font-mono text-xs scrollbar-thin">
        {entries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-[auto_1fr] gap-2 rounded-xl px-2 py-1 even:bg-white/[0.015]">
            <span className="shrink-0 text-aurora-border/60">{entry.time}</span>
            <span className={`flex items-center gap-2 ${typeColors[entry.type]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                entry.type === 'error'
                  ? 'bg-aurora-danger'
                  : entry.type === 'warn'
                  ? 'bg-aurora-warn'
                  : entry.type === 'activity'
                  ? 'bg-aurora-cyan'
                  : 'bg-aurora-muted'
              }`} aria-hidden="true" />
              {entry.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </Panel>
  );
}

function now(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
