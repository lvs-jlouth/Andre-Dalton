/**
 * WakeWordDetector — lightweight browser-based wake phrase listener.
 *
 * Design principles:
 *  - NEVER active by default. Must be explicitly enabled by the user.
 *  - Uses the Web Speech API in continuous interim mode; the full main
 *    STT pipeline is NOT running while we wait for the wake phrase.
 *  - Fuzzy phrase matching with configurable sensitivity to support users
 *    with non-standard speech cadence (e.g. "Hey Jee", "A J", "Hey Jay").
 *  - Minimal CPU footprint: only processes interim transcripts, no audio
 *    recording or external network calls.
 *  - Stops automatically once the wake phrase is detected; the caller
 *    is responsible for starting the main STT pipeline.
 *
 * Accessibility note:
 *  Users who cannot reliably produce the exact wake phrase may lower the
 *  sensitivity slider in Voice Adaptation settings to accept approximate
 *  matches.
 */

export type WakeWordStatus = 'off' | 'monitoring' | 'detected' | 'error' | 'unsupported';

export interface WakeWordDetectorOptions {
  /** The phrase to listen for, e.g. "Hey J" */
  phrase: string;
  /** 0–1; lower = more permissive fuzzy matching (default 0.75) */
  sensitivity?: number;
  /** Language hint, BCP-47 (default "en-US") */
  language?: string;
  /** Called when the wake phrase is detected */
  onDetected: () => void;
  /** Called when status changes */
  onStatusChange?: (status: WakeWordStatus) => void;
  /** Called on recoverable errors (detector will attempt to restart) */
  onError?: (message: string) => void;
}

export class WakeWordDetector {
  private recognition: SpeechRecognition | null = null;
  private status: WakeWordStatus = 'off';
  private opts: WakeWordDetectorOptions;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private active = false;

  constructor(opts: WakeWordDetectorOptions) {
    this.opts = opts;
  }

  private setStatus(s: WakeWordStatus) {
    this.status = s;
    this.opts.onStatusChange?.(s);
  }

  getStatus(): WakeWordStatus {
    return this.status;
  }

  /** Start monitoring for the wake phrase. Non-destructive if already monitoring. */
  start(): void {
    if (this.active) return;

    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      this.setStatus('unsupported');
      this.opts.onError?.('SpeechRecognition is not supported in this browser');
      return;
    }

    this.active = true;
    this._startRecognition();
  }

  private _startRecognition(): void {
    if (!this.active) return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;

    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.opts.language ?? 'en-US';
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      if (this.active) this.setStatus('monitoring');
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Check all alternatives for a phrase match
        for (let alt = 0; alt < result.length; alt++) {
          const transcript = result[alt].transcript.trim().toLowerCase();
          if (this._matchesPhrase(transcript)) {
            this._onDetected();
            return;
          }
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is expected during quiet monitoring — silently restart
      if (event.error === 'no-speech') {
        rec.stop();
        return;
      }
      this.setStatus('error');
      this.opts.onError?.(event.error);
      // Auto-restart after a short back-off
      if (this.active) {
        this._scheduleRestart(3000);
      }
    };

    rec.onend = () => {
      // Automatically restart so monitoring stays continuous
      if (this.active && this.status !== 'detected') {
        this._scheduleRestart(200);
      }
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch {
      // Ignore "already started" race
    }
  }

  private _scheduleRestart(delayMs: number): void {
    if (this.restartTimer !== null) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (this.active && this.status !== 'detected') {
        this._startRecognition();
      }
    }, delayMs);
  }

  private _onDetected(): void {
    this.active = false;
    this.recognition?.stop();
    this.recognition = null;
    this.setStatus('detected');
    this.opts.onDetected();
  }

  /** Stop monitoring and release the microphone. */
  stop(): void {
    this.active = false;
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.recognition?.stop();
    this.recognition = null;
    this.setStatus('off');
  }

  /**
   * Fuzzy phrase matching.
   *
   * Strategy:
   * 1. Exact substring check (fastest path).
   * 2. Token overlap ratio — fraction of target tokens found in the
   *    transcript. Useful for users who may drop the first or last word.
   * 3. Levenshtein distance similarity on the full phrase.
   *
   * Returns true when any strategy produces a score >= sensitivity.
   */
  private _matchesPhrase(transcript: string): boolean {
    const target = (this.opts.phrase ?? 'hey j').toLowerCase().trim();
    const sensitivity = this.opts.sensitivity ?? 0.75;

    // 1. Exact substring
    if (transcript.includes(target)) return true;

    // 2. Token overlap
    const targetTokens = target.split(/\s+/);
    const transcriptTokens = transcript.split(/\s+/);
    const matchedTokens = targetTokens.filter((t) =>
      transcriptTokens.some((tt) => tt.length > 0 && (tt.startsWith(t) || t.startsWith(tt))),
    );
    const tokenScore = matchedTokens.length / targetTokens.length;
    if (tokenScore >= sensitivity) return true;

    // 3. Levenshtein similarity on the closest window of the transcript
    // (compare against a sliding window of same length as target)
    const targetLen = target.length;
    if (transcript.length >= targetLen * 0.5) {
      const windowSize = Math.ceil(targetLen * 1.4);
      let bestSim = 0;
      for (let start = 0; start <= transcript.length - Math.floor(targetLen * 0.5); start++) {
        const window = transcript.slice(start, start + windowSize);
        const sim = _similarity(target, window);
        if (sim > bestSim) bestSim = sim;
      }
      if (bestSim >= sensitivity) return true;
    }

    return false;
  }
}

/** Normalised Levenshtein similarity (0=completely different, 1=identical). */
function _similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) =>
    Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  const distance = matrix[b.length][a.length];
  return 1 - distance / Math.max(a.length, b.length);
}
