import type { CSSProperties, ReactNode } from 'react';
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
  const effectiveScale = Number.isFinite(fontScale) ? Math.min(2.5, Math.max(0.8, fontScale)) : 1;
  const baseFontRem = largeText ? 1 : 0.875;
  const scaledStyle = {
    '--aurora-font-scale': String(effectiveScale),
    '--aurora-base-font-size': `${baseFontRem}rem`,
  } as CSSProperties;

  return (
    <div
      className={`
        min-h-screen w-full
        bg-aurora-bg
        bg-grid-hud bg-grid-hud
        text-aurora-white
        aurora-scale-text
        ${highContrast ? 'contrast-more' : ''}
        ${reducedMotion ? 'motion-reduce' : ''}
      `}
      style={scaledStyle}
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
