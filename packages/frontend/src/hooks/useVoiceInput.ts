import { useRef, useCallback, useEffect, useState } from 'react';
import { createSTTAdapter } from '../services/stt/index.js';
import type { STTAdapter, STTStatus, STTResult } from '../types/speech.js';
import { useAssistantStore } from '../store/assistantStore.js';
import { useSpeechProfileStore } from '../store/speechProfileStore.js';

interface UseVoiceInputOptions {
  onResult?: (result: STTResult) => void;
}

export function useVoiceInput({ onResult }: UseVoiceInputOptions = {}) {
  const adapterRef = useRef<STTAdapter | null>(null);
  const [sttStatus, setSTTStatus] = useState<STTStatus>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const setAssistantStatus = useAssistantStore((s) => s.setStatus);
  const profile = useSpeechProfileStore((s) => s.profile);

  useEffect(() => {
    const adapter = createSTTAdapter('browser');
    adapterRef.current = adapter;

    adapter.onStatusChange = (status) => {
      setSTTStatus(status);
      if (status === 'listening') setAssistantStatus('listening');
      if (status === 'idle') setAssistantStatus('idle');
    };

    adapter.onPartialResult = (result) => {
      setPartialTranscript(result.transcript);
    };

    adapter.onFinalResult = (result) => {
      setPartialTranscript('');
      onResult?.(result);
    };

    adapter.onError = (err) => {
      console.warn('STT error:', err);
    };

    return () => {
      adapter.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = useCallback(() => {
    adapterRef.current?.start({
      language: 'en-US',
      pauseToleranceMs: profile.pauseToleranceMs,
      customVocabulary: profile.customVocabulary,
    });
  }, [profile.pauseToleranceMs, profile.customVocabulary]);

  const stopListening = useCallback(() => {
    adapterRef.current?.stop();
    setPartialTranscript('');
  }, []);

  return { sttStatus, partialTranscript, startListening, stopListening };
}
