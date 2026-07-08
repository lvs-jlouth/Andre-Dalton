import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { WaveformDisplay } from '../core/WaveformDisplay.js';
import { useAssistantStore } from '../../store/assistantStore.js';
import { useSettingsStore } from '../../store/settingsStore.js';
import { useSpeechProfileStore } from '../../store/speechProfileStore.js';
import { useVoiceInput } from '../../hooks/useVoiceInput.js';
import { useAssistant } from '../../hooks/useAssistant.js';
import { useTTS } from '../../hooks/useTTS.js';
import { useWakeWord } from '../../hooks/useWakeWord.js';

/**
 * IntentConsole — the primary input panel.
 * Supports text input, push-to-talk, keyboard shortcuts, and optional
 * wake word activation ("Hey J" or custom phrase configured in Voice Profile).
 */
export function IntentConsole() {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const assistantStatus = useAssistantStore((s) => s.status);
  const errorMessage = useAssistantStore((s) => s.errorMessage);
  const largeHitTargets = useSettingsStore((s) => s.accessibility.largeHitTargets);
  const wakeWordConfig = useSpeechProfileStore((s) => s.profile.wakeWord);
  const { sendUserMessage } = useAssistant();
  const { speak } = useTTS();

  const { sttStatus, partialTranscript, startListening, stopListening } = useVoiceInput({
    onResult: async (result) => {
      if (result.transcript.trim()) {
        // Boot mode voice commands
        const normalized = result.transcript.trim().toLowerCase();
        if (normalized === 'open your boot') {
          useSettingsStore.getState().setBootMode(true);
          resumeMonitoring();
          return;
        }
        if (normalized === 'finite' || normalized === 'finitay' || normalized === 'fih-nee-tay' || normalized === 'finité') {
          useSettingsStore.getState().setBootMode(false);
          resumeMonitoring();
          return;
        }

        const reply = await sendUserMessage(result.transcript);
        if (reply) {
          await speak(reply);
          resumeMonitoring();
        }
      }
    },
  });

  // Wake word — automatically triggers startListening when the phrase is heard
  const { wakeStatus, resumeMonitoring, pauseMonitoring } = useWakeWord({
    onWake: () => {
      if (!isBusy && !isListening) {
        startListening();
        // Suspend wake word monitoring while main STT is active
        pauseMonitoring();
      }
    },
  });

  // When main STT goes idle (user stopped talking), resume wake word monitoring
  useEffect(() => {
    if (sttStatus === 'idle' && wakeWordConfig.enabled) {
      resumeMonitoring();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sttStatus]);

  const isListening = sttStatus === 'listening';
  const isThinking = assistantStatus === 'thinking';
  const isBusy = isThinking || assistantStatus === 'speaking';

  async function handleSubmit() {
    const text = inputText.trim();
    if (!text || isBusy) return;
    setInputText('');

    // Boot mode commands — intercept before sending to assistant
    const normalized = text.toLowerCase();
    if (normalized === 'open your boot') {
      useSettingsStore.getState().setBootMode(true);
      inputRef.current?.focus();
      return;
    }
    if (normalized === 'finite' || normalized === 'finitay' || normalized === 'fih-nee-tay') {
      useSettingsStore.getState().setBootMode(false);
      inputRef.current?.focus();
      return;
    }

    const reply = await sendUserMessage(text);
    if (reply) {
      await speak(reply);
      resumeMonitoring();
    }
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
      resumeMonitoring();
    } else {
      pauseMonitoring();
      startListening();
    }
  }

  const btnSize = largeHitTargets ? 'lg' : 'md';

  return (
    <Panel title="Intent Console" aria-label="Command input panel">
      <div className="flex flex-col gap-3">
        {/* Wake word status strip — only shown when wake word is enabled */}
        {wakeWordConfig.enabled && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono
              border transition-colors duration-300
              ${wakeStatus === 'monitoring'
                ? 'bg-jargiin-teal/10 border-jargiin-teal/30 text-jargiin-teal'
                : wakeStatus === 'detected'
                ? 'bg-jargiin-cyan/10 border-jargiin-cyan/40 text-jargiin-cyan'
                : wakeStatus === 'error' || wakeStatus === 'unsupported'
                ? 'bg-jargiin-danger/10 border-jargiin-danger/30 text-jargiin-danger'
                : 'bg-jargiin-border/10 border-jargiin-border/20 text-jargiin-muted'}
            `}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wakeStatus === 'monitoring' ? 'bg-jargiin-teal animate-pulse' :
                wakeStatus === 'detected'   ? 'bg-jargiin-cyan' :
                wakeStatus === 'error'      ? 'bg-jargiin-danger' :
                'bg-jargiin-muted/40'
              }`}
              aria-hidden="true"
            />
            {wakeStatus === 'monitoring' && (
              <span>Listening for "<strong>{wakeWordConfig.phrase}</strong>"</span>
            )}
            {wakeStatus === 'detected' && (
              <span>Wake phrase detected — activating…</span>
            )}
            {wakeStatus === 'off' && (
              <span>Wake word off</span>
            )}
            {wakeStatus === 'error' && (
              <span>Wake word error — check microphone permissions</span>
            )}
            {wakeStatus === 'unsupported' && (
              <span>Wake word not supported in this browser</span>
            )}
          </div>
        )}

        {/* Waveform display */}
        <WaveformDisplay />

        {/* Partial transcript feedback */}
        {partialTranscript && (
          <p
            aria-live="polite"
            aria-atomic="false"
            className="text-sm font-mono text-jargiin-cyan/70 italic min-h-[1.5rem]"
          >
            {partialTranscript}…
          </p>
        )}

        {/* Error feedback */}
        {errorMessage && (
          <p role="alert" className="text-sm text-jargiin-danger font-mono">
            ⚠ {errorMessage}
          </p>
        )}

        {/* Text input row */}
        <div className="flex gap-2 items-center">
          <label htmlFor="jargiin-input" className="sr-only">
            Message to J.A.R.G.I.I.N.
          </label>
          <input
            id="jargiin-input"
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              wakeWordConfig.enabled
                ? `Say "${wakeWordConfig.phrase}" or type here…`
                : 'Type a message or press the mic button…'
            }
            disabled={isBusy}
            autoComplete="off"
            spellCheck={false}
            className="
              flex-1 bg-jargiin-bg/60 border border-jargiin-border/60
              rounded-lg px-3 py-2 text-sm font-mono text-jargiin-white
              placeholder:text-jargiin-muted/50
              focus:outline-none focus:ring-2 focus:ring-jargiin-cyan/50
              disabled:opacity-50
              min-h-[44px]
            "
          />

          {/* Push-to-talk */}
          <Button
            variant={isListening ? 'danger' : 'secondary'}
            size={btnSize}
            onClick={toggleListening}
            disabled={isBusy}
            aria-label={isListening ? 'Stop listening' : 'Push to talk — start listening'}
            aria-pressed={isListening}
          >
            {isListening ? '⏹ Stop' : '🎙 Talk'}
          </Button>

          {/* Send */}
          <Button
            variant="primary"
            size={btnSize}
            onClick={() => void handleSubmit()}
            disabled={!inputText.trim() || isBusy}
            aria-label="Send message"
          >
            {isThinking ? '⏳' : '→'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
