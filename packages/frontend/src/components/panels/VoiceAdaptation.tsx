import { useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { AccordionSection } from '../ui/AccordionSection.js';
import { useSpeechProfileStore } from '../../store/speechProfileStore.js';
import type { PaceSetting, ClarificationMode, PersonalityStyle, VoiceEngine } from '../../types/speech.js';
import { useTTS } from '../../hooks/useTTS.js';

const PACE_OPTIONS: { value: PaceSetting; label: string }[] = [
  { value: 'very_slow', label: 'Very slow' },
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
];

const CLARIFICATION_OPTIONS: { value: ClarificationMode; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed — infer freely' },
  { value: 'moderate', label: 'Moderate — occasional check-ins' },
  { value: 'aggressive', label: 'Careful — confirm before acting' },
];

const VOICE_ENGINES: { value: VoiceEngine; label: string; detail: string }[] = [
  { value: 'browser', label: 'Browser speech synthesis', detail: 'Built-in voices from your OS/browser.' },
  { value: 'piper', label: 'Piper (open source)', detail: 'Local/offline neural TTS model family.' },
  { value: 'coqui-xtts', label: 'Coqui XTTS (open source)', detail: 'High-quality multilingual voice model.' },
  { value: 'styletts2', label: 'StyleTTS2 (open source)', detail: 'Expressive speech with style controls.' },
  { value: 'kokoro', label: 'Kokoro (open source)', detail: 'Lightweight open model for fast inference.' },
];

interface OpenSourceVoicePreset {
  id: string;
  label: string;
  detail: string;
  recommendedRate: number;
  recommendedPitch: number;
}

type OpenSourceEngine = Exclude<VoiceEngine, 'browser'>;

const OPEN_SOURCE_VOICES: Record<Exclude<VoiceEngine, 'browser'>, OpenSourceVoicePreset[]> = {
  piper: [
    { id: 'en_GB-alan-medium', label: 'Alan — British male (natural)', detail: 'Balanced conversational British male voice.', recommendedRate: 0.95, recommendedPitch: 0.92 },
    { id: 'en_GB-northern_english-male-medium', label: 'Northern English — male (warm)', detail: 'Warmer British regional male tone.', recommendedRate: 0.96, recommendedPitch: 0.9 },
    { id: 'en_US-lessac-medium', label: 'Lessac — US female (clear)', detail: 'Natural, clear US-accent general assistant voice.', recommendedRate: 0.98, recommendedPitch: 1.02 },
    { id: 'en_US-ryan-high', label: 'Ryan — US male (broadcast)', detail: 'Confident, authoritative male delivery.', recommendedRate: 0.94, recommendedPitch: 0.9 },
    { id: 'en_US-amy-medium', label: 'Amy — US female (friendly)', detail: 'Friendly and natural assistant style voice.', recommendedRate: 1.0, recommendedPitch: 1.03 },
  ],
  'coqui-xtts': [
    { id: 'xtts_v2_en_british_male', label: 'XTTS British male (natural)', detail: 'Natural British male profile with strong intelligibility.', recommendedRate: 0.95, recommendedPitch: 0.92 },
    { id: 'xtts_v2_en_british_female', label: 'XTTS British female (natural)', detail: 'Smooth British female tone for longer sessions.', recommendedRate: 0.98, recommendedPitch: 1.02 },
    { id: 'xtts_v2_en_scientific_narrator', label: 'XTTS scientific narrator', detail: 'Clear, precise narration for technical explanations.', recommendedRate: 0.94, recommendedPitch: 0.96 },
    { id: 'xtts_v2_hq', label: 'XTTS HQ universal', detail: 'High-fidelity multilingual XTTS voice synthesis.', recommendedRate: 0.96, recommendedPitch: 1.0 },
  ],
  styletts2: [
    { id: 'styletts2_en_base', label: 'StyleTTS2 neutral natural', detail: 'Natural default with neutral conversational style.', recommendedRate: 0.97, recommendedPitch: 1.0 },
    { id: 'styletts2_en_expressive', label: 'StyleTTS2 expressive', detail: 'More expressive prosody with natural pacing.', recommendedRate: 0.95, recommendedPitch: 1.02 },
    { id: 'styletts2_en_formal_male', label: 'StyleTTS2 formal male', detail: 'Formal, composed male voice suited to assistant use.', recommendedRate: 0.93, recommendedPitch: 0.9 },
    { id: 'styletts2_en_warm_female', label: 'StyleTTS2 warm female', detail: 'Warm, natural female tone with clear articulation.', recommendedRate: 0.98, recommendedPitch: 1.04 },
  ],
  kokoro: [
    { id: 'kokoro-en-v2-natural', label: 'Kokoro natural v2', detail: 'Most natural Kokoro preset for everyday dialogue.', recommendedRate: 0.98, recommendedPitch: 1.0 },
    { id: 'kokoro-en-v2-authoritative', label: 'Kokoro authoritative', detail: 'Confident low-register tone for directive responses.', recommendedRate: 0.94, recommendedPitch: 0.92 },
    { id: 'kokoro-en-v2-friendly', label: 'Kokoro friendly', detail: 'Slightly brighter tone for friendly assistance.', recommendedRate: 1.0, recommendedPitch: 1.05 },
    { id: 'kokoro-en-v1', label: 'Kokoro classic v1', detail: 'Legacy lightweight model for fast local playback.', recommendedRate: 0.98, recommendedPitch: 1.0 },
  ],
};

function getOpenSourceVoices(engine: OpenSourceEngine): OpenSourceVoicePreset[] {
  return OPEN_SOURCE_VOICES[engine];
}

function resolveOpenSourceVoice(engine: OpenSourceEngine, modelId: string | undefined): OpenSourceVoicePreset {
  const voices = getOpenSourceVoices(engine);
  const found = modelId ? voices.find((voice) => voice.id === modelId) : undefined;
  return found ?? voices[0];
}

const PERSONALITY_PRESETS: Array<{ value: PersonalityStyle; label: string; prompt: string }> = [
  {
    value: 'balanced',
    label: 'Balanced Assistant',
    prompt: 'Be calm, direct, and practical. Keep responses concise and easy to follow.',
  },
  {
    value: 'british-butler',
    label: 'British Butler',
    prompt: 'Use polished British butler etiquette: courteous, composed, formal, and discreetly witty.',
  },
  {
    value: 'time-traveler',
    label: 'Time Traveler (Doctor-inspired)',
    prompt: 'Use an energetic, curious, science-forward persona with adventurous optimism and clever humor.',
  },
];

/**
 * VoiceAdaptation — speech profile editor.
 * Includes wake word configuration (opt-in, default phrase "Hey J").
 */
export function VoiceAdaptation() {
  const profile = useSpeechProfileStore((s) => s.profile);
  const updateProfile = useSpeechProfileStore((s) => s.updateProfile);
  const setWakeWord = useSpeechProfileStore((s) => s.setWakeWord);
  const addSubstitution = useSpeechProfileStore((s) => s.addSubstitution);
  const removeSubstitution = useSpeechProfileStore((s) => s.removeSubstitution);
  const addVocabularyWord = useSpeechProfileStore((s) => s.addVocabularyWord);
  const removeVocabularyWord = useSpeechProfileStore((s) => s.removeVocabularyWord);
  const isDirty = useSpeechProfileStore((s) => s.isDirty);
  const { speak, stop, ttsStatus } = useTTS();

  const [newHeard, setNewHeard] = useState('');
  const [newIntended, setNewIntended] = useState('');
  const [newWord, setNewWord] = useState('');
  const safeProfile = (profile && typeof profile === 'object' ? profile : {}) as Partial<typeof profile>;
  const wakeWordRaw = safeProfile.wakeWord;
  const wakeWord = wakeWordRaw && typeof wakeWordRaw === 'object'
    ? {
        enabled: Boolean((wakeWordRaw as { enabled?: unknown }).enabled),
        phrase: typeof (wakeWordRaw as { phrase?: unknown }).phrase === 'string' ? (wakeWordRaw as { phrase: string }).phrase : 'Hey J',
        sensitivity: Number.isFinite((wakeWordRaw as { sensitivity?: unknown }).sensitivity)
          ? Number((wakeWordRaw as { sensitivity: number }).sensitivity)
          : 0.75,
      }
    : { enabled: false, phrase: 'Hey J', sensitivity: 0.75 };
  const substitutions = Array.isArray(safeProfile.substitutions) ? safeProfile.substitutions : [];
  const customVocabulary = Array.isArray(safeProfile.customVocabulary) ? safeProfile.customVocabulary : [];
  const voiceEngine = safeProfile.voiceEngine && VOICE_ENGINES.some((e) => e.value === safeProfile.voiceEngine)
    ? safeProfile.voiceEngine
    : 'browser';
  const personalityStyle = safeProfile.personalityStyle ?? 'balanced';

  const [wakePhraseDraft, setWakePhraseDraft] = useState(wakeWord.phrase);
  const [personalityPromptDraft, setPersonalityPromptDraft] = useState(
    typeof safeProfile.personalityPrompt === 'string' ? safeProfile.personalityPrompt : '',
  );
  const [previewScript, setPreviewScript] = useState(
    'Good day. I am your J.A.R.G.I.I.N. voice preview. I can deliver polished guidance, clear scientific insight, and calm confidence while remaining concise and practical.',
  );
  const selectedOpenSourceEngine: OpenSourceEngine | null = voiceEngine === 'browser' ? null : voiceEngine;
  const selectedOpenSourceVoice = selectedOpenSourceEngine
    ? resolveOpenSourceVoice(
      selectedOpenSourceEngine,
      typeof safeProfile.voiceModel === 'string' ? safeProfile.voiceModel : undefined,
    )
    : null;
  const voiceRate = Number.isFinite(safeProfile.voiceRate) ? Number(safeProfile.voiceRate) : 0.9;
  const voicePitch = Number.isFinite(safeProfile.voicePitch) ? Number(safeProfile.voicePitch) : 1.0;
  const voiceVolume = Number.isFinite(safeProfile.voiceVolume) ? Number(safeProfile.voiceVolume) : 1.0;
  const wakeSensitivity = Number.isFinite(wakeWord.sensitivity) ? wakeWord.sensitivity : 0.75;

  function addSub() {
    if (newHeard.trim() && newIntended.trim()) {
      addSubstitution(newHeard.trim(), newIntended.trim());
      setNewHeard('');
      setNewIntended('');
    }
  }

  function addWord() {
    if (newWord.trim()) {
      addVocabularyWord(newWord.trim());
      setNewWord('');
    }
  }

  function applyWakePhrase() {
    const phrase = wakePhraseDraft.trim();
    if (phrase.length >= 2) {
      setWakeWord({ phrase });
    }
  }

  function applyPersonalityPreset(style: PersonalityStyle) {
    const preset = PERSONALITY_PRESETS.find((p) => p.value === style);
    if (!preset) return;
    updateProfile({
      personalityStyle: preset.value,
      personalityPrompt: preset.prompt,
    });
    setPersonalityPromptDraft(preset.prompt);
  }

  function applyPersonalityPrompt() {
    updateProfile({ personalityPrompt: personalityPromptDraft.trim() });
  }

  async function playPreviewScript() {
    const preferredName = typeof safeProfile.preferredName === 'string' && safeProfile.preferredName.trim().length > 0
      ? safeProfile.preferredName.trim()
      : 'there';
    const finalScript = previewScript.trim() || 'Voice preview is ready.';
    await speak(`Hello ${preferredName}. ${finalScript}`);
  }

  return (
    <Panel title="Voice Adaptation" aria-label="Speech profile editor">
      <div className="space-y-3 text-sm">

        <AccordionSection
          id="voice-wake-word"
          title="Wake word / phrase"
          subtitle="Hands-free activation and phrase sensitivity"
          defaultOpen
        >
        <section aria-labelledby="wake-word-heading">
          <h3
            id="wake-word-heading"
            className="sr-only"
          >
            Wake Word / Phrase
          </h3>

          {/* Enable toggle */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-mono text-aurora-white text-sm">Enable wake phrase</p>
              <p id="wake-word-desc" className="text-aurora-muted text-xs mt-0.5">
                When enabled, J.A.R.G.I.I.N. listens passively for your phrase and activates
                automatically — no button needed. Off by default.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={wakeWord.enabled}
              aria-describedby="wake-word-desc"
              onClick={() => setWakeWord({ enabled: !wakeWord.enabled })}
              className={`
                relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 focus:ring-offset-2 focus:ring-offset-aurora-panel
                ${wakeWord.enabled ? 'bg-aurora-cyan/60' : 'bg-aurora-border/40'}
              `}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  wakeWord.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
                aria-hidden="true"
              />
              <span className="sr-only">
                {wakeWord.enabled ? 'Wake phrase enabled' : 'Wake phrase disabled'}
              </span>
            </button>
          </div>

          {/* Phrase editor — shown regardless of enabled state so user can pre-configure */}
          <div className="space-y-3 pl-0.5">
            <div>
              <label htmlFor="wake-phrase" className="block text-aurora-muted font-mono text-xs mb-1">
                Wake phrase (current: "<span className="text-aurora-cyan">{wakeWord.phrase}</span>")
              </label>
              <div className="flex gap-2">
                <input
                  id="wake-phrase"
                  type="text"
                  value={wakePhraseDraft}
                  onChange={(e) => setWakePhraseDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyWakePhrase(); } }}
                  placeholder='e.g. Hey J, Hey J.A.R.G.I.I.N., Go time…'
                  aria-describedby="wake-phrase-hint"
                  minLength={2}
                  maxLength={40}
                  className="flex-1 bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-1.5 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 min-h-[44px]"
                />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={applyWakePhrase}
                  disabled={wakePhraseDraft.trim().length < 2}
                  aria-label="Save wake phrase"
                >
                  Save
                </Button>
              </div>
              <p id="wake-phrase-hint" className="text-aurora-muted text-xs mt-1">
                Minimum 2 characters. Short, distinct phrases work best (e.g. "Hey J").
              </p>
            </div>

            {/* Fuzzy sensitivity */}
            <div>
              <label htmlFor="wake-sensitivity" className="block text-aurora-muted font-mono text-xs mb-1">
                Match sensitivity:{' '}
                <span className="text-aurora-white">
                  {wakeSensitivity >= 0.9
                    ? 'Strict (exact match)'
                    : wakeSensitivity >= 0.7
                    ? 'Balanced'
                    : 'Relaxed (approximate)'}
                </span>
              </label>
              <input
                id="wake-sensitivity"
                type="range"
                min={0.4}
                max={1.0}
                step={0.05}
                value={wakeSensitivity}
                onChange={(e) => setWakeWord({ sensitivity: Number(e.target.value) })}
                className="w-full accent-aurora-cyan"
                aria-valuemin={0.4}
                aria-valuemax={1.0}
                aria-valuenow={wakeSensitivity}
                aria-valuetext={
                  wakeSensitivity >= 0.9
                    ? 'Strict'
                    : wakeSensitivity >= 0.7
                    ? 'Balanced'
                    : 'Relaxed'
                }
              />
              <div className="flex justify-between text-aurora-muted text-xs mt-0.5 font-mono">
                <span>← More permissive</span>
                <span>More exact →</span>
              </div>
              <p className="text-aurora-muted text-xs mt-1">
                Lower sensitivity accepts approximate speech — useful if your phrasing varies.
              </p>
            </div>
          </div>
        </section>
        </AccordionSection>

        <AccordionSection
          id="voice-engine-personality"
          title="Voice engine & personality"
          subtitle="Voice source, tuning, and style"
          defaultOpen
        >
        <section aria-labelledby="voice-engine-heading">
          <h3
            id="voice-engine-heading"
            className="sr-only"
          >
            Voice Engine & Personality
          </h3>

          <div className="mb-4">
            <label htmlFor="voice-engine" className="block text-aurora-muted font-mono text-xs mb-1">
              Voice engine
            </label>
            <select
              id="voice-engine"
              value={voiceEngine}
              onChange={(e) => {
                const voiceEngine = e.target.value as VoiceEngine;
                if (voiceEngine === 'browser') {
                  updateProfile({ voiceEngine, voiceModel: 'Browser default voice' });
                  return;
                }
                const firstVoice = resolveOpenSourceVoice(voiceEngine, undefined);
                updateProfile({
                  voiceEngine,
                  voiceModel: firstVoice.id,
                  voiceRate: firstVoice.recommendedRate,
                  voicePitch: firstVoice.recommendedPitch,
                });
              }}
              className="w-full bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-1.5 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 min-h-[44px]"
            >
              {VOICE_ENGINES.map((engine) => (
                <option key={engine.value} value={engine.value}>
                  {engine.label}
                </option>
              ))}
            </select>
            <p className="text-aurora-muted text-xs mt-1">
              {VOICE_ENGINES.find((e) => e.value === voiceEngine)?.detail}
            </p>
          </div>

          {selectedOpenSourceEngine && (
            <>
              <div className="mb-4">
                <label htmlFor="voice-model" className="block text-aurora-muted font-mono text-xs mb-1">
                  Open-source voice model
                </label>
                <select
                  id="voice-model"
                  value={selectedOpenSourceVoice?.id ?? getOpenSourceVoices(selectedOpenSourceEngine)[0].id}
                  onChange={(e) => {
                    const nextVoice = resolveOpenSourceVoice(selectedOpenSourceEngine, e.target.value);
                    updateProfile({
                      voiceModel: nextVoice.id,
                      voiceRate: nextVoice.recommendedRate,
                      voicePitch: nextVoice.recommendedPitch,
                    });
                  }}
                  className="w-full bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-1.5 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 min-h-[44px]"
                >
                  {getOpenSourceVoices(selectedOpenSourceEngine).map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                <p className="text-aurora-muted text-xs mt-1">
                  {selectedOpenSourceVoice?.detail}
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="voice-endpoint" className="block text-aurora-muted font-mono text-xs mb-1">
                  Local model endpoint
                </label>
                <input
                  id="voice-endpoint"
                  type="url"
                  value={typeof safeProfile.voiceEndpoint === 'string' ? safeProfile.voiceEndpoint : ''}
                  onChange={(e) => updateProfile({ voiceEndpoint: e.target.value })}
                  placeholder="http://localhost:5002/tts"
                  className="w-full bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-1.5 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 min-h-[44px]"
                />
              </div>
            </>
          )}

          <div className="mb-4">
            <label htmlFor="voice-rate" className="block text-aurora-muted font-mono text-xs mb-1">
              Voice rate: {voiceRate.toFixed(2)}
            </label>
            <input
              id="voice-rate"
              type="range"
              min={0.6}
              max={1.3}
              step={0.05}
              value={voiceRate}
              onChange={(e) => updateProfile({ voiceRate: Number(e.target.value) })}
              className="w-full accent-aurora-cyan"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="voice-pitch" className="block text-aurora-muted font-mono text-xs mb-1">
              Voice pitch: {voicePitch.toFixed(2)}
            </label>
            <input
              id="voice-pitch"
              type="range"
              min={0.7}
              max={1.4}
              step={0.05}
              value={voicePitch}
              onChange={(e) => updateProfile({ voicePitch: Number(e.target.value) })}
              className="w-full accent-aurora-cyan"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="voice-volume" className="block text-aurora-muted font-mono text-xs mb-1">
              Voice volume: {voiceVolume.toFixed(2)}
            </label>
            <input
              id="voice-volume"
              type="range"
              min={0.4}
              max={1.0}
              step={0.05}
              value={voiceVolume}
              onChange={(e) => updateProfile({ voiceVolume: Number(e.target.value) })}
              className="w-full accent-aurora-cyan"
            />
          </div>

          <fieldset className="mb-4">
            <legend className="text-aurora-muted font-mono text-xs mb-1">Personality preset</legend>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={personalityStyle === preset.value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => applyPersonalityPreset(preset.value)}
                  aria-label={`Apply ${preset.label} personality`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="mb-2">
            <label htmlFor="personality-prompt" className="block text-aurora-muted font-mono text-xs mb-1">
              Personality instructions
            </label>
            <textarea
              id="personality-prompt"
              value={personalityPromptDraft}
              onChange={(e) => setPersonalityPromptDraft(e.target.value)}
              rows={4}
              className="w-full bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-2 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50"
            />
            <div className="mt-2">
              <Button variant="secondary" size="sm" onClick={applyPersonalityPrompt}>
                Save personality
              </Button>
            </div>
            <p className="text-aurora-muted text-xs mt-2">
              Note: personality presets are style templates. They avoid direct imitation of copyrighted characters.
            </p>
          </div>
        </section>
        </AccordionSection>

        <AccordionSection
          id="voice-preview"
          title="Voice test preview"
          subtitle="Try the current voice without sending a message"
          defaultOpen
        >
        <section aria-labelledby="voice-preview-heading">
          <h3
            id="voice-preview-heading"
            className="sr-only"
          >
            Voice Test Preview
          </h3>
          <p className="text-aurora-muted text-xs mb-2">
            Use this short script to hear your current voice settings while you adjust rate, pitch, volume, and personality.
          </p>
          <textarea
            value={previewScript}
            onChange={(e) => setPreviewScript(e.target.value)}
            rows={3}
            aria-label="Voice preview script"
            className="w-full bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-2 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void playPreviewScript()}>
              {ttsStatus === 'speaking' ? 'Replay preview' : 'Play preview'}
            </Button>
            <Button variant="ghost" size="sm" onClick={stop} disabled={ttsStatus !== 'speaking'}>
              Stop preview
            </Button>
          </div>
        </section>
        </AccordionSection>

        <AccordionSection
          id="voice-speech-profile"
          title="Speech profile"
          subtitle="Name, pace, pause handling, and clarification behavior"
          defaultOpen
        >
        <section aria-labelledby="basic-profile-heading">
          <h3
            id="basic-profile-heading"
            className="sr-only"
          >
            Speech Profile
          </h3>

          {/* Preferred name */}
          <div className="mb-4">
            <label htmlFor="preferred-name" className="block text-aurora-muted font-mono text-xs mb-1">
              Preferred name
            </label>
            <input
              id="preferred-name"
              type="text"
              value={typeof safeProfile.preferredName === 'string' ? safeProfile.preferredName : ''}
              onChange={(e) => updateProfile({ preferredName: e.target.value })}
              className="w-full bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-1.5 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 min-h-[44px]"
            />
          </div>

          {/* Speech pace */}
          <div className="mb-4">
            <fieldset>
              <legend className="text-aurora-muted font-mono text-xs mb-1">Speech pace</legend>
              <div className="flex flex-wrap gap-2">
                {PACE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1 cursor-pointer min-h-[36px]">
                    <input
                      type="radio"
                      name="speech-pace"
                      value={opt.value}
                      checked={safeProfile.speechPace === opt.value}
                      onChange={() => updateProfile({ speechPace: opt.value })}
                      className="accent-aurora-cyan"
                    />
                    <span className="font-mono text-aurora-white">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Pause tolerance */}
          <div className="mb-4">
            <label htmlFor="pause-tolerance" className="block text-aurora-muted font-mono text-xs mb-1">
              Pause tolerance: {((Number.isFinite(safeProfile.pauseToleranceMs) ? Number(safeProfile.pauseToleranceMs) : 2000) / 1000).toFixed(1)}s
            </label>
            <input
              id="pause-tolerance"
              type="range"
              min={500}
              max={10000}
              step={250}
              value={Number.isFinite(safeProfile.pauseToleranceMs) ? Number(safeProfile.pauseToleranceMs) : 2000}
              onChange={(e) => updateProfile({ pauseToleranceMs: Number(e.target.value) })}
              className="w-full accent-aurora-cyan"
              aria-valuemin={500}
              aria-valuemax={10000}
              aria-valuenow={Number.isFinite(safeProfile.pauseToleranceMs) ? Number(safeProfile.pauseToleranceMs) : 2000}
              aria-valuetext={`${((Number.isFinite(safeProfile.pauseToleranceMs) ? Number(safeProfile.pauseToleranceMs) : 2000) / 1000).toFixed(1)} seconds`}
            />
          </div>

          {/* Clarification mode */}
          <div className="mb-4">
            <label htmlFor="clarification-mode" className="block text-aurora-muted font-mono text-xs mb-1">
              Clarification mode
            </label>
            <select
              id="clarification-mode"
              value={typeof safeProfile.clarificationMode === 'string' ? safeProfile.clarificationMode : 'moderate'}
              onChange={(e) => updateProfile({ clarificationMode: e.target.value as ClarificationMode })}
              className="w-full bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-1.5 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 min-h-[44px]"
            >
              {CLARIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </section>
        </AccordionSection>

        <AccordionSection
          id="voice-substitutions"
          title="Word substitutions"
          subtitle="Map spoken terms to intended terms"
        >
        <section aria-labelledby="substitutions-heading">
          <h3
            id="substitutions-heading"
            className="sr-only"
          >
            Word Substitutions
          </h3>
          <ul className="space-y-1 mb-2" aria-label="Substitution list">
            {substitutions
              .filter((sub): sub is { heard: string; intended: string } => Boolean(sub && typeof sub === 'object' && typeof (sub as { heard?: unknown }).heard === 'string' && typeof (sub as { intended?: unknown }).intended === 'string'))
              .map((sub) => (
              <li key={sub.heard} className="flex items-center justify-between gap-2 text-xs font-mono">
                <span>
                  <span className="text-aurora-warn">"{sub.heard}"</span>
                  {' → '}
                  <span className="text-aurora-cyan">"{sub.intended}"</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSubstitution(sub.heard)}
                  aria-label={`Remove substitution: ${sub.heard}`}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-1">
            <input
              type="text"
              value={newHeard}
              onChange={(e) => setNewHeard(e.target.value)}
              placeholder="I say…"
              aria-label="Word or phrase I say"
              className="flex-1 bg-aurora-bg/60 border border-aurora-border/60 rounded px-2 py-1 text-xs font-mono text-aurora-white focus:outline-none focus:ring-1 focus:ring-aurora-cyan/50 min-h-[36px]"
            />
            <input
              type="text"
              value={newIntended}
              onChange={(e) => setNewIntended(e.target.value)}
              placeholder="Means…"
              aria-label="Intended word or phrase"
              className="flex-1 bg-aurora-bg/60 border border-aurora-border/60 rounded px-2 py-1 text-xs font-mono text-aurora-white focus:outline-none focus:ring-1 focus:ring-aurora-cyan/50 min-h-[36px]"
            />
            <Button variant="secondary" size="sm" onClick={addSub} aria-label="Add substitution">
              +
            </Button>
          </div>
        </section>
        </AccordionSection>

        <AccordionSection
          id="voice-vocabulary"
          title="Custom vocabulary"
          subtitle="Add domain-specific words for better recognition"
        >
        <section aria-labelledby="vocab-heading">
          <h3
            id="vocab-heading"
            className="sr-only"
          >
            Custom Vocabulary
          </h3>
          <div className="flex flex-wrap gap-1 mb-2">
            {customVocabulary
              .filter((word): word is string => typeof word === 'string')
              .map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 bg-aurora-teal/20 border border-aurora-teal/30 px-2 py-0.5 rounded-full text-xs font-mono text-aurora-teal"
              >
                {word}
                <button
                  onClick={() => removeVocabularyWord(word)}
                  aria-label={`Remove vocabulary word: ${word}`}
                  className="text-aurora-teal/60 hover:text-aurora-danger focus:outline-none focus:ring-1 focus:ring-aurora-cyan/50 rounded"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(); } }}
              placeholder="Add a word…"
              aria-label="New vocabulary word"
              className="flex-1 bg-aurora-bg/60 border border-aurora-border/60 rounded px-2 py-1 text-xs font-mono text-aurora-white focus:outline-none focus:ring-1 focus:ring-aurora-cyan/50 min-h-[36px]"
            />
            <Button variant="secondary" size="sm" onClick={addWord} aria-label="Add vocabulary word">
              +
            </Button>
          </div>
        </section>
        </AccordionSection>

        {isDirty && (
          <p role="status" className="text-aurora-warn text-xs font-mono">
            ● Unsaved changes — will persist locally in your browser.
          </p>
        )}
      </div>
    </Panel>
  );
}
