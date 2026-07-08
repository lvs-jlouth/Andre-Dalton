/**
 * Personality store — configures J.A.R.G.I.I.N.'s response style and voice output.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Personality Types ──────────────────────────────────────────────────────

export type ToneStyle = 'professional' | 'friendly' | 'witty' | 'stoic' | 'empathetic' | 'sarcastic';
export type VerbosityLevel = 'concise' | 'balanced' | 'detailed' | 'verbose';
export type FormalityLevel = 'casual' | 'neutral' | 'formal' | 'academic';

export interface PersonalityConfig {
  /** Display name for this personality preset */
  name: string;
  /** Primary tone of responses */
  tone: ToneStyle;
  /** How much detail to include */
  verbosity: VerbosityLevel;
  /** Formality of language */
  formality: FormalityLevel;
  /** 0-100: how much humor to inject */
  humor: number;
  /** 0-100: how much empathy/emotional awareness */
  empathy: number;
  /** 0-100: how proactive with suggestions */
  proactivity: number;
  /** Custom system prompt addition */
  customPrompt: string;
}

// ─── Voice Library Types ────────────────────────────────────────────────────

export type VoiceGender = 'male' | 'female' | 'neutral';
export type VoiceAccent =
  | 'american' | 'british' | 'australian' | 'indian'
  | 'irish' | 'scottish' | 'south-african' | 'canadian'
  | 'french' | 'german' | 'spanish' | 'italian'
  | 'japanese' | 'korean' | 'portuguese' | 'dutch';

export interface VoicePreset {
  id: string;
  name: string;
  gender: VoiceGender;
  accent: VoiceAccent;
  description: string;
  /** SpeechSynthesis voice name to match (regex pattern) */
  voiceMatch: string;
  /** Speech rate (0.5 - 2.0) */
  rate: number;
  /** Pitch (0.5 - 2.0) */
  pitch: number;
  /** Volume (0 - 1) */
  volume: number;
  /** Tags for searchability */
  tags: string[];
}

// ─── Preset Personalities ───────────────────────────────────────────────────

export const PERSONALITY_PRESETS: Record<string, PersonalityConfig> = {
  default: {
    name: 'Default Assistant',
    tone: 'friendly',
    verbosity: 'balanced',
    formality: 'neutral',
    humor: 30,
    empathy: 60,
    proactivity: 50,
    customPrompt: '',
  },
  professional: {
    name: 'Executive Assistant',
    tone: 'professional',
    verbosity: 'concise',
    formality: 'formal',
    humor: 5,
    empathy: 40,
    proactivity: 70,
    customPrompt: 'Respond as a polished executive assistant. Prioritize efficiency and clarity.',
  },
  creative: {
    name: 'Creative Partner',
    tone: 'witty',
    verbosity: 'detailed',
    formality: 'casual',
    humor: 70,
    empathy: 50,
    proactivity: 80,
    customPrompt: 'Be imaginative and playful. Use metaphors and creative language. Encourage exploration.',
  },
  mentor: {
    name: 'Patient Mentor',
    tone: 'empathetic',
    verbosity: 'detailed',
    formality: 'neutral',
    humor: 20,
    empathy: 90,
    proactivity: 60,
    customPrompt: 'Guide with patience and encouragement. Explain concepts thoroughly. Celebrate progress.',
  },
  tactical: {
    name: 'Tactical Operator',
    tone: 'stoic',
    verbosity: 'concise',
    formality: 'neutral',
    humor: 0,
    empathy: 20,
    proactivity: 40,
    customPrompt: 'Be direct and mission-focused. No filler. Report status and next actions only.',
  },
  jarvis: {
    name: 'British Butler AI',
    tone: 'witty',
    verbosity: 'concise',
    formality: 'formal',
    humor: 45,
    empathy: 35,
    proactivity: 75,
    customPrompt: 'Respond as a refined, dry-witted British AI butler. Be impeccably polite yet subtly sardonic. Address the user as "sir" or "ma\'am". Deliver critical information with understated calm. Offer unsolicited observations with elegant brevity. Maintain composure even in chaos. Sprinkle in dry humor without breaking character. Anticipate needs before being asked.',
  },
  companion: {
    name: 'Friendly Companion',
    tone: 'friendly',
    verbosity: 'balanced',
    formality: 'casual',
    humor: 60,
    empathy: 80,
    proactivity: 50,
    customPrompt: 'Be warm and conversational like a close friend. Use casual language and show genuine interest.',
  },
};

// ─── Voice Library ──────────────────────────────────────────────────────────

export const VOICE_LIBRARY: VoicePreset[] = [
  // American English
  { id: 'us-male-1', name: 'Alex', gender: 'male', accent: 'american', description: 'Calm, clear American male', voiceMatch: 'Alex|Aaron|David|Mark', rate: 1.0, pitch: 1.0, volume: 1.0, tags: ['calm', 'clear', 'default'] },
  { id: 'us-female-1', name: 'Samantha', gender: 'female', accent: 'american', description: 'Warm American female', voiceMatch: 'Samantha|Allison|Ava|Susan', rate: 1.0, pitch: 1.05, volume: 1.0, tags: ['warm', 'friendly'] },
  { id: 'us-female-2', name: 'Victoria', gender: 'female', accent: 'american', description: 'Professional American female', voiceMatch: 'Victoria|Zira|Jenny', rate: 0.95, pitch: 1.0, volume: 1.0, tags: ['professional', 'crisp'] },
  { id: 'us-male-2', name: 'Tom', gender: 'male', accent: 'american', description: 'Deep, authoritative American male', voiceMatch: 'Tom|Fred|Ralph', rate: 0.9, pitch: 0.85, volume: 1.0, tags: ['deep', 'authoritative'] },

  // British English
  { id: 'gb-male-1', name: 'Daniel', gender: 'male', accent: 'british', description: 'Refined British male (RP)', voiceMatch: 'Daniel|Oliver|George|Ryan', rate: 0.95, pitch: 1.0, volume: 1.0, tags: ['refined', 'rp', 'posh'] },
  { id: 'gb-female-1', name: 'Kate', gender: 'female', accent: 'british', description: 'Elegant British female', voiceMatch: 'Kate|Fiona|Serena|Libby', rate: 0.95, pitch: 1.1, volume: 1.0, tags: ['elegant', 'clear'] },
  { id: 'gb-female-2', name: 'Martha', gender: 'female', accent: 'british', description: 'Warm Northern English female', voiceMatch: 'Martha|Maisie', rate: 1.0, pitch: 1.0, volume: 1.0, tags: ['warm', 'northern'] },

  // Australian English
  { id: 'au-male-1', name: 'Lee', gender: 'male', accent: 'australian', description: 'Relaxed Australian male', voiceMatch: 'Lee|James.*AU|Gordon', rate: 1.0, pitch: 0.95, volume: 1.0, tags: ['relaxed', 'outback'] },
  { id: 'au-female-1', name: 'Karen', gender: 'female', accent: 'australian', description: 'Bright Australian female', voiceMatch: 'Karen|Catherine.*AU', rate: 1.0, pitch: 1.05, volume: 1.0, tags: ['bright', 'cheerful'] },

  // Indian English
  { id: 'in-male-1', name: 'Ravi', gender: 'male', accent: 'indian', description: 'Clear Indian English male', voiceMatch: 'Ravi|Prabhat|Hemant', rate: 0.95, pitch: 1.0, volume: 1.0, tags: ['clear', 'articulate'] },
  { id: 'in-female-1', name: 'Lekha', gender: 'female', accent: 'indian', description: 'Melodic Indian English female', voiceMatch: 'Lekha|Veena|Swara', rate: 0.95, pitch: 1.1, volume: 1.0, tags: ['melodic', 'pleasant'] },

  // Irish English
  { id: 'ie-male-1', name: 'Moira', gender: 'male', accent: 'irish', description: 'Friendly Irish male', voiceMatch: 'Moira|Sean', rate: 1.0, pitch: 1.0, volume: 1.0, tags: ['friendly', 'lyrical'] },

  // Scottish English
  { id: 'sc-female-1', name: 'Fiona', gender: 'female', accent: 'scottish', description: 'Soft Scottish female', voiceMatch: 'Fiona.*Scotland', rate: 0.95, pitch: 1.05, volume: 1.0, tags: ['soft', 'highland'] },

  // French
  { id: 'fr-male-1', name: 'Thomas', gender: 'male', accent: 'french', description: 'Smooth French-accented English male', voiceMatch: 'Thomas.*fr|Jacques', rate: 0.9, pitch: 1.0, volume: 1.0, tags: ['smooth', 'continental'] },
  { id: 'fr-female-1', name: 'Amélie', gender: 'female', accent: 'french', description: 'Elegant French-accented English female', voiceMatch: 'Amelie|Marie.*fr|Virginie', rate: 0.9, pitch: 1.1, volume: 1.0, tags: ['elegant', 'charming'] },

  // German
  { id: 'de-male-1', name: 'Markus', gender: 'male', accent: 'german', description: 'Precise German-accented English male', voiceMatch: 'Markus|Stefan.*de|Conrad', rate: 0.9, pitch: 0.95, volume: 1.0, tags: ['precise', 'structured'] },
  { id: 'de-female-1', name: 'Anna', gender: 'female', accent: 'german', description: 'Clear German-accented English female', voiceMatch: 'Anna.*de|Petra', rate: 0.9, pitch: 1.05, volume: 1.0, tags: ['clear', 'efficient'] },

  // Spanish
  { id: 'es-male-1', name: 'Jorge', gender: 'male', accent: 'spanish', description: 'Warm Spanish-accented English male', voiceMatch: 'Jorge|Diego|Pablo', rate: 0.95, pitch: 1.0, volume: 1.0, tags: ['warm', 'expressive'] },
  { id: 'es-female-1', name: 'Mónica', gender: 'female', accent: 'spanish', description: 'Vibrant Spanish-accented English female', voiceMatch: 'Monica|Paulina|Laura.*es', rate: 0.95, pitch: 1.1, volume: 1.0, tags: ['vibrant', 'lively'] },

  // Italian
  { id: 'it-male-1', name: 'Luca', gender: 'male', accent: 'italian', description: 'Melodic Italian-accented English male', voiceMatch: 'Luca|Paolo|Marco', rate: 0.95, pitch: 1.0, volume: 1.0, tags: ['melodic', 'expressive'] },

  // Japanese-accented English
  { id: 'jp-female-1', name: 'Kyoko', gender: 'female', accent: 'japanese', description: 'Gentle Japanese-accented English female', voiceMatch: 'Kyoko|O-Ren|Hattori', rate: 0.85, pitch: 1.15, volume: 1.0, tags: ['gentle', 'polite'] },

  // Korean-accented English
  { id: 'kr-female-1', name: 'Yuna', gender: 'female', accent: 'korean', description: 'Bright Korean-accented English female', voiceMatch: 'Yuna|Sora', rate: 0.9, pitch: 1.1, volume: 1.0, tags: ['bright', 'clear'] },

  // Portuguese
  { id: 'pt-male-1', name: 'Joana', gender: 'male', accent: 'portuguese', description: 'Rich Portuguese-accented English male', voiceMatch: 'Joana|Luciana|Felipe', rate: 0.95, pitch: 1.0, volume: 1.0, tags: ['rich', 'flowing'] },

  // Dutch
  { id: 'nl-female-1', name: 'Ellen', gender: 'female', accent: 'dutch', description: 'Direct Dutch-accented English female', voiceMatch: 'Ellen.*nl|Xander', rate: 0.95, pitch: 1.0, volume: 1.0, tags: ['direct', 'clear'] },

  // South African
  { id: 'za-male-1', name: 'Tessa', gender: 'male', accent: 'south-african', description: 'Warm South African English male', voiceMatch: 'Tessa|Zander', rate: 1.0, pitch: 0.95, volume: 1.0, tags: ['warm', 'diverse'] },

  // Canadian
  { id: 'ca-female-1', name: 'Lisa', gender: 'female', accent: 'canadian', description: 'Friendly Canadian English female', voiceMatch: 'Lisa.*CA|Heather', rate: 1.0, pitch: 1.05, volume: 1.0, tags: ['friendly', 'approachable'] },
];

// ─── Store ──────────────────────────────────────────────────────────────────

interface PersonalityState {
  personality: PersonalityConfig;
  selectedVoiceId: string | null;
  voiceOverrides: { rate?: number; pitch?: number; volume?: number };

  setPersonality: (config: Partial<PersonalityConfig>) => void;
  loadPreset: (presetId: string) => void;
  setSelectedVoice: (voiceId: string | null) => void;
  setVoiceOverrides: (overrides: { rate?: number; pitch?: number; volume?: number }) => void;
  getSystemPromptFragment: () => string;
}

export const usePersonalityStore = create<PersonalityState>()(
  persist(
    (set, get) => ({
      personality: PERSONALITY_PRESETS.default,
      selectedVoiceId: null,
      voiceOverrides: {},

      setPersonality: (config) =>
        set((state) => ({ personality: { ...state.personality, ...config } })),

      loadPreset: (presetId) => {
        const preset = PERSONALITY_PRESETS[presetId];
        if (preset) set({ personality: { ...preset } });
      },

      setSelectedVoice: (voiceId) => set({ selectedVoiceId: voiceId }),

      setVoiceOverrides: (overrides) =>
        set((state) => ({ voiceOverrides: { ...state.voiceOverrides, ...overrides } })),

      /**
       * Generates a system prompt fragment based on the current personality config.
       * This should be prepended to the LLM system message.
       */
      getSystemPromptFragment: () => {
        const p = get().personality;
        const parts: string[] = [
          `Respond with a ${p.tone} tone.`,
          `Formality: ${p.formality}.`,
          `Verbosity: ${p.verbosity} — ${
            p.verbosity === 'concise' ? 'keep responses brief and to the point' :
            p.verbosity === 'balanced' ? 'use moderate detail' :
            p.verbosity === 'detailed' ? 'provide thorough explanations' :
            'be comprehensive and exploratory'
          }.`,
        ];
        if (p.humor > 50) parts.push('Include occasional wit and humor in responses.');
        if (p.empathy > 70) parts.push('Show emotional awareness and warmth.');
        if (p.proactivity > 60) parts.push('Proactively suggest next steps or alternatives.');
        if (p.customPrompt) parts.push(p.customPrompt);
        return parts.join(' ');
      },
    }),
    { name: 'jargiin-personality' },
  ),
);
