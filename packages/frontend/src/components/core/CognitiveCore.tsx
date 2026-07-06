import { StatusRing } from '../ui/StatusRing.js';
import { useAssistantStore } from '../../store/assistantStore.js';
import { useSettingsStore } from '../../store/settingsStore.js';

const STATUS_LABELS = {
  idle: 'Ready',
  thinking: 'Processing',
  speaking: 'Speaking',
  listening: 'Listening',
  error: 'Error',
};

const STATUS_COLORS = {
  idle: 'stroke-aurora-teal',
  thinking: 'stroke-aurora-blue',
  speaking: 'stroke-aurora-cyan',
  listening: 'stroke-aurora-warn',
  error: 'stroke-aurora-danger',
};

/**
 * CognitiveCore — the central HUD orb representing AURORA's active state.
 * Original visual element inspired by cinematic heads-up display systems.
 */
export function CognitiveCore() {
  const status = useAssistantStore((s) => s.status);
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);

  const label = STATUS_LABELS[status];
  const color = STATUS_COLORS[status];
  const isActive = status !== 'idle';
  const telemetry = status === 'thinking' ? 'synthesising' : status === 'speaking' ? 'projecting' : status === 'listening' ? 'receiving' : status === 'error' ? 'stalled' : 'nominal';

  return (
    <div
      className="flex flex-col items-center gap-4"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`AURORA status: ${label}`}
    >
      <div className="relative flex items-center justify-center">
        {!reducedMotion && (
          <>
            <div className="absolute h-44 w-44 rounded-full border border-aurora-cyan/15 animate-spin-slow" aria-hidden="true" />
            <div className="absolute h-36 w-36 rounded-full border border-dashed border-aurora-blue/20 animate-spin-reverse-slow" aria-hidden="true" />
            <div className="absolute h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.18),transparent_60%)] blur-2xl animate-drift" aria-hidden="true" />
          </>
        )}

        <StatusRing
          size={156}
          active={isActive}
          pulsing={status === 'listening' && !reducedMotion}
          color={color}
          label={`Outer ring — ${label}`}
        />

        <div className="absolute h-28 w-28 rounded-full border border-aurora-cyan/20" aria-hidden="true" />

        <div
          className={`
            absolute h-20 w-20 rounded-full
            flex items-center justify-center
            border border-aurora-border/60 bg-[radial-gradient(circle,rgba(0,212,255,0.24),rgba(13,31,60,0.95)_62%)]
            shadow-inner shadow-aurora-cyan/20 transition-all duration-500
            ${isActive && !reducedMotion ? 'shadow-[0_0_38px_rgba(0,212,255,0.26)]' : ''}
          `}
          aria-hidden="true"
        >
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
            <polygon
              points="16,4 28,12 28,20 16,28 4,20 4,12"
              fill="none"
              className={`transition-colors duration-500 ${color}`}
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="16" cy="16" r="4" className="fill-aurora-cyan/40" />
          </svg>
        </div>

        <div className="absolute inset-x-4 bottom-5 flex justify-between text-[10px] font-mono uppercase tracking-[0.28em] text-aurora-muted" aria-hidden="true">
          <span>intent</span>
          <span>voice</span>
          <span>route</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.34em] text-aurora-muted">
          Cognitive Core
        </p>
        <p
          className={`mt-1 text-base font-mono font-semibold ${
            status === 'error' ? 'text-aurora-danger' : 'text-aurora-white'
          }`}
        >
          {label}
        </p>
        <p className="mt-1 text-xs font-mono uppercase tracking-[0.24em] text-aurora-cyan/70">
          {telemetry}
        </p>
      </div>
    </div>
  );
}
