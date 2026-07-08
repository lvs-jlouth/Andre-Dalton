/**
 * PersonalitySettings — configure J.A.R.G.I.I.N.'s response personality and voice.
 */
import { useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import {
  usePersonalityStore,
  PERSONALITY_PRESETS,
  VOICE_LIBRARY,
  type ToneStyle,
  type VerbosityLevel,
  type FormalityLevel,
  type VoiceAccent,
  type VoiceGender,
} from '../../store/personalityStore.js';

export function PersonalitySettingsPanel() {
  return (
    <div className="space-y-6">
      <PersonalitySection />
      <VoiceLibrarySection />
    </div>
  );
}

// ─── Personality Configuration ──────────────────────────────────────────────

function PersonalitySection() {
  const { personality, setPersonality, loadPreset } = usePersonalityStore();

  return (
    <Panel title="Personality" aria-label="Personality configuration">
      <div className="space-y-5">
        {/* Presets */}
        <div>
          <h4 className="text-jargiin-cyan font-mono text-xs font-semibold mb-3">PRESETS</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(PERSONALITY_PRESETS).map(([id, preset]) => (
              <button
                key={id}
                onClick={() => loadPreset(id)}
                className={`
                  p-2 rounded-lg border text-left transition-colors text-xs
                  ${personality.name === preset.name
                    ? 'border-jargiin-cyan bg-jargiin-cyan/10 text-jargiin-cyan'
                    : 'border-jargiin-border bg-jargiin-bg/50 text-jargiin-muted hover:text-jargiin-white hover:border-jargiin-cyan/40'}
                `}
              >
                <span className="block font-mono font-semibold">{preset.name}</span>
                <span className="block mt-0.5 opacity-70">{preset.tone}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <SliderSelect<ToneStyle>
          label="Tone"
          value={personality.tone}
          options={['professional', 'friendly', 'witty', 'stoic', 'empathetic', 'sarcastic']}
          onChange={(tone) => setPersonality({ tone })}
        />

        {/* Verbosity */}
        <SliderSelect<VerbosityLevel>
          label="Verbosity"
          value={personality.verbosity}
          options={['concise', 'balanced', 'detailed', 'verbose']}
          onChange={(verbosity) => setPersonality({ verbosity })}
        />

        {/* Formality */}
        <SliderSelect<FormalityLevel>
          label="Formality"
          value={personality.formality}
          options={['casual', 'neutral', 'formal', 'academic']}
          onChange={(formality) => setPersonality({ formality })}
        />

        {/* Sliders */}
        <RangeSlider
          label="Humor"
          value={personality.humor}
          onChange={(humor) => setPersonality({ humor })}
        />
        <RangeSlider
          label="Empathy"
          value={personality.empathy}
          onChange={(empathy) => setPersonality({ empathy })}
        />
        <RangeSlider
          label="Proactivity"
          value={personality.proactivity}
          onChange={(proactivity) => setPersonality({ proactivity })}
        />

        {/* Custom Prompt */}
        <div>
          <label className="block text-xs font-mono text-jargiin-muted mb-1">
            Custom Instructions
          </label>
          <textarea
            value={personality.customPrompt}
            onChange={(e) => setPersonality({ customPrompt: e.target.value })}
            placeholder="Add custom personality instructions…"
            rows={3}
            className="
              w-full bg-jargiin-bg/60 border border-jargiin-border/60 rounded-lg
              px-3 py-2 text-sm font-mono text-jargiin-white
              placeholder:text-jargiin-muted/50
              focus:outline-none focus:ring-2 focus:ring-jargiin-cyan/50
              resize-y min-h-[80px]
            "
          />
        </div>
      </div>
    </Panel>
  );
}

// ─── Voice Library ──────────────────────────────────────────────────────────

function VoiceLibrarySection() {
  const { selectedVoiceId, setSelectedVoice, voiceOverrides, setVoiceOverrides } =
    usePersonalityStore();
  const [filterAccent, setFilterAccent] = useState<VoiceAccent | 'all'>('all');
  const [filterGender, setFilterGender] = useState<VoiceGender | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVoices = VOICE_LIBRARY.filter((voice) => {
    if (filterAccent !== 'all' && voice.accent !== filterAccent) return false;
    if (filterGender !== 'all' && voice.gender !== filterGender) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        voice.name.toLowerCase().includes(term) ||
        voice.description.toLowerCase().includes(term) ||
        voice.tags.some((t) => t.includes(term))
      );
    }
    return true;
  });

  const selectedVoice = VOICE_LIBRARY.find((v) => v.id === selectedVoiceId);

  function previewVoice(voice: typeof VOICE_LIBRARY[0]) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Hello, I'm ${voice.name}. This is how I sound as your J.A.R.G.I.I.N. assistant.`,
    );
    utterance.rate = voiceOverrides.rate ?? voice.rate;
    utterance.pitch = voiceOverrides.pitch ?? voice.pitch;
    utterance.volume = voiceOverrides.volume ?? voice.volume;

    // Try to match a system voice
    const voices = window.speechSynthesis.getVoices();
    const pattern = new RegExp(voice.voiceMatch, 'i');
    const match = voices.find((v) => pattern.test(v.name));
    if (match) utterance.voice = match;

    window.speechSynthesis.speak(utterance);
  }

  const accents: VoiceAccent[] = [
    'american', 'british', 'australian', 'indian', 'irish', 'scottish',
    'south-african', 'canadian', 'french', 'german', 'spanish', 'italian',
    'japanese', 'korean', 'portuguese', 'dutch',
  ];

  return (
    <Panel title="Voice Library" aria-label="Voice selection and preview">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search voices…"
            className="
              flex-1 min-w-[150px] bg-jargiin-bg/60 border border-jargiin-border/60
              rounded-lg px-3 py-1.5 text-xs font-mono text-jargiin-white
              placeholder:text-jargiin-muted/50
              focus:outline-none focus:ring-2 focus:ring-jargiin-cyan/50
            "
          />
          <select
            value={filterAccent}
            onChange={(e) => setFilterAccent(e.target.value as VoiceAccent | 'all')}
            className="bg-jargiin-bg border border-jargiin-border rounded-lg px-2 py-1.5 text-xs font-mono text-jargiin-white"
          >
            <option value="all">All Accents</option>
            {accents.map((a) => (
              <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1).replace('-', ' ')}</option>
            ))}
          </select>
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value as VoiceGender | 'all')}
            className="bg-jargiin-bg border border-jargiin-border rounded-lg px-2 py-1.5 text-xs font-mono text-jargiin-white"
          >
            <option value="all">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        {/* Voice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {filteredVoices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`
                p-3 rounded-lg border text-left transition-all
                ${selectedVoiceId === voice.id
                  ? 'border-jargiin-cyan bg-jargiin-cyan/10'
                  : 'border-jargiin-border bg-jargiin-bg/50 hover:border-jargiin-cyan/40'}
              `}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-semibold text-jargiin-white">
                  {voice.name}
                </span>
                <span className="text-[10px] font-mono text-jargiin-muted uppercase">
                  {voice.accent}
                </span>
              </div>
              <p className="text-xs text-jargiin-muted mt-1">{voice.description}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {voice.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-jargiin-border/30 text-jargiin-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {filteredVoices.length === 0 && (
          <p className="text-center text-jargiin-muted text-sm py-4">No voices match your filters</p>
        )}

        {/* Selected Voice Controls */}
        {selectedVoice && (
          <div className="p-4 rounded-lg bg-jargiin-panel border border-jargiin-cyan/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-mono font-semibold text-jargiin-cyan">
                  {selectedVoice.name}
                </span>
                <span className="text-xs text-jargiin-muted ml-2">
                  {selectedVoice.accent} · {selectedVoice.gender}
                </span>
              </div>
              <Button size="sm" onClick={() => previewVoice(selectedVoice)}>
                ▶ Preview
              </Button>
            </div>

            {/* Voice tuning sliders */}
            <RangeSlider
              label="Speed"
              value={Math.round(((voiceOverrides.rate ?? selectedVoice.rate) - 0.5) / 1.5 * 100)}
              onChange={(v) => setVoiceOverrides({ rate: 0.5 + (v / 100) * 1.5 })}
              min={0}
              max={100}
            />
            <RangeSlider
              label="Pitch"
              value={Math.round(((voiceOverrides.pitch ?? selectedVoice.pitch) - 0.5) / 1.5 * 100)}
              onChange={(v) => setVoiceOverrides({ pitch: 0.5 + (v / 100) * 1.5 })}
              min={0}
              max={100}
            />
            <RangeSlider
              label="Volume"
              value={Math.round((voiceOverrides.volume ?? selectedVoice.volume) * 100)}
              onChange={(v) => setVoiceOverrides({ volume: v / 100 })}
              min={0}
              max={100}
            />
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── Shared UI Components ───────────────────────────────────────────────────

function SliderSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (val: T) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-mono text-jargiin-muted mb-2">{label}</label>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`
              px-2.5 py-1 rounded text-xs font-mono transition-colors
              ${value === opt
                ? 'bg-jargiin-cyan/20 text-jargiin-cyan border border-jargiin-cyan/50'
                : 'bg-jargiin-bg/50 text-jargiin-muted border border-jargiin-border hover:text-jargiin-white'}
            `}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-mono text-jargiin-muted w-20 shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none bg-jargiin-border/50 accent-jargiin-cyan"
      />
      <span className="text-xs font-mono text-jargiin-muted w-8 text-right">{value}</span>
    </div>
  );
}
