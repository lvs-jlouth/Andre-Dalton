import { useSettingsStore } from '../../store/settingsStore.js';

export function AccessibilityDock() {
  const accessibility = useSettingsStore((s) => s.accessibility);
  const updateAccessibility = useSettingsStore((s) => s.updateAccessibility);
  const setActivePanel = useSettingsStore((s) => s.setActivePanel);

  const sideClass =
    accessibility.onHandedLayout === 'left'
      ? 'left-3'
      : accessibility.onHandedLayout === 'right'
      ? 'right-3'
      : 'right-3 sm:right-4';

  return (
    <aside
      aria-label="Quick accessibility controls"
      className={`fixed ${sideClass} bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]`}
    >
      <div className="aurora-panel relative rounded-2xl border border-aurora-border/60 px-2 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateAccessibility({ reducedMotion: !accessibility.reducedMotion })}
            aria-pressed={accessibility.reducedMotion}
            aria-label="Toggle reduced motion"
            className={`min-h-[44px] min-w-[44px] rounded-xl border px-3 text-[11px] font-mono uppercase tracking-[0.24em] transition-colors ${
              accessibility.reducedMotion
                ? 'border-aurora-cyan/60 bg-aurora-cyan/20 text-aurora-cyan'
                : 'border-aurora-border/50 bg-black/20 text-aurora-muted'
            }`}
          >
            RM
          </button>
          <button
            type="button"
            onClick={() => updateAccessibility({ highContrast: !accessibility.highContrast })}
            aria-pressed={accessibility.highContrast}
            aria-label="Toggle high contrast"
            className={`min-h-[44px] min-w-[44px] rounded-xl border px-3 text-[11px] font-mono uppercase tracking-[0.24em] transition-colors ${
              accessibility.highContrast
                ? 'border-aurora-cyan/60 bg-aurora-cyan/20 text-aurora-cyan'
                : 'border-aurora-border/50 bg-black/20 text-aurora-muted'
            }`}
          >
            HC
          </button>
          <button
            type="button"
            onClick={() => updateAccessibility({ largeText: !accessibility.largeText, fontScale: accessibility.largeText ? 1 : 1.2 })}
            aria-pressed={accessibility.largeText}
            aria-label="Toggle large text"
            className={`min-h-[44px] min-w-[44px] rounded-xl border px-3 text-[11px] font-mono uppercase tracking-[0.24em] transition-colors ${
              accessibility.largeText
                ? 'border-aurora-cyan/60 bg-aurora-cyan/20 text-aurora-cyan'
                : 'border-aurora-border/50 bg-black/20 text-aurora-muted'
            }`}
          >
            TXT
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('accessibility')}
            aria-label="Open accessibility settings"
            className="min-h-[44px] rounded-xl border border-aurora-border/50 bg-black/20 px-3 text-xs font-mono uppercase tracking-[0.24em] text-aurora-white transition-colors hover:border-aurora-cyan/50 hover:text-aurora-cyan"
          >
            A11Y
          </button>
        </div>
      </div>
    </aside>
  );
}
