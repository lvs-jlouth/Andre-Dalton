export type PaceSetting = 'very_slow' | 'slow' | 'normal' | 'fast';
export type ClarificationMode = 'relaxed' | 'moderate' | 'aggressive';

export interface SpeechSubstitution {
  heard: string;
  intended: string;
}

export interface WakeWordConfig {
  /** Whether the wake word listener is enabled (opt-in, never default). */
  enabled: boolean;
  /** The phrase to listen for — e.g. "Hey J" or any custom phrase. */
  phrase: string;
  /**
   * Fuzzy match sensitivity 0-1.
   * 1.0 = exact match only; lower values accept approximate matches
   * (useful for users whose speech cadence produces slightly varied output).
   */
  sensitivity: number;
}

export interface SpeechTrainingAttempt {
  promptId: string;
  expectedText: string;
  spokenText: string;
  confidence: number;
  matchScore: number;
  recordedAt: string;
}

export interface SpeechTrainingSession {
  id: string;
  startedAt: string;
  completedAt: string;
  promptsCompleted: number;
  averageConfidence: number;
  averageMatchScore: number;
  attempts: SpeechTrainingAttempt[];
}

export interface SpeechProfile {
  id: string;
  preferredName: string;
  speechPace: PaceSetting;
  pauseToleranceMs: number;
  substitutions: SpeechSubstitution[];
  customVocabulary: string[];
  commandAliases: Record<string, string>;
  clarificationMode: ClarificationMode;
  confirmationThreshold: number;
  consentStoringCorrections: boolean;
  consentLocalLearning: boolean;
  /** Wake word / wake phrase configuration */
  wakeWord: WakeWordConfig;
  trainingSessions: SpeechTrainingSession[];
  lastTrainingAt: string | null;
  updatedAt: string;
}

// ── STT ──────────────────────────────────────────────────────────────────────

export type STTStatus = 'idle' | 'listening' | 'processing' | 'error';

export interface STTPartialResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: true;
  alternatives?: Array<{ transcript: string; confidence: number }>;
}

export interface STTAdapter {
  readonly id: string;
  readonly displayName: string;
  start(options?: STTStartOptions): void;
  stop(): void;
  abort(): void;
  onPartialResult: ((result: STTPartialResult) => void) | null;
  onFinalResult: ((result: STTResult) => void) | null;
  onError: ((error: string) => void) | null;
  onStatusChange: ((status: STTStatus) => void) | null;
}

export interface STTStartOptions {
  language?: string;
  pauseToleranceMs?: number;
  customVocabulary?: string[];
}

// ── TTS ──────────────────────────────────────────────────────────────────────

export type TTSStatus = 'idle' | 'speaking' | 'paused' | 'error';

export interface TTSOptions {
  voiceId?: string;
  rate?: number;   // 0.5 – 2.0
  pitch?: number;  // 0.0 – 2.0
  volume?: number; // 0.0 – 1.0
}

export interface TTSAdapter {
  readonly id: string;
  readonly displayName: string;
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  repeatLast(): void;
  getStatus(): TTSStatus;
  getAvailableVoices(): SpeechSynthesisVoice[];
  onStatusChange: ((status: TTSStatus) => void) | null;
  onWordBoundary: ((word: string, charIndex: number) => void) | null;
}
