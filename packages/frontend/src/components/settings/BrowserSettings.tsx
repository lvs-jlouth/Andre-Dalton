/**
 * BrowserSettings — configure browser integration, search engine, and voice browsing.
 */
import { Panel } from '../ui/Panel.js';
import { useBrowserStore } from '../../store/browserStore.js';
import { detectBrowser, getBrowserName } from '../../services/browser/browserController.js';
import type { BrowserEngine, SearchEngine } from '../../services/browser/browserController.js';

export function BrowserSettingsPanel() {
  const {
    preferredBrowser,
    searchEngine,
    voiceBrowsingEnabled,
    announceActions,
    setPreferredBrowser,
    setSearchEngine,
    setVoiceBrowsingEnabled,
    setAnnounceActions,
  } = useBrowserStore();

  const detectedBrowser = detectBrowser();

  return (
    <Panel title="Browser Integration" aria-label="Browser settings">
      <div className="space-y-6">
        {/* Detected Browser */}
        <div className="p-3 rounded-lg bg-jargiin-bg/50 border border-jargiin-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌐</span>
            <div>
              <p className="text-sm font-mono text-jargiin-white">
                Detected: <span className="text-jargiin-cyan">{getBrowserName(detectedBrowser)}</span>
              </p>
              <p className="text-xs text-jargiin-muted">
                Voice browsing is {voiceBrowsingEnabled ? 'enabled' : 'disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* Preferred Browser */}
        <div>
          <label className="block text-xs font-mono text-jargiin-muted mb-2">
            Preferred Browser
          </label>
          <div className="flex gap-2 flex-wrap">
            {(['auto', 'chrome', 'edge', 'safari'] as BrowserEngine[]).map((engine) => (
              <button
                key={engine}
                onClick={() => setPreferredBrowser(engine)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors
                  ${preferredBrowser === engine
                    ? 'border-jargiin-cyan bg-jargiin-cyan/10 text-jargiin-cyan'
                    : 'border-jargiin-border text-jargiin-muted hover:text-jargiin-white'}
                `}
              >
                {engine === 'auto' ? `Auto (${getBrowserName(detectedBrowser)})` : getBrowserName(engine)}
              </button>
            ))}
          </div>
        </div>

        {/* Search Engine */}
        <div>
          <label className="block text-xs font-mono text-jargiin-muted mb-2">
            Search Engine
          </label>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: 'google', label: 'Google', icon: '🔍' },
              { id: 'bing', label: 'Bing', icon: '🅱️' },
              { id: 'duckduckgo', label: 'DuckDuckGo', icon: '🦆' },
            ] as { id: SearchEngine; label: string; icon: string }[]).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setSearchEngine(id)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors flex items-center gap-1.5
                  ${searchEngine === id
                    ? 'border-jargiin-cyan bg-jargiin-cyan/10 text-jargiin-cyan'
                    : 'border-jargiin-border text-jargiin-muted hover:text-jargiin-white'}
                `}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Browsing Toggle */}
        <div className="space-y-3">
          <ToggleRow
            label="Voice Browser Control"
            description="Control browser with voice commands (search, navigate, scroll, etc.)"
            checked={voiceBrowsingEnabled}
            onChange={setVoiceBrowsingEnabled}
          />
          <ToggleRow
            label="Announce Actions"
            description="Speak confirmations when browser actions are performed"
            checked={announceActions}
            onChange={setAnnounceActions}
          />
        </div>

        {/* Voice Commands Reference */}
        <div className="p-4 rounded-lg bg-jargiin-bg/50 border border-jargiin-border">
          <h4 className="text-jargiin-cyan font-mono text-xs font-semibold mb-3">
            VOICE COMMANDS
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <VoiceCmd cmd="Search for [topic]" desc="Web search" />
            <VoiceCmd cmd="Go to [url]" desc="Navigate" />
            <VoiceCmd cmd="Open new tab" desc="New tab" />
            <VoiceCmd cmd="Go back / forward" desc="History" />
            <VoiceCmd cmd="Scroll up / down" desc="Scroll" />
            <VoiceCmd cmd="Scroll to top / bottom" desc="Jump" />
            <VoiceCmd cmd="Read the page" desc="Read aloud" />
            <VoiceCmd cmd="Find [text] on page" desc="Search page" />
            <VoiceCmd cmd="Refresh" desc="Reload" />
            <VoiceCmd cmd="Use DuckDuckGo" desc="Switch engine" />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 rounded-lg bg-jargiin-bg/30 border border-jargiin-border cursor-pointer hover:border-jargiin-cyan/30 transition-colors">
      <div>
        <span className="text-sm font-mono text-jargiin-white">{label}</span>
        <p className="text-xs text-jargiin-muted mt-0.5">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-jargiin-cyan"
      />
    </label>
  );
}

function VoiceCmd({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-jargiin-muted">{desc}:</span>
      <span className="text-jargiin-white font-mono">"{cmd}"</span>
    </div>
  );
}
