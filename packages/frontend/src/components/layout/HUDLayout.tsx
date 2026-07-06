import type { ReactNode } from 'react';
import { useSettingsStore } from '../../store/settingsStore.js';
import { AccessibilityDock } from './AccessibilityDock.js';

interface HUDLayoutProps {
  children: ReactNode;
}

/**
 * HUDLayout — the root layout shell.
 * Applies global accessibility classes (high-contrast, large-text, reduced-motion)
 * and provides the HUD grid background.
 */
export function HUDLayout({ children }: HUDLayoutProps) {
  const { highContrast, reducedMotion, largeText, fontScale, onHandedLayout } = useSettingsStore((s) => s.accessibility);

  return (
    <div
      className={`
        aurora-shell aurora-mobile-safe min-h-screen w-full
        bg-aurora-bg bg-grid-hud
        text-aurora-white
        ${highContrast ? 'aurora-high-contrast' : ''}
        ${reducedMotion ? 'aurora-reduced-motion' : ''}
        ${largeText ? 'text-base' : 'text-sm'}
      `}
      style={{
        fontSize: `${fontScale}rem`,
        backgroundPosition: onHandedLayout === 'left' ? '-10px 0' : onHandedLayout === 'right' ? '10px 0' : '0 0',
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(0,212,255,0.10), transparent 28%), radial-gradient(circle at 15% 30%, rgba(0,128,255,0.12), transparent 22%), radial-gradient(circle at 85% 25%, rgba(0,181,165,0.10), transparent 18%)',
        }}
      />

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
      <AccessibilityDock />
    </div>
  );
}
