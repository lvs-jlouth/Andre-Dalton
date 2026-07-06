import { useRef, useCallback, useEffect, useState } from 'react';
import { createTTSAdapter } from '../services/tts/index.js';
import type { TTSAdapter, TTSStatus } from '../types/speech.js';
import { useAssistantStore } from '../store/assistantStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

export function useTTS() {
  const adapterRef = useRef<TTSAdapter | null>(null);
  const [ttsStatus, setTTSStatus] = useState<TTSStatus>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const setCaption = useAssistantStore((s) => s.setCaption);
  const setAssistantStatus = useAssistantStore((s) => s.setStatus);
  const captions = useSettingsStore((s) => s.accessibility.captions);

  useEffect(() => {
    const adapter = createTTSAdapter('browser');
    adapterRef.current = adapter;

    adapter.onStatusChange = (status) => {
      setTTSStatus(status);
      if (status === 'speaking') setAssistantStatus('speaking');
      if (status === 'idle') setAssistantStatus('idle');
    };

    // Build caption from word boundaries
    const captionWords: string[] = [];
    adapter.onWordBoundary = (word) => {
      captionWords.push(word);
      if (captions) setCaption(captionWords.join(' '));
    };

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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captions]);

  const speak = useCallback(async (text: string) => {
    if (!adapterRef.current) return;
    await adapterRef.current.speak(text, { rate: 0.9 });
  }, []);

  const stop = useCallback(() => {
    adapterRef.current?.stop();
    setCaption('');
  }, [setCaption]);

  const repeatLast = useCallback(() => {
    adapterRef.current?.repeatLast();
  }, []);

  return { ttsStatus, voices, speak, stop, repeatLast };
}
