import { useEffect, useState } from 'react';
import { HUDLayout } from './components/layout/HUDLayout.js';
import { StatusBar } from './components/layout/StatusBar.js';
import { CognitiveCore } from './components/core/CognitiveCore.js';
import { SystemsStream } from './components/core/SystemsStream.js';
import { ConversationHistoryPanel } from './components/panels/ConversationHistoryPanel.js';
import { DialogueLedger } from './components/panels/DialogueLedger.js';
import { IntentConsole } from './components/panels/IntentConsole.js';
import { SettingsPage } from './components/settings/SettingsPage.js';
import { useSettingsStore } from './store/settingsStore.js';
import { useSpeechProfileStore } from './store/speechProfileStore.js';
import { getUserConfig } from './services/api.js';
import './index.css';

/**
 * J.A.R.G.I.I.N. — App root.
 * Renders the active panel based on navigation state from settingsStore.
 */
export default function App() {
  const activePanel = useSettingsStore((s) => s.activePanel);
  const setAllSettings = useSettingsStore((s) => s.setAllSettings);
  const setProfile = useSpeechProfileStore((s) => s.setProfile);
  const showSettings = activePanel === 'settings'
    || activePanel === 'providers'
    || activePanel === 'voice'
    || activePanel === 'accessibility'
    || activePanel === 'privacy';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getUserConfig();
        if (cancelled) return;
        setAllSettings({
          accessibility: remote.accessibility,
          privacy: remote.privacy,
        });
        setProfile(remote.speechProfile);
      } catch {
        // Keep local persisted settings when remote profile is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setAllSettings, setProfile]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (activePanel !== 'dashboard') {
      setSidebarOpen(false);
    }
  }, [activePanel]);

  return (
    <HUDLayout>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-aurora-cyan focus:text-aurora-bg focus:px-4 focus:py-2 focus:rounded-lg font-mono text-sm"
      >
        Skip to main content
      </a>

      <StatusBar
        onToggleSidebar={activePanel === 'dashboard' ? () => setSidebarOpen((open) => !open) : undefined}
        sidebarOpen={sidebarOpen}
      />

      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6">
        {activePanel === 'dashboard' && (
          <DashboardView
            sidebarOpen={sidebarOpen}
            onCloseSidebar={() => setSidebarOpen(false)}
          />
        )}
        {showSettings && <SettingsView />}
      </main>
    </HUDLayout>
  );
}

interface DashboardViewProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

function AssistantSidebarContent() {
  return (
    <div className="space-y-4">
      <div className="flex justify-center py-4">
        <CognitiveCore />
      </div>
      <SystemsStream />
      <ConversationHistoryPanel />
    </div>
  );
}

function DashboardView({ sidebarOpen, onCloseSidebar }: DashboardViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column */}
      <div className="hidden lg:block">
        <AssistantSidebarContent />
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={onCloseSidebar}
            className="absolute inset-0 bg-aurora-bg/70 backdrop-blur-sm"
          />
          <aside className="relative z-10 h-full w-[min(88vw,24rem)] overflow-y-auto border-r border-aurora-border/60 bg-aurora-panel/95 p-4 shadow-2xl shadow-black/50">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-cyan/80">
                Assistant Menu
              </p>
              <button
                type="button"
                onClick={onCloseSidebar}
                className="rounded border border-aurora-border/60 px-3 py-1 text-sm font-mono text-aurora-white hover:border-aurora-cyan/60 hover:text-aurora-cyan"
              >
                Close
              </button>
            </div>
            <AssistantSidebarContent />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:col-span-2 space-y-4">
        <DialogueLedger />
        <IntentConsole />
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <SettingsPage />
  );
}
