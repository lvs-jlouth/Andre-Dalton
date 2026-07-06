import { useRef, useEffect } from 'react';
import { Panel } from '../ui/Panel.js';
import { useAssistantStore } from '../../store/assistantStore.js';
import { useSettingsStore } from '../../store/settingsStore.js';

/**
 * DialogueLedger — scrolling conversation transcript.
 * Always visible captions for spoken responses satisfy the accessibility requirement
 * that no critical information is conveyed by audio alone.
 */
export function DialogueLedger() {
  const conversation = useAssistantStore((s) => s.conversation);
  const currentCaption = useAssistantStore((s) => s.currentCaption);
  const lastResponse = useAssistantStore((s) => s.lastResponse);
  const captions = useSettingsStore((s) => s.accessibility.captions);
  const fontScale = useSettingsStore((s) => s.accessibility.fontScale);
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [conversation, currentCaption, reducedMotion]);

  return (
    <Panel
      title="Dialogue Ledger"
      aria-label="Conversation transcript"
      aria-live="polite"
      aria-relevant="additions"
      className="flex flex-col"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-aurora-muted">
        <span className="rounded-full border border-aurora-border/30 bg-black/10 px-3 py-1.5">
          captions {captions ? 'online' : 'off'}
        </span>
        {lastResponse && (
          <span className="rounded-full border border-aurora-cyan/20 bg-aurora-cyan/10 px-3 py-1.5 text-aurora-cyan">
            {lastResponse.providerId} / {lastResponse.model}
          </span>
        )}
      </div>
      <div
        className="h-[26rem] space-y-3 overflow-y-auto pr-1 scrollbar-thin"
        style={{ fontSize: `${fontScale}rem` }}
      >
        {conversation.length === 0 && (
          <p className="rounded-2xl border border-dashed border-aurora-border/30 bg-black/10 px-4 py-5 text-sm font-mono italic text-aurora-muted/70">
            Say something or type a message below to begin.
          </p>
        )}

        {conversation.map((turn) => (
          <div
            key={turn.id}
            className={`flex flex-col gap-0.5 ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-aurora-muted text-xs font-mono">
              {turn.role === 'user' ? 'You' : 'AURORA'}
            </span>
            <div
              className={`
                max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-[0_16px_32px_rgba(0,0,0,0.18)]
                ${turn.role === 'user'
                  ? 'border border-aurora-blue/30 bg-aurora-blue/15 text-aurora-white rounded-br-md'
                  : 'border border-aurora-teal/25 bg-aurora-teal/10 text-aurora-white rounded-bl-md'}
              `}
            >
              {turn.content}
              <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.24em] text-aurora-muted/80">
                {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Live caption overlay */}
        {captions && currentCaption && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="false"
            className="flex items-start gap-2"
          >
            <span className="text-aurora-muted text-xs font-mono">AURORA</span>
            <div className="rounded-2xl border border-aurora-cyan/25 bg-aurora-cyan/10 px-4 py-3 text-sm italic text-aurora-cyan/90">
              {currentCaption}
              <span className="animate-pulse ml-1">▋</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </Panel>
  );
}
