import type { ReactNode } from 'react';
import { useSettingsStore } from '../../store/settingsStore.js';

interface HUDLayoutProps {
  children: ReactNode;
}

/**
 * HUDLayout — the root layout shell.
 * Applies global accessibility classes (high-contrast, large-text, reduced-motion)
 * and provides the HUD grid background.
 */
export function HUDLayout({ children }: HUDLayoutProps) {
  const { highContrast, reducedMotion, largeText, fontScale } = useSettingsStore((s) => s.accessibility);

  return (
    <div
      className={`
        min-h-screen w-full
        bg-aurora-bg
        bg-grid-hud bg-grid-hud
        text-aurora-white
        ${highContrast ? 'contrast-more' : ''}
        ${reducedMotion ? 'motion-reduce' : ''}
        ${largeText ? 'text-base' : 'text-sm'}
      `}
      style={{ fontSize: `${fontScale}rem` }}
    >
      {/* Subtle scanline overlay — hidden in reduced motion mode */}
      {!reducedMotion && (
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.3) 2px, rgba(0,212,255,0.3) 3px)',
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
