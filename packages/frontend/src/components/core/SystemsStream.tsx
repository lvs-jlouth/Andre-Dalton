import { useEffect, useRef, useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { useAssistantStore } from '../../store/assistantStore.js';

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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

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
      <div className="h-32 overflow-y-auto font-mono text-xs space-y-0.5 scrollbar-thin">
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-2">
            <span className="text-aurora-border/60 shrink-0">{entry.time}</span>
            <span className={typeColors[entry.type]}>{entry.text}</span>
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
