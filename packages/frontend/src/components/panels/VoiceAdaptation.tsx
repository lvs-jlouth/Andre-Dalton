import { useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { useSpeechProfileStore } from '../../store/speechProfileStore.js';
import type { PaceSetting, ClarificationMode } from '../../types/speech.js';

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

  const [newHeard, setNewHeard] = useState('');
  const [newIntended, setNewIntended] = useState('');
  const [newWord, setNewWord] = useState('');
  const [wakePhraseDraft, setWakePhraseDraft] = useState(profile.wakeWord.phrase);

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

  return (
    <Panel title="Voice Adaptation" aria-label="Speech profile editor">
      <div className="space-y-6 text-sm">

        {/* ── Wake Word ──────────────────────────────────────────────────── */}
        <section aria-labelledby="wake-word-heading">
          <h3
            id="wake-word-heading"
            className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted mb-3"
          >
            Wake Word / Phrase
          </h3>

          {/* Enable toggle */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-mono text-aurora-white text-sm">Enable wake phrase</p>
              <p id="wake-word-desc" className="text-aurora-muted text-xs mt-0.5">
                When enabled, AURORA listens passively for your phrase and activates
                automatically — no button needed. Off by default.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={profile.wakeWord.enabled}
              aria-describedby="wake-word-desc"
              onClick={() => setWakeWord({ enabled: !profile.wakeWord.enabled })}
              className={`
                relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 focus:ring-offset-2 focus:ring-offset-aurora-panel
                ${profile.wakeWord.enabled ? 'bg-aurora-cyan/60' : 'bg-aurora-border/40'}
              `}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  profile.wakeWord.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
                aria-hidden="true"
              />
              <span className="sr-only">
                {profile.wakeWord.enabled ? 'Wake phrase enabled' : 'Wake phrase disabled'}
              </span>
            </button>
          </div>

          {/* Phrase editor — shown regardless of enabled state so user can pre-configure */}
          <div className="space-y-3 pl-0.5">
            <div>
              <label htmlFor="wake-phrase" className="block text-aurora-muted font-mono text-xs mb-1">
                Wake phrase (current: "<span className="text-aurora-cyan">{profile.wakeWord.phrase}</span>")
              </label>
              <div className="flex gap-2">
                <input
                  id="wake-phrase"
                  type="text"
                  value={wakePhraseDraft}
                  onChange={(e) => setWakePhraseDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyWakePhrase(); } }}
                  placeholder='e.g. Hey J, Hey AURORA, Go time…'
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
                  {profile.wakeWord.sensitivity >= 0.9
                    ? 'Strict (exact match)'
                    : profile.wakeWord.sensitivity >= 0.7
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
                value={profile.wakeWord.sensitivity}
                onChange={(e) => setWakeWord({ sensitivity: Number(e.target.value) })}
                className="w-full accent-aurora-cyan"
                aria-valuemin={0.4}
                aria-valuemax={1.0}
                aria-valuenow={profile.wakeWord.sensitivity}
                aria-valuetext={
                  profile.wakeWord.sensitivity >= 0.9
                    ? 'Strict'
                    : profile.wakeWord.sensitivity >= 0.7
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

        {/* Divider */}
        <hr className="border-aurora-border/30" />

        {/* ── Basic profile ────────────────────────────────────────────── */}
        <section aria-labelledby="basic-profile-heading">
          <h3
            id="basic-profile-heading"
            className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted mb-3"
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
              value={profile.preferredName}
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
                      checked={profile.speechPace === opt.value}
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
              Pause tolerance: {(profile.pauseToleranceMs / 1000).toFixed(1)}s
            </label>
            <input
              id="pause-tolerance"
              type="range"
              min={500}
              max={10000}
              step={250}
              value={profile.pauseToleranceMs}
              onChange={(e) => updateProfile({ pauseToleranceMs: Number(e.target.value) })}
              className="w-full accent-aurora-cyan"
              aria-valuemin={500}
              aria-valuemax={10000}
              aria-valuenow={profile.pauseToleranceMs}
              aria-valuetext={`${(profile.pauseToleranceMs / 1000).toFixed(1)} seconds`}
            />
          </div>

          {/* Clarification mode */}
          <div className="mb-4">
            <label htmlFor="clarification-mode" className="block text-aurora-muted font-mono text-xs mb-1">
              Clarification mode
            </label>
            <select
              id="clarification-mode"
              value={profile.clarificationMode}
              onChange={(e) => updateProfile({ clarificationMode: e.target.value as ClarificationMode })}
              className="w-full bg-aurora-bg/60 border border-aurora-border/60 rounded px-3 py-1.5 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 min-h-[44px]"
            >
              {CLARIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Divider */}
        <hr className="border-aurora-border/30" />

        {/* ── Word substitutions ───────────────────────────────────────── */}
        <section aria-labelledby="substitutions-heading">
          <h3
            id="substitutions-heading"
            className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted mb-2"
          >
            Word Substitutions
          </h3>
          <ul className="space-y-1 mb-2" aria-label="Substitution list">
            {profile.substitutions.map((sub) => (
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

        {/* ── Custom vocabulary ──────────────────────────────────────────── */}
        <section aria-labelledby="vocab-heading">
          <h3
            id="vocab-heading"
            className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted mb-2"
          >
            Custom Vocabulary
          </h3>
          <div className="flex flex-wrap gap-1 mb-2">
            {profile.customVocabulary.map((word) => (
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

        {isDirty && (
          <p role="status" className="text-aurora-warn text-xs font-mono">
            ● Unsaved changes — will persist locally in your browser.
          </p>
        )}
      </div>
    </Panel>
  );
}
