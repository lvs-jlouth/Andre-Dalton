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
 * Allows the user (or a caregiver/admin) to personalise how AURORA
 * interprets non-standard speech patterns.
 */
export function VoiceAdaptation() {
  const profile = useSpeechProfileStore((s) => s.profile);
  const updateProfile = useSpeechProfileStore((s) => s.updateProfile);
  const addSubstitution = useSpeechProfileStore((s) => s.addSubstitution);
  const removeSubstitution = useSpeechProfileStore((s) => s.removeSubstitution);
  const addVocabularyWord = useSpeechProfileStore((s) => s.addVocabularyWord);
  const removeVocabularyWord = useSpeechProfileStore((s) => s.removeVocabularyWord);
  const isDirty = useSpeechProfileStore((s) => s.isDirty);

  const [newHeard, setNewHeard] = useState('');
  const [newIntended, setNewIntended] = useState('');
  const [newWord, setNewWord] = useState('');

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

  return (
    <Panel title="Voice Adaptation" aria-label="Speech profile editor">
      <div className="space-y-5 text-sm">
        {/* Preferred name */}
        <div>
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
        <div>
          <fieldset>
            <legend className="text-aurora-muted font-mono text-xs mb-1">Speech pace</legend>
            <div className="flex flex-wrap gap-2">
              {PACE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
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
        <div>
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
        <div>
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

        {/* Word substitutions */}
        <div>
          <p className="text-aurora-muted font-mono text-xs mb-1">Word substitutions</p>
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
        </div>

        {/* Custom vocabulary */}
        <div>
          <p className="text-aurora-muted font-mono text-xs mb-1">Custom vocabulary</p>
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
        </div>

        {isDirty && (
          <p role="status" className="text-aurora-warn text-xs font-mono">
            ● Unsaved changes — will persist locally in your browser.
          </p>
        )}
      </div>
    </Panel>
  );
}
