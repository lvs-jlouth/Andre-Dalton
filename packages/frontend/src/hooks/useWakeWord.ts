import { useEffect, useRef, useState, useCallback } from 'react';
import { WakeWordDetector } from '../services/wakeWord/index.js';
import type { WakeWordStatus } from '../services/wakeWord/index.js';
import { useSpeechProfileStore } from '../store/speechProfileStore.js';

interface UseWakeWordOptions {
  /** Called when the wake phrase is confirmed — typically starts main STT */
  onWake: () => void;
}

export function useWakeWord({ onWake }: UseWakeWordOptions) {
  const detectorRef = useRef<WakeWordDetector | null>(null);
  const [wakeStatus, setWakeStatus] = useState<WakeWordStatus>('off');
  const wakeWordConfig = useSpeechProfileStore((s) => s.profile.wakeWord);

  // Rebuild the detector whenever the config changes
  useEffect(() => {
    // Always tear down any previous detector first
    detectorRef.current?.stop();
    detectorRef.current = null;

    if (!wakeWordConfig.enabled) {
      setWakeStatus('off');
      return;
    }

    const detector = new WakeWordDetector({
      phrase: wakeWordConfig.phrase,
      sensitivity: wakeWordConfig.sensitivity,
      language: 'en-US',
      onDetected: () => {
        // Brief pause so the mic used by the detector releases before main STT starts
        setTimeout(() => onWake(), 150);
      },
      onStatusChange: setWakeStatus,
      onError: (msg) => console.warn('[WakeWord]', msg),
    });

    detectorRef.current = detector;
    detector.start();

    return () => {
      detector.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeWordConfig.enabled, wakeWordConfig.phrase, wakeWordConfig.sensitivity]);

  /** Manually restart monitoring after a session ends */
  const resumeMonitoring = useCallback(() => {
    if (wakeWordConfig.enabled && detectorRef.current) {
      detectorRef.current.start();
    }
  }, [wakeWordConfig.enabled]);

  /** Temporarily pause wake word monitoring (e.g. while main STT is active) */
  const pauseMonitoring = useCallback(() => {
    detectorRef.current?.stop();
  }, []);

  return { wakeStatus, resumeMonitoring, pauseMonitoring };
}
