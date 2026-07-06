import { useAssistantStore } from '../../store/assistantStore.js';
import { useSettingsStore } from '../../store/settingsStore.js';

const BAR_COUNT = 16;

/**
 * WaveformDisplay — animated bars representing audio activity.
 * Bars have different animation delays to create an organic waveform.
 * Hidden when reducedMotion is enabled; a static bar is shown instead.
 */
export function WaveformDisplay() {
  const status = useAssistantStore((s) => s.status);
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);

  const isActive = status === 'listening' || status === 'speaking';

  if (reducedMotion) {
    return (
      <div
        role="presentation"
        aria-hidden="true"
        className="flex items-center justify-center gap-0.5 h-8"
      >
        <div
          className={`w-full h-0.5 rounded-full ${
            isActive ? 'bg-aurora-cyan/60' : 'bg-aurora-border/40'
          } transition-colors duration-300`}
        />
      </div>
    );
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="flex items-end justify-center gap-0.5 h-8"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const delay = `${(i * 75) % 600}ms`;
        const baseHeight = 4 + Math.sin(i * 0.8) * 8;
        const activeHeight = 8 + Math.abs(Math.sin(i * 1.2)) * 20;

        return (
          <div
            key={i}
            className={`
              w-1 rounded-full transition-all duration-300
              ${isActive
                ? `bg-aurora-cyan/70 animate-waveform`
                : 'bg-aurora-border/30'}
            `}
            style={{
              height: isActive ? `${activeHeight}px` : `${baseHeight}px`,
              animationDelay: delay,
            }}
          />
        );
      })}
    </div>
  );
}
