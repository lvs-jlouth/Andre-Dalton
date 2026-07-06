/**
 * Speech profile service.
 *
 * The speech profile captures personalised interaction preferences for a user
 * who may have non-standard speech cadence, dysarthric patterns, or other
 * motor/speech accessibility needs.
 *
 * This is NOT a medical diagnosis — it is an interaction preference profile.
 * Treat all data with the same privacy care as PII.
 */

export type PaceSetting = 'very_slow' | 'slow' | 'normal' | 'fast';
export type ClarificationMode = 'relaxed' | 'moderate' | 'aggressive';

export interface SpeechSubstitution {
  /** The word/phrase the user typically says */
  heard: string;
  /** The intended word/phrase */
  intended: string;
}

/** Wake word / wake phrase configuration */
export interface WakeWordConfig {
  /** Whether the wake phrase listener is active (always opt-in) */
  enabled: boolean;
  /** The phrase to listen for, e.g. "Hey J" */
  phrase: string;
  /**
   * Fuzzy match sensitivity 0-1.
   * 1.0 = exact only; lower values accept approximate matches.
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
  /** Unique profile identifier (UUID in production) */
  id: string;
  /** Display name shown in the UI */
  preferredName: string;
  /** Approximate speech pace */
  speechPace: PaceSetting;
  /** Max silence gap (ms) before treating utterance as complete */
  pauseToleranceMs: number;
  /** Common substitutions/misrecognitions and their corrections */
  substitutions: SpeechSubstitution[];
  /** Domain-specific vocabulary the STT engine should weight higher */
  customVocabulary: string[];
  /** Short command aliases, e.g. { "lights off": "turn off all lights" } */
  commandAliases: Record<string, string>;
  /** How aggressively to ask for clarification */
  clarificationMode: ClarificationMode;
  /** Confidence threshold below which a confirmation is triggered (0-1) */
  confirmationThreshold: number;
  /** User has consented to their corrections being stored for profile improvement */
  consentStoringCorrections: boolean;
  /** User has consented to speech profile being used for local learning */
  consentLocalLearning: boolean;
  /** Wake word configuration (opt-in) */
  wakeWord: WakeWordConfig;
  /** Guided practice sessions stored for local speech adaptation */
  trainingSessions: SpeechTrainingSession[];
  /** ISO 8601 timestamp of the most recent completed training session */
  lastTrainingAt: string | null;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

const DEFAULT_PROFILE: SpeechProfile = {
  id: 'default',
  preferredName: 'User',
  speechPace: 'normal',
  pauseToleranceMs: 2000,
  substitutions: [],
  customVocabulary: [],
  commandAliases: {},
  clarificationMode: 'moderate',
  confirmationThreshold: 0.6,
  consentStoringCorrections: false,
  consentLocalLearning: false,
  wakeWord: {
    enabled: false,
    phrase: 'Hey J',
    sensitivity: 0.75,
  },
  trainingSessions: [],
  lastTrainingAt: null,
  updatedAt: new Date().toISOString(),
};

export function getDefaultSpeechProfile(): SpeechProfile {
  return {
    ...DEFAULT_PROFILE,
    substitutions: [...DEFAULT_PROFILE.substitutions],
    customVocabulary: [...DEFAULT_PROFILE.customVocabulary],
    commandAliases: { ...DEFAULT_PROFILE.commandAliases },
    wakeWord: { ...DEFAULT_PROFILE.wakeWord },
    trainingSessions: DEFAULT_PROFILE.trainingSessions.map((session) => ({
      ...session,
      attempts: session.attempts.map((attempt) => ({ ...attempt })),
    })),
  };
}

export interface ProfileValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validates a raw speech profile payload.
 * Returns a typed result with human-readable errors.
 */
export function validateSpeechProfile(raw: unknown): ProfileValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const data = raw as Record<string, unknown>;

  if (data['preferredName'] !== undefined && typeof data['preferredName'] !== 'string') {
    errors.push('preferredName must be a string');
  }

  const validPaces: PaceSetting[] = ['very_slow', 'slow', 'normal', 'fast'];
  if (data['speechPace'] !== undefined && !validPaces.includes(data['speechPace'] as PaceSetting)) {
    errors.push(`speechPace must be one of: ${validPaces.join(', ')}`);
  }

  if (data['pauseToleranceMs'] !== undefined) {
    const v = data['pauseToleranceMs'];
    if (typeof v !== 'number' || v < 500 || v > 30_000) {
      errors.push('pauseToleranceMs must be a number between 500 and 30000');
    }
  }

  if (data['substitutions'] !== undefined && !Array.isArray(data['substitutions'])) {
    errors.push('substitutions must be an array');
  }

  if (data['customVocabulary'] !== undefined && !Array.isArray(data['customVocabulary'])) {
    errors.push('customVocabulary must be an array of strings');
  }

  if (data['commandAliases'] !== undefined && typeof data['commandAliases'] !== 'object') {
    errors.push('commandAliases must be an object');
  }

  const validModes: ClarificationMode[] = ['relaxed', 'moderate', 'aggressive'];
  if (
    data['clarificationMode'] !== undefined &&
    !validModes.includes(data['clarificationMode'] as ClarificationMode)
  ) {
    errors.push(`clarificationMode must be one of: ${validModes.join(', ')}`);
  }

  if (data['confirmationThreshold'] !== undefined) {
    const v = data['confirmationThreshold'];
    if (typeof v !== 'number' || v < 0 || v > 1) {
      errors.push('confirmationThreshold must be a number between 0 and 1');
    }
  }

  if (data['wakeWord'] !== undefined) {
    const ww = data['wakeWord'];
    if (typeof ww !== 'object' || ww === null) {
      errors.push('wakeWord must be an object');
    } else {
      const wwObj = ww as Record<string, unknown>;
      if (wwObj['enabled'] !== undefined && typeof wwObj['enabled'] !== 'boolean') {
        errors.push('wakeWord.enabled must be a boolean');
      }
      if (wwObj['phrase'] !== undefined) {
        if (typeof wwObj['phrase'] !== 'string' || (wwObj['phrase'] as string).trim().length < 2) {
          errors.push('wakeWord.phrase must be a string of at least 2 characters');
        }
      }
      if (wwObj['sensitivity'] !== undefined) {
        const s = wwObj['sensitivity'];
        if (typeof s !== 'number' || s < 0 || s > 1) {
          errors.push('wakeWord.sensitivity must be a number between 0 and 1');
        }
      }
    }
  }

  if (data['trainingSessions'] !== undefined) {
    const sessions = data['trainingSessions'];
    if (!Array.isArray(sessions)) {
      errors.push('trainingSessions must be an array');
    } else {
      sessions.forEach((session, sessionIndex) => {
        if (!session || typeof session !== 'object') {
          errors.push(`trainingSessions[${sessionIndex}] must be an object`);
          return;
        }

        const sessionData = session as Record<string, unknown>;
        const sessionPath = `trainingSessions[${sessionIndex}]`;
        const numericFields = ['promptsCompleted', 'averageConfidence', 'averageMatchScore'] as const;
        const stringFields = ['id', 'startedAt', 'completedAt'] as const;

        for (const field of stringFields) {
          if (typeof sessionData[field] !== 'string') {
            errors.push(`${sessionPath}.${field} must be a string`);
          }
        }

        for (const field of numericFields) {
          if (typeof sessionData[field] !== 'number') {
            errors.push(`${sessionPath}.${field} must be a number`);
          }
        }

        if (
          typeof sessionData['averageConfidence'] === 'number' &&
          (sessionData['averageConfidence'] < 0 || sessionData['averageConfidence'] > 1)
        ) {
          errors.push(`${sessionPath}.averageConfidence must be a number between 0 and 1`);
        }

        if (
          typeof sessionData['averageMatchScore'] === 'number' &&
          (sessionData['averageMatchScore'] < 0 || sessionData['averageMatchScore'] > 1)
        ) {
          errors.push(`${sessionPath}.averageMatchScore must be a number between 0 and 1`);
        }

        if (!Array.isArray(sessionData['attempts'])) {
          errors.push(`${sessionPath}.attempts must be an array`);
          return;
        }

        sessionData['attempts'].forEach((attempt, attemptIndex) => {
          if (!attempt || typeof attempt !== 'object') {
            errors.push(`${sessionPath}.attempts[${attemptIndex}] must be an object`);
            return;
          }

          const attemptData = attempt as Record<string, unknown>;
          const attemptPath = `${sessionPath}.attempts[${attemptIndex}]`;
          const attemptStringFields = ['promptId', 'expectedText', 'spokenText', 'recordedAt'] as const;

          for (const field of attemptStringFields) {
            if (typeof attemptData[field] !== 'string') {
              errors.push(`${attemptPath}.${field} must be a string`);
            }
          }

          if (
            typeof attemptData['confidence'] !== 'number' ||
            attemptData['confidence'] < 0 ||
            attemptData['confidence'] > 1
          ) {
            errors.push(`${attemptPath}.confidence must be a number between 0 and 1`);
          }

          if (
            typeof attemptData['matchScore'] !== 'number' ||
            attemptData['matchScore'] < 0 ||
            attemptData['matchScore'] > 1
          ) {
            errors.push(`${attemptPath}.matchScore must be a number between 0 and 1`);
          }
        });
      });
    }
  }

  if (data['lastTrainingAt'] !== undefined && data['lastTrainingAt'] !== null && typeof data['lastTrainingAt'] !== 'string') {
    errors.push('lastTrainingAt must be a string or null');
  }

  return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
}

/**
 * Merges a validated raw payload over the default profile.
 * Caller must run validateSpeechProfile first.
 */
export function parseSpeechProfile(
  raw: unknown,
  baseProfile: SpeechProfile = getDefaultSpeechProfile(),
): SpeechProfile {
  const base = getDefaultSpeechProfile();
  const startingProfile = {
    ...base,
    ...baseProfile,
    substitutions: [...baseProfile.substitutions],
    customVocabulary: [...baseProfile.customVocabulary],
    commandAliases: { ...baseProfile.commandAliases },
    wakeWord: { ...base.wakeWord, ...baseProfile.wakeWord },
    trainingSessions: baseProfile.trainingSessions.map((session) => ({
      ...session,
      attempts: session.attempts.map((attempt) => ({ ...attempt })),
    })),
  };
  const data = (raw ?? {}) as Partial<SpeechProfile>;

  return {
    ...startingProfile,
    ...data,
    // Deep-merge wakeWord so partial updates (e.g. only phrase) don't wipe other fields
    wakeWord: {
      ...startingProfile.wakeWord,
      ...(data.wakeWord ?? {}),
    },
    trainingSessions: Array.isArray(data.trainingSessions)
      ? data.trainingSessions.map((session) => ({
          ...session,
          attempts: session.attempts.map((attempt) => ({ ...attempt })),
        })).slice(-25)
      : startingProfile.trainingSessions,
    lastTrainingAt: data.lastTrainingAt ?? startingProfile.lastTrainingAt,
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeSpeechProfileForStorage(profile: SpeechProfile): SpeechProfile {
  return {
    ...profile,
    preferredName: profile.consentLocalLearning ? profile.preferredName : DEFAULT_PROFILE.preferredName,
    substitutions: profile.consentStoringCorrections ? profile.substitutions : [],
    customVocabulary: profile.consentLocalLearning ? profile.customVocabulary : [],
    commandAliases: profile.consentLocalLearning ? profile.commandAliases : {},
    trainingSessions: profile.consentLocalLearning ? profile.trainingSessions.slice(-25) : [],
    lastTrainingAt: profile.consentLocalLearning ? profile.lastTrainingAt : null,
  };
}
