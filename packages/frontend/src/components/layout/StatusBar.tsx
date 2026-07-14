import { useSettingsStore } from '../../store/settingsStore.js';
import { useAssistantStore } from '../../store/assistantStore.js';

type Panel = 'dashboard' | 'settings';

const NAV_ITEMS: { id: Panel; label: string; shortLabel: string }[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings' },
];

interface StatusBarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

/**
 * StatusBar — top navigation and status strip.
 * Uses a <nav> element with proper ARIA landmarks for screen reader navigation.
 */
export function StatusBar({ onToggleSidebar, sidebarOpen = false }: StatusBarProps) {
  const activePanel = useSettingsStore((s) => s.activePanel);
  const setActivePanel = useSettingsStore((s) => s.setActivePanel);
  const status = useAssistantStore((s) => s.status);

  return (
    <header
      className="sticky top-0 z-50 bg-aurora-panel/90 backdrop-blur-sm border-b border-aurora-border/50"
      role="banner"
    >
      <div className="flex items-center justify-between px-4 py-2 max-w-7xl mx-auto">
        {/* Logo / identity */}
        <div className="flex items-center gap-3">
          {activePanel === 'dashboard' && onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={sidebarOpen ? 'Close assistant sidebar' : 'Open assistant sidebar'}
              aria-expanded={sidebarOpen}
              className="inline-flex lg:hidden w-9 h-9 rounded-lg border border-aurora-border/60 items-center justify-center text-aurora-cyan hover:bg-aurora-cyan/10 focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50"
            >
              <span className="sr-only">Toggle sidebar</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M3 5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3 9H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <div
            className="w-8 h-8 rounded-lg bg-aurora-cyan/20 border border-aurora-cyan/40 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" stroke="#00d4ff" strokeWidth="1" fill="none" />
              <circle cx="8" cy="8" r="2" fill="#00d4ff" opacity="0.6" />
            </svg>
          </div>
          <span className="text-sm font-mono font-bold tracking-widest text-aurora-cyan">
            J.A.R.G.I.I.N.
          </span>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation">
          <ul className="flex gap-1" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActivePanel(item.id)}
                  aria-current={activePanel === item.id ? 'page' : undefined}
                  className={`
                    px-3 py-1.5 rounded text-xs font-mono tracking-wide
                    transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 focus:ring-offset-1 focus:ring-offset-aurora-panel
                    min-h-[36px]
                    ${activePanel === item.id
                      ? 'bg-aurora-cyan/20 text-aurora-cyan border border-aurora-cyan/40'
                      : 'text-aurora-muted hover:text-aurora-white hover:bg-aurora-border/20 border border-transparent'}
                  `}
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Status indicator */}
        <div aria-live="polite" aria-atomic="true" className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'idle' ? 'bg-aurora-success' :
              status === 'error' ? 'bg-aurora-danger' :
              'bg-aurora-cyan animate-pulse'
            }`}
            aria-hidden="true"
          />
          <span className="text-xs font-mono text-aurora-muted capitalize hidden sm:inline">
            {status}
          </span>
          <span className="sr-only">J.A.R.G.I.I.N. status: {status}</span>
        </div>
      </div>
    </header>
  );
}
