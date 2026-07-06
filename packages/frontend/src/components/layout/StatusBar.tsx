import { useSettingsStore } from '../../store/settingsStore.js';
import { useAssistantStore } from '../../store/assistantStore.js';

type Panel = 'dashboard' | 'providers' | 'voice' | 'accessibility' | 'privacy';

const NAV_ITEMS: { id: Panel; label: string; shortLabel: string }[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash' },
  { id: 'providers', label: 'Providers', shortLabel: 'AI' },
  { id: 'voice', label: 'Voice Profile', shortLabel: 'Voice' },
  { id: 'accessibility', label: 'Accessibility', shortLabel: 'A11y' },
  { id: 'privacy', label: 'Privacy', shortLabel: 'Privacy' },
];

/**
 * StatusBar — top navigation and status strip.
 * Uses a <nav> element with proper ARIA landmarks for screen reader navigation.
 */
export function StatusBar() {
  const activePanel = useSettingsStore((s) => s.activePanel);
  const setActivePanel = useSettingsStore((s) => s.setActivePanel);
  const onHandedLayout = useSettingsStore((s) => s.accessibility.onHandedLayout);
  const status = useAssistantStore((s) => s.status);

  const mobileDockPosition =
    onHandedLayout === 'left'
      ? 'justify-start'
      : onHandedLayout === 'right'
      ? 'justify-end'
      : 'justify-center';

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-aurora-border/50 bg-aurora-panel/90 backdrop-blur-xl"
        role="banner"
      >
      <div className="flex items-center justify-between gap-4 px-4 py-3 max-w-7xl mx-auto">
        {/* Logo / identity */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-aurora-cyan/40 bg-aurora-cyan/10 shadow-[0_0_24px_rgba(0,212,255,0.18)]"
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" stroke="#00d4ff" strokeWidth="1" fill="none" />
              <circle cx="8" cy="8" r="2" fill="#00d4ff" opacity="0.6" />
            </svg>
          </div>
          <div>
            <span className="block text-sm font-mono font-bold tracking-[0.32em] text-aurora-cyan">
              AURORA
            </span>
            <span className="hidden text-[11px] font-mono uppercase tracking-[0.24em] text-aurora-muted sm:block">
              adaptive reasoning interface
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex gap-1" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActivePanel(item.id)}
                  aria-current={activePanel === item.id ? 'page' : undefined}
                  className={`
                    min-h-[40px] rounded-xl border px-3 py-1.5 text-xs font-mono tracking-[0.18em]
                    transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 focus:ring-offset-1 focus:ring-offset-aurora-panel
                    ${activePanel === item.id
                      ? 'border-aurora-cyan/40 bg-aurora-cyan/20 text-aurora-cyan'
                      : 'text-aurora-muted hover:text-aurora-white hover:bg-aurora-border/20 border border-transparent'}
                  `}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Status indicator */}
        <div aria-live="polite" aria-atomic="true" className="flex items-center gap-2 rounded-full border border-aurora-border/40 bg-black/10 px-3 py-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'idle' ? 'bg-aurora-success' :
              status === 'error' ? 'bg-aurora-danger' :
              'bg-aurora-cyan animate-pulse'
            }`}
            aria-hidden="true"
          />
          <span className="hidden text-xs font-mono uppercase tracking-[0.18em] text-aurora-muted sm:inline">
            {status}
          </span>
          <span className="sr-only">AURORA status: {status}</span>
        </div>
      </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className={`aurora-bottom-safe fixed inset-x-0 bottom-0 z-40 flex px-3 pb-2 pt-2 md:hidden ${mobileDockPosition}`}
      >
        <div className="aurora-panel flex max-w-full gap-1 overflow-x-auto rounded-[1.4rem] border border-aurora-border/60 px-2 py-2 backdrop-blur-xl">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              aria-current={activePanel === item.id ? 'page' : undefined}
              className={`min-h-[44px] rounded-xl border px-3 text-xs font-mono uppercase tracking-[0.18em] ${
                activePanel === item.id
                  ? 'border-aurora-cyan/40 bg-aurora-cyan/20 text-aurora-cyan'
                  : 'border-transparent bg-transparent text-aurora-muted'
              }`}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
