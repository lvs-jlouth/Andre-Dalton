import { useSettingsStore } from '../../store/settingsStore.js';
import { useAssistantStore } from '../../store/assistantStore.js';

type Panel = 'dashboard' | 'providers' | 'voice' | 'accessibility' | 'privacy' | 'microsoft' | 'personality' | 'browser' | 'processing';

const NAV_ITEMS: { id: Panel; label: string; shortLabel: string }[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash' },
  { id: 'providers', label: 'Providers', shortLabel: 'AI' },
  { id: 'personality', label: 'Personality', shortLabel: 'Style' },
  { id: 'processing', label: 'Research & Analysis', shortLabel: 'R&A' },
  { id: 'voice', label: 'Voice Profile', shortLabel: 'Voice' },
  { id: 'browser', label: 'Browser', shortLabel: 'Web' },
  { id: 'microsoft', label: 'Microsoft', shortLabel: 'MS' },
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
  const status = useAssistantStore((s) => s.status);

  return (
    <header
      className="sticky top-0 z-50 bg-jargiin-panel/90 backdrop-blur-sm border-b border-jargiin-border/50"
      role="banner"
    >
      <div className="flex items-center justify-between px-4 py-2 max-w-7xl mx-auto">
        {/* Logo / identity */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg bg-jargiin-cyan/20 border border-jargiin-cyan/40 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" stroke="#00d4ff" strokeWidth="1" fill="none" />
              <circle cx="8" cy="8" r="2" fill="#00d4ff" opacity="0.6" />
            </svg>
          </div>
          <span className="text-sm font-mono font-bold tracking-widest text-jargiin-cyan">
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
                    focus:outline-none focus:ring-2 focus:ring-jargiin-cyan/50 focus:ring-offset-1 focus:ring-offset-jargiin-panel
                    min-h-[36px]
                    ${activePanel === item.id
                      ? 'bg-jargiin-cyan/20 text-jargiin-cyan border border-jargiin-cyan/40'
                      : 'text-jargiin-muted hover:text-jargiin-white hover:bg-jargiin-border/20 border border-transparent'}
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
              status === 'idle' ? 'bg-jargiin-success' :
              status === 'error' ? 'bg-jargiin-danger' :
              'bg-jargiin-cyan animate-pulse'
            }`}
            aria-hidden="true"
          />
          <span className="text-xs font-mono text-jargiin-muted capitalize hidden sm:inline">
            {status}
          </span>
          <span className="sr-only">J.A.R.G.I.I.N. status: {status}</span>
        </div>
      </div>
    </header>
  );
}
