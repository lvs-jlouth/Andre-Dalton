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

  return (
    <div
      className="flex flex-col items-center gap-3"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`AURORA status: ${label}`}
    >
      {/* Outer decorative rings */}
      <div className="relative flex items-center justify-center">
        <StatusRing
          size={120}
          active={isActive}
          pulsing={status === 'listening' && !reducedMotion}
          color={color}
          label={`Outer ring — ${label}`}
        />

        {/* Inner orb */}
        <div
          className={`
            absolute w-16 h-16 rounded-full
            flex items-center justify-center
            bg-aurora-panel/90 border border-aurora-border/60
            shadow-inner shadow-aurora-cyan/10
            transition-all duration-500
            ${isActive && !reducedMotion ? 'shadow-lg shadow-aurora-cyan/30' : ''}
          `}
          aria-hidden="true"
        >
          {/* Core glyph */}
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
      </div>

      {/* Status label */}
      <div className="text-center">
        <p className="text-xs font-mono tracking-widest uppercase text-aurora-muted">
          Cognitive Core
        </p>
        <p
          className={`text-sm font-mono font-semibold mt-0.5 ${
            status === 'error' ? 'text-aurora-danger' : 'text-aurora-white'
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
