import { useRef, useEffect, useMemo } from 'react';
import { Panel } from '../ui/Panel.js';
import { useAssistantStore } from '../../store/assistantStore.js';
import { useSettingsStore } from '../../store/settingsStore.js';
import { useTTS } from '../../hooks/useTTS.js';

/**
 * DialogueLedger — scrolling conversation transcript.
 * Always visible captions for spoken responses satisfy the accessibility requirement
 * that no critical information is conveyed by audio alone.
 */
export function DialogueLedger() {
  const conversation = useAssistantStore((s) => s.conversation);
  const fontScale = useSettingsStore((s) => s.accessibility.fontScale);
  const { speak, stop, pause, resume, repeatLast, ttsStatus } = useTTS();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantResponse = useMemo(
    () => [...conversation].reverse().find((turn) => turn.role === 'assistant' && turn.content.trim().length > 0),
    [conversation],
  );
  const ttsSpeaking = ttsStatus === 'speaking';
  const ttsPaused = ttsStatus === 'paused';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <Panel
      title="Dialogue Ledger"
      aria-label="Conversation transcript"
      aria-live="polite"
      aria-relevant="additions"
      className="flex flex-col"
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-aurora-border/40 bg-aurora-bg/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted">
              Voice controls
            </p>
            <p className="text-xs font-mono text-aurora-muted">
              {ttsSpeaking ? 'Speaking' : ttsPaused ? 'Paused' : 'Ready'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => {
              if (!lastAssistantResponse) return;
              void speak(lastAssistantResponse.content);
            }}
            disabled={!lastAssistantResponse}
            aria-label="Read aloud latest assistant response"
            className={`min-h-[56px] px-5 rounded-lg border font-mono text-base transition-colors ${
              'border-aurora-cyan/70 bg-aurora-cyan/15 text-aurora-cyan hover:bg-aurora-cyan/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {ttsSpeaking || ttsPaused ? 'Replay read aloud' : 'Read aloud'}
          </button>

            <button
              type="button"
              onClick={ttsSpeaking ? pause : resume}
              disabled={!ttsSpeaking && !ttsPaused}
              aria-label={ttsSpeaking ? 'Pause read aloud playback' : 'Resume read aloud playback'}
              className="min-h-[56px] px-5 rounded-lg border border-aurora-border/70 bg-aurora-bg/40 text-aurora-white font-mono text-base hover:border-aurora-cyan/60 hover:text-aurora-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ttsSpeaking ? 'Pause' : 'Resume'}
            </button>

            <button
              type="button"
              onClick={stop}
              disabled={!ttsSpeaking && !ttsPaused}
              aria-label="Stop voice playback"
              className="min-h-[56px] px-5 rounded-lg border border-aurora-danger/60 bg-aurora-danger/10 text-aurora-danger font-mono text-base hover:bg-aurora-danger/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop
            </button>

            <button
              type="button"
              onClick={repeatLast}
              disabled={!lastAssistantResponse}
              aria-label="Reset and replay the last spoken response"
              className="min-h-[56px] px-5 rounded-lg border border-aurora-border/70 bg-aurora-bg/40 text-aurora-white font-mono text-base hover:border-aurora-cyan/60 hover:text-aurora-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset voice
            </button>
          </div>
        </div>

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
              {turn.role === 'user' ? 'You' : 'J.A.R.G.I.I.N.'}
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

        <div ref={bottomRef} />
        </div>
      </div>
    </Panel>
  );
}
