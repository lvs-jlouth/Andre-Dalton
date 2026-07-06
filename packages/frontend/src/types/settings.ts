export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  fontScale: number;       // 0.8 – 2.5
  captions: boolean;
  onHandedLayout: 'none' | 'left' | 'right';
  keyboardNavigation: boolean;
  largeHitTargets: boolean;
}

export interface PrivacySettings {
  persistTranscripts: boolean;
  consentSpeechImprovement: boolean;
  debugMode: boolean;
}

export interface AppSettings {
  accessibility: AccessibilitySettings;
  privacy: PrivacySettings;
}

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  fontScale: 1.0,
  captions: true,
  onHandedLayout: 'none',
  keyboardNavigation: true,
  largeHitTargets: true,
};

export const DEFAULT_PRIVACY: PrivacySettings = {
  persistTranscripts: false,
  consentSpeechImprovement: false,
  debugMode: false,
};
