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
  const captions = useSettingsStore((s) => s.accessibility.captions);
  const fontScale = useSettingsStore((s) => s.accessibility.fontScale);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentCaption]);

  return (
    <Panel
      title="Dialogue Ledger"
      aria-label="Conversation transcript"
      aria-live="polite"
      aria-relevant="additions"
      className="flex flex-col"
    >
      <div
        className="h-64 overflow-y-auto space-y-3 pr-1 scrollbar-thin"
        style={{ fontSize: `${fontScale}rem` }}
      >
        {conversation.length === 0 && (
          <p className="text-aurora-muted/60 text-sm font-mono italic">
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
                max-w-[85%] px-3 py-2 rounded-xl text-sm
                ${turn.role === 'user'
                  ? 'bg-aurora-blue/20 border border-aurora-blue/30 text-aurora-white rounded-br-sm'
                  : 'bg-aurora-teal/10 border border-aurora-teal/20 text-aurora-white rounded-bl-sm'}
              `}
            >
              {turn.content}
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
            <div className="bg-aurora-cyan/10 border border-aurora-cyan/20 px-3 py-2 rounded-xl text-sm text-aurora-cyan/90 italic">
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
