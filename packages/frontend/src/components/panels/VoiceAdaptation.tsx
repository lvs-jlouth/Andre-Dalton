import { useEffect, useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { useSpeechProfileStore } from '../../store/speechProfileStore.js';
import { getSpeechProfile, updateSpeechProfile } from '../../services/api.js';
import { TRAINING_PROMPTS, calculateTranscriptMatch } from '../../services/speechTraining.js';
import { useVoiceInput } from '../../hooks/useVoiceInput.js';
import { useTTS } from '../../hooks/useTTS.js';
import type { PaceSetting, ClarificationMode, SpeechProfile, SpeechTrainingSession } from '../../types/speech.js';

interface VoiceAdaptationProps {
  compact?: boolean;
}

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

export function VoiceAdaptation({ compact = false }: VoiceAdaptationProps) {
  const profile = useSpeechProfileStore((s) => s.profile);
  const updateProfile = useSpeechProfileStore((s) => s.updateProfile);
  const replaceProfile = useSpeechProfileStore((s) => s.replaceProfile);
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
  const [remoteStatus, setRemoteStatus] = useState<'idle' | 'loading' | 'saving' | 'error' | 'saved'>('idle');
  const [remoteMessage, setRemoteMessage] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [capturedPromptIds, setCapturedPromptIds] = useState<string[]>([]);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [draftAttempts, setDraftAttempts] = useState<SpeechTrainingSession['attempts']>([]);

  const currentPrompt = TRAINING_PROMPTS[currentPromptIndex];
  const activeAttempt = draftAttempts.find((attempt) => attempt.promptId === currentPrompt.id);
  const recentSessions = profile.trainingSessions.slice(-3).reverse();
  const overallAverageMatch = profile.trainingSessions.length
    ? profile.trainingSessions.reduce((sum, session) => sum + session.averageMatchScore, 0) /
      profile.trainingSessions.length
    : 0;

  const { speak } = useTTS();
  const { sttStatus, partialTranscript, startListening, stopListening } = useVoiceInput({
    onResult: (result) => {
      if (!sessionActive) return;

      const matchScore = calculateTranscriptMatch(currentPrompt.sentence, result.transcript);
      setDraftAttempts((previous) => [
        ...previous.filter((attempt) => attempt.promptId !== currentPrompt.id),
        {
          promptId: currentPrompt.id,
          expectedText: currentPrompt.sentence,
          spokenText: result.transcript.trim(),
          confidence: Math.max(0, Math.min(1, result.confidence ?? 0)),
          matchScore,
          recordedAt: new Date().toISOString(),
        },
      ]);
      setCapturedPromptIds((previous) =>
        previous.includes(currentPrompt.id) ? previous : [...previous, currentPrompt.id],
      );
      setRemoteMessage('Response captured. Review it, then continue to the next sentence.');
    },
  });

  useEffect(() => {
    setWakePhraseDraft(profile.wakeWord.phrase);
  }, [profile.wakeWord.phrase]);

  useEffect(() => {
    if (hasLoadedProfile) return;

    let cancelled = false;
    setRemoteStatus('loading');

    void getSpeechProfile()
      .then(({ profile: remoteProfile }) => {
        if (cancelled) return;
        replaceProfile(remoteProfile);
        setHasLoadedProfile(true);
        setRemoteStatus('idle');
        setRemoteMessage(null);
      })
      .catch(() => {
        if (cancelled) return;
        setHasLoadedProfile(true);
        setRemoteStatus('error');
        setRemoteMessage('Encrypted profile storage is unavailable right now. Local editing still works.');
      });

    return () => {
      cancelled = true;
    };
  }, [hasLoadedProfile, replaceProfile]);

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

  async function saveRemoteProfile(nextProfile: SpeechProfile = profile) {
    setRemoteStatus('saving');
    setRemoteMessage('Saving your speech profile to encrypted local storage…');

    try {
      const { profile: savedProfile } = await updateSpeechProfile(nextProfile);
      replaceProfile(savedProfile);
      setRemoteStatus('saved');
      setRemoteMessage('Encrypted speech profile saved.');
      return true;
    } catch {
      setRemoteStatus('error');
      setRemoteMessage('Could not save the encrypted speech profile.');
      return false;
    }
  }

  function startTrainingSession() {
    setSessionActive(true);
    setSessionStartedAt(new Date().toISOString());
    setCurrentPromptIndex(0);
    setDraftAttempts([]);
    setCapturedPromptIds([]);
    setRemoteMessage('Training session started. Ask AURORA to read the prompt aloud, then record your response.');
  }

  function cancelTrainingSession() {
    setSessionActive(false);
    setSessionStartedAt(null);
    setCurrentPromptIndex(0);
    setDraftAttempts([]);
    setCapturedPromptIds([]);
    setRemoteMessage('Training session stopped.');
  }

  async function speakCurrentPrompt() {
    await speak(`Please read this sentence aloud. ${currentPrompt.sentence}`);
  }

  function goToNextPrompt() {
    if (currentPromptIndex < TRAINING_PROMPTS.length - 1) {
      setCurrentPromptIndex((index) => index + 1);
      setRemoteMessage('Ready for the next guided sentence.');
      return;
    }

    void finishTrainingSession();
  }

  async function finishTrainingSession() {
    if (!sessionStartedAt || draftAttempts.length === 0) {
      setSessionActive(false);
      return;
    }

    const completedAt = new Date().toISOString();
    const averageConfidence =
      draftAttempts.reduce((sum, attempt) => sum + attempt.confidence, 0) / draftAttempts.length;
    const averageMatchScore =
      draftAttempts.reduce((sum, attempt) => sum + attempt.matchScore, 0) / draftAttempts.length;
    const session: SpeechTrainingSession = {
      id: `session-${Date.now()}`,
      startedAt: sessionStartedAt,
      completedAt,
      promptsCompleted: draftAttempts.length,
      averageConfidence,
      averageMatchScore,
      attempts: draftAttempts,
    };

    const nextProfile: SpeechProfile = {
      ...profile,
      trainingSessions: [...profile.trainingSessions, session].slice(-25),
      lastTrainingAt: completedAt,
      updatedAt: completedAt,
    };

    updateProfile({
      trainingSessions: nextProfile.trainingSessions,
      lastTrainingAt: completedAt,
    });
    setSessionActive(false);
    setSessionStartedAt(null);
    setCurrentPromptIndex(0);
    setDraftAttempts([]);
    setCapturedPromptIds([]);

    if (nextProfile.consentLocalLearning) {
      await saveRemoteProfile(nextProfile);
      return;
    }

    setRemoteMessage('Session complete. Enable local speech profile learning to retain encrypted training history.');
  }

  return (
    <Panel title="Voice Adaptation" aria-label="Speech profile editor">
      <div className="space-y-6 text-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-aurora-border/30 bg-black/10 px-3 py-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-aurora-muted">pace</p>
            <p className="mt-1 font-mono text-aurora-white">{profile.speechPace.replace('_', ' ')}</p>
          </div>
          <div className="rounded-2xl border border-aurora-border/30 bg-black/10 px-3 py-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-aurora-muted">clarity</p>
            <p className="mt-1 font-mono text-aurora-white">{profile.clarificationMode}</p>
          </div>
          <div className="rounded-2xl border border-aurora-border/30 bg-black/10 px-3 py-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-aurora-muted">training</p>
            <p className="mt-1 font-mono text-aurora-white">
              {profile.trainingSessions.length} stored session{profile.trainingSessions.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <section aria-labelledby="training-heading" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3
                id="training-heading"
                className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted"
              >
                Guided Speech Training
              </h3>
              <p className="mt-1 text-xs text-aurora-muted">
                Run this at will to practice a broad mix of topics and sounds. Completed sessions can be stored in your encrypted profile for future adaptation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!sessionActive ? (
                <Button variant="secondary" size="md" onClick={startTrainingSession}>
                  Start session
                </Button>
              ) : (
                <Button variant="ghost" size="md" onClick={cancelTrainingSession}>
                  Stop session
                </Button>
              )}
              {!compact && (
                <Button variant="primary" size="md" onClick={() => void saveRemoteProfile()} disabled={remoteStatus === 'saving'}>
                  Save encrypted profile
                </Button>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-aurora-border/30 bg-black/10 px-3 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.consentLocalLearning}
              onChange={(event) => updateProfile({ consentLocalLearning: event.target.checked })}
              className="mt-0.5 accent-aurora-cyan w-5 h-5"
            />
            <span>
              <span className="font-mono text-aurora-white">Keep encrypted training history</span>
              <span className="block text-xs text-aurora-muted mt-0.5">
                Turn this on to retain guided-session results in the encrypted profile store and reuse them in later sessions.
              </span>
            </span>
          </label>

          {sessionActive && (
            <div className="space-y-3 rounded-2xl border border-aurora-border/30 bg-black/10 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-mono uppercase tracking-[0.24em] text-aurora-cyan/80">
                  Prompt {currentPromptIndex + 1} / {TRAINING_PROMPTS.length} · {currentPrompt.topic}
                </p>
                <p className="text-xs font-mono text-aurora-muted">
                  {capturedPromptIds.length} captured
                </p>
              </div>
              <p className="rounded-2xl border border-aurora-blue/30 bg-aurora-blue/10 px-4 py-4 font-mono text-sm text-aurora-white">
                {currentPrompt.sentence}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="md" onClick={() => void speakCurrentPrompt()}>
                  Read prompt aloud
                </Button>
                <Button
                  variant={sttStatus === 'listening' ? 'danger' : 'primary'}
                  size="md"
                  onClick={sttStatus === 'listening' ? stopListening : startListening}
                >
                  {sttStatus === 'listening' ? 'Stop recording' : 'Record response'}
                </Button>
                <Button variant="ghost" size="md" onClick={() => void goToNextPrompt()} disabled={!activeAttempt}>
                  {currentPromptIndex === TRAINING_PROMPTS.length - 1 ? 'Finish session' : 'Next prompt'}
                </Button>
              </div>

              {(partialTranscript || activeAttempt) && (
                <div className="space-y-2 rounded-2xl border border-aurora-border/20 bg-aurora-bg/50 px-3 py-3">
                  {partialTranscript && (
                    <p className="text-xs text-aurora-muted">
                      Listening… <span className="font-mono text-aurora-white">{partialTranscript}</span>
                    </p>
                  )}
                  {activeAttempt && (
                    <>
                      <p className="text-xs text-aurora-muted">
                        Captured transcript: <span className="font-mono text-aurora-white">{activeAttempt.spokenText}</span>
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <p className="rounded-xl border border-aurora-border/20 px-3 py-2 text-xs font-mono text-aurora-muted">
                          Confidence: <span className="text-aurora-cyan">{Math.round(activeAttempt.confidence * 100)}%</span>
                        </p>
                        <p className="rounded-xl border border-aurora-border/20 px-3 py-2 text-xs font-mono text-aurora-muted">
                          Prompt match: <span className="text-aurora-cyan">{Math.round(activeAttempt.matchScore * 100)}%</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-aurora-border/30 bg-black/10 px-4 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-aurora-muted">Stored insight</p>
              <div className="mt-3 space-y-2 text-xs text-aurora-muted">
                <p>
                  Last session:{' '}
                  <span className="font-mono text-aurora-white">
                    {profile.lastTrainingAt ? new Date(profile.lastTrainingAt).toLocaleString() : 'Not yet run'}
                  </span>
                </p>
                <p>
                  Average prompt match:{' '}
                  <span className="font-mono text-aurora-white">{Math.round(overallAverageMatch * 100)}%</span>
                </p>
                <p>
                  Secure storage:{' '}
                  <span className="font-mono text-aurora-white">
                    {remoteStatus === 'saving'
                      ? 'Saving…'
                      : remoteStatus === 'saved'
                      ? 'Encrypted'
                      : remoteStatus === 'error'
                      ? 'Unavailable'
                      : 'Ready'}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-aurora-border/30 bg-black/10 px-4 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-aurora-muted">Recent sessions</p>
              <ul className="mt-3 space-y-2 text-xs">
                {recentSessions.length === 0 && (
                  <li className="text-aurora-muted">No guided sessions stored yet.</li>
                )}
                {recentSessions.map((session) => (
                  <li key={session.id} className="rounded-xl border border-aurora-border/20 px-3 py-2">
                    <p className="font-mono text-aurora-white">
                      {new Date(session.completedAt).toLocaleDateString()} · {session.promptsCompleted} prompts
                    </p>
                    <p className="mt-1 text-aurora-muted">
                      Match {Math.round(session.averageMatchScore * 100)}% · Confidence {Math.round(session.averageConfidence * 100)}%
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {remoteMessage && (
            <p
              role="status"
              className={`text-xs font-mono ${
                remoteStatus === 'error' ? 'text-aurora-danger' : 'text-aurora-cyan'
              }`}
            >
              {remoteMessage}
            </p>
          )}
        </section>

        <section aria-labelledby="wake-word-heading">
          <h3
            id="wake-word-heading"
            className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted mb-3"
          >
            Wake Word / Phrase
          </h3>

          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-mono text-aurora-white text-sm">Enable wake phrase</p>
              <p id="wake-word-desc" className="text-aurora-muted text-xs mt-0.5">
                When enabled, AURORA listens passively for your phrase and activates automatically — no button needed. Off by default.
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyWakePhrase();
                    }
                  }}
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

        {compact && (
          <p className="rounded-2xl border border-aurora-border/30 bg-black/10 px-4 py-3 text-xs font-mono text-aurora-muted">
            Open the dedicated Voice Profile view to manage the full guided training flow, substitution list, vocabulary, and encrypted profile storage.
          </p>
        )}

        {!compact && (
          <>
            <hr className="border-aurora-border/30" />

            <section aria-labelledby="basic-profile-heading">
              <h3
                id="basic-profile-heading"
                className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted mb-3"
              >
                Speech Profile
              </h3>

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

            <hr className="border-aurora-border/30" />

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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addWord();
                    }
                  }}
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
                ● Unsaved changes — save to write the latest profile and training data into encrypted local storage.
              </p>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
