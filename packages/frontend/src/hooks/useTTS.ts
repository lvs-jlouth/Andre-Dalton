import { useRef, useCallback, useEffect, useState } from 'react';
import { createTTSAdapter } from '../services/tts/index.js';
import { synthesizeSpeech } from '../services/api.js';
import type { TTSAdapter, TTSStatus } from '../types/speech.js';
import { useAssistantStore } from '../store/assistantStore.js';
import { useSpeechProfileStore } from '../store/speechProfileStore.js';

const OPENAI_TTS_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
]);

function scoreVoice(voice: SpeechSynthesisVoice, profile: ReturnType<typeof useSpeechProfileStore.getState>['profile']): number {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  const lang = (voice.lang ?? '').toLowerCase();
  const modelHint = (profile.voiceModel ?? '').toLowerCase();
  const preferBritish = profile.personalityStyle === 'british-butler' || modelHint.includes('british') || modelHint.includes('en_gb');
  const preferMale = profile.personalityStyle === 'british-butler' || modelHint.includes('male');

  let score = 0;
  if (preferBritish) {
    if (lang.startsWith('en-gb')) score += 90;
    else if (lang.startsWith('en')) score += 35;
  } else if (lang.startsWith('en')) {
    score += 55;
  }

  if (name.includes(modelHint) && modelHint.length > 2) score += 80;
  if (/(neural|natural|wavenet|enhanced|premium|studio|hq)/i.test(name)) score += 70;
  if (preferMale && /(male|david|ryan|daniel|arthur|george|james|oliver|guy|onyx)/i.test(name)) score += 25;
  if (/(robot|espeak|festival|mbrola)/i.test(name)) score -= 90;
  if (voice.localService === false) score += 8;

  return score;
}

function resolveNaturalVoiceId(
  voices: SpeechSynthesisVoice[],
  profile: ReturnType<typeof useSpeechProfileStore.getState>['profile'],
): string | undefined {
  if (profile.voiceId) {
    const explicit = voices.find((v) => v.voiceURI === profile.voiceId || v.name === profile.voiceId);
    if (explicit) return explicit.voiceURI || explicit.name;
  }
  if (voices.length === 0) return undefined;

  const [best] = [...voices].sort((a, b) => scoreVoice(b, profile) - scoreVoice(a, profile));
  return best?.voiceURI || best?.name;
}

function resolveOpenAiVoice(profile: ReturnType<typeof useSpeechProfileStore.getState>['profile']): string {
  const explicit = (profile.voiceId ?? '').trim().toLowerCase();
  if (OPENAI_TTS_VOICES.has(explicit)) return explicit;

  const modelHint = (profile.voiceModel ?? '').trim().toLowerCase();
  if (OPENAI_TTS_VOICES.has(modelHint)) return modelHint;

  if (profile.personalityStyle === 'british-butler') return 'onyx';
  if (profile.personalityStyle === 'time-traveler') return 'sage';
  if (/british|male|formal|butler|onyx/.test(modelHint)) return 'onyx';
  if (/friendly|warm|female|nova|shimmer|coral/.test(modelHint)) return 'nova';
  return 'alloy';
}

export function useTTS() {
  const adapterRef = useRef<TTSAdapter | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const lastSpokenTextRef = useRef('');
  const [ttsStatus, setTTSStatus] = useState<TTSStatus>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const setAssistantStatus = useAssistantStore((s) => s.setStatus);
  const setCaption = useAssistantStore((s) => s.setCaption);
  const profile = useSpeechProfileStore((s) => s.profile);

  useEffect(() => {
    const adapter = createTTSAdapter('browser');
    adapterRef.current = adapter;

    adapter.onStatusChange = (status) => {
      setTTSStatus(status);
      if (status === 'speaking') setAssistantStatus('speaking');
      if (status === 'idle' || status === 'paused' || status === 'error') setAssistantStatus('idle');
    };

    // The conversation transcript already serves as the persistent caption surface.
    // Avoid rendering a second live word-by-word caption stream during playback.
    adapter.onWordBoundary = null;

    // Populate voice list (async in some browsers)
    const updateVoices = () => {
      setVoices(adapter.getAvailableVoices());
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      adapter.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
        activeAudioUrlRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAssistantStatus]);

  const playServerAudio = useCallback(async (
    audioBase64: string,
    mimeType: string,
    settings: { rate: number; volume: number },
  ): Promise<void> => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }

    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    activeAudioUrlRef.current = url;
    const audio = new Audio(url);
    audio.playbackRate = Math.min(2, Math.max(0.5, settings.rate));
    audio.volume = Math.min(1, Math.max(0, settings.volume));
    audioRef.current = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onplay = () => {
        setTTSStatus('speaking');
        setAssistantStatus('speaking');
      };
      audio.onpause = () => {
        if (audio.ended) return;
        setTTSStatus('paused');
        setAssistantStatus('idle');
      };
      audio.onended = () => {
        setTTSStatus('idle');
        setAssistantStatus('idle');
        setCaption('');
        resolve();
      };
      audio.onerror = () => {
        setTTSStatus('error');
        setAssistantStatus('idle');
        reject(new Error('Audio playback failed'));
      };
      void audio.play().catch((err) => reject(err));
    });
  }, [setAssistantStatus, setCaption]);

  const speak = useCallback(async (text: string) => {
    if (!adapterRef.current) return;
    lastSpokenTextRef.current = text;
    const rate = Number.isFinite(profile.voiceRate) ? profile.voiceRate : 0.9;
    const pitch = Number.isFinite(profile.voicePitch) ? profile.voicePitch : 1.0;
    const volume = Number.isFinite(profile.voiceVolume) ? profile.voiceVolume : 1.0;
    const naturalVoiceId = resolveNaturalVoiceId(voices, profile);
    const cloudVoiceHint = (profile.voiceId ?? '').trim()
      || (profile.voiceModel ?? '').trim()
      || profile.personalityStyle
      || resolveOpenAiVoice(profile);

    try {
      const cloud = await synthesizeSpeech({
        text,
        voiceId: cloudVoiceHint,
        rate,
        pitch,
        volume,
      });
      if (cloud.status === 'ok' && cloud.audioBase64) {
        await playServerAudio(cloud.audioBase64, cloud.mimeType ?? 'audio/mpeg', { rate, volume });
        return;
      }
    } catch {
      // Fallback to browser speech synthesis when cloud TTS is not configured/available.
    }

    await adapterRef.current.speak(text, {
      voiceId: naturalVoiceId,
      rate,
      pitch,
      volume,
    });
  }, [playServerAudio, profile, voices]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    adapterRef.current?.stop();
    setTTSStatus('idle');
    setAssistantStatus('idle');
    setCaption('');
  }, [setAssistantStatus, setCaption]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      return;
    }
    adapterRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      void audioRef.current.play();
      return;
    }
    adapterRef.current?.resume();
  }, []);

  const repeatLast = useCallback(() => {
    const lastText = lastSpokenTextRef.current.trim();
    if (!lastText) return;
    void stop();
    void speak(lastText);
  }, [speak, stop]);

  return { ttsStatus, voices, speak, stop, pause, resume, repeatLast };
}
