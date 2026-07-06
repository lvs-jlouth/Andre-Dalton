/**
 * Browser Web Speech API STT adapter.
 *
 * Uses the SpeechRecognition API available in modern browsers (Chrome/Edge).
 * Handles:
 *  - Long-pause tolerance via configurable silence threshold
 *  - Partial transcript buffering
 *  - Confidence scoring
 *  - Graceful fallback when API is unavailable
 */
import type { STTAdapter, STTResult, STTPartialResult, STTStartOptions, STTStatus } from '../../types/speech.js';

export class BrowserSTTAdapter implements STTAdapter {
  readonly id = 'browser';
  readonly displayName = 'Browser Speech Recognition';

  onPartialResult: ((result: STTPartialResult) => void) | null = null;
  onFinalResult: ((result: STTResult) => void) | null = null;
  onError: ((error: string) => void) | null = null;
  onStatusChange: ((status: STTStatus) => void) | null = null;

  private recognition: SpeechRecognition | null = null;
  private status: STTStatus = 'idle';
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private pauseToleranceMs = 2000;

  private setStatus(s: STTStatus) {
    this.status = s;
    this.onStatusChange?.(s);
  }

  start(options?: STTStartOptions): void {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      this.onError?.('SpeechRecognition is not supported in this browser');
      this.setStatus('error');
      return;
    }

    this.pauseToleranceMs = options?.pauseToleranceMs ?? 2000;

    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      this.onError?.('SpeechRecognition is not supported in this browser');
      this.setStatus('error');
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = options?.language ?? 'en-US';
    rec.maxAlternatives = 3;

    rec.onstart = () => this.setStatus('listening');

    rec.onresult = (event: SpeechRecognitionEvent) => {
      this.resetSilenceTimer();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence ?? 0;

        if (result.isFinal) {
          this.onFinalResult?.({
            transcript,
            confidence,
            isFinal: true,
            alternatives: Array.from({ length: Math.max(result.length - 1, 0) }, (_, index) => {
              const alt = result[index + 1];
              return {
                transcript: alt.transcript,
                confidence: alt.confidence ?? 0,
              };
            }),
          });
        } else {
          this.onPartialResult?.({ transcript, isFinal: false, confidence });
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        // Not an error — user just paused; honour pause tolerance
        return;
      }
      this.clearSilenceTimer();
      this.setStatus('error');
      this.onError?.(event.error);
    };

    rec.onend = () => {
      this.clearSilenceTimer();
      if (this.status !== 'error') {
        this.setStatus('idle');
      }
    };

    this.recognition = rec;
    rec.start();
  }

  stop(): void {
    this.clearSilenceTimer();
    this.recognition?.stop();
    this.recognition = null;
    this.setStatus('idle');
  }

  abort(): void {
    this.clearSilenceTimer();
    this.recognition?.abort();
    this.recognition = null;
    this.setStatus('idle');
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      // Auto-stop after extended silence
      this.stop();
    }, this.pauseToleranceMs);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}
