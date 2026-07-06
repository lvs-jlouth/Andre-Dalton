/**
 * Browser SpeechSynthesis TTS adapter.
 *
 * Handles:
 *  - Voice selection and rate/pitch/volume control
 *  - Interrupt / stop speaking
 *  - Repeat last response
 *  - Word-boundary callbacks for caption sync
 *  - TTS queue management
 *  - Graceful fallback when API is unavailable
 */
import type { TTSAdapter, TTSOptions, TTSStatus } from '../../types/speech.js';

export class BrowserTTSAdapter implements TTSAdapter {
  readonly id = 'browser';
  readonly displayName = 'Browser Speech Synthesis';

  onStatusChange: ((status: TTSStatus) => void) | null = null;
  onWordBoundary: ((word: string, charIndex: number) => void) | null = null;

  private status: TTSStatus = 'idle';
  private lastText = '';
  private utterance: SpeechSynthesisUtterance | null = null;

  private setStatus(s: TTSStatus): void {
    this.status = s;
    this.onStatusChange?.(s);
  }

  getStatus(): TTSStatus {
    return this.status;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
  }

  async speak(text: string, options?: TTSOptions): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('SpeechSynthesis not available');
      return;
    }

    this.lastText = text;
    window.speechSynthesis.cancel(); // Clear any current speech

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 0.9;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;

      if (options?.voiceId) {
        const voices = this.getAvailableVoices();
        const match = voices.find((v) => v.voiceURI === options.voiceId || v.name === options.voiceId);
        if (match) utterance.voice = match;
      }

      utterance.onstart = () => this.setStatus('speaking');

      utterance.onend = () => {
        this.setStatus('idle');
        resolve();
      };

      utterance.onerror = (event) => {
        this.setStatus('error');
        reject(new Error(event.error));
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const word = text.slice(event.charIndex, event.charIndex + (event.charLength ?? 0));
          this.onWordBoundary?.(word, event.charIndex);
        }
      };

      utterance.onpause = () => this.setStatus('paused');
      utterance.onresume = () => this.setStatus('speaking');

      this.utterance = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    this.setStatus('idle');
  }

  pause(): void {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.pause();
    this.setStatus('paused');
  }

  resume(): void {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.resume();
    this.setStatus('speaking');
  }

  repeatLast(): void {
    if (this.lastText) {
      void this.speak(this.lastText);
    }
  }
}
