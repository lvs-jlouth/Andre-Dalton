import { HUDLayout } from './components/layout/HUDLayout.js';
import { StatusBar } from './components/layout/StatusBar.js';
import { CognitiveCore } from './components/core/CognitiveCore.js';
import { SystemsStream } from './components/core/SystemsStream.js';
import { DialogueLedger } from './components/panels/DialogueLedger.js';
import { IntentConsole } from './components/panels/IntentConsole.js';
import { ModelRouter } from './components/panels/ModelRouter.js';
import { VoiceAdaptation } from './components/panels/VoiceAdaptation.js';
import { AccessibilitySettingsPanel } from './components/settings/AccessibilitySettings.js';
import { PrivacySettingsPanel } from './components/settings/PrivacySettings.js';
import { useSettingsStore } from './store/settingsStore.js';
import './index.css';

/**
 * AURORA — App root.
 * Renders the active panel based on navigation state from settingsStore.
 */
export default function App() {
  const activePanel = useSettingsStore((s) => s.activePanel);

  return (
    <HUDLayout>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-aurora-cyan focus:text-aurora-bg focus:px-4 focus:py-2 focus:rounded-lg font-mono text-sm"
      >
        Skip to main content
      </a>

      <StatusBar />

      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6">
        {activePanel === 'dashboard' && <DashboardView />}
        {activePanel === 'providers' && <ProvidersView />}
        {activePanel === 'voice' && <VoiceView />}
        {activePanel === 'accessibility' && <AccessibilityView />}
        {activePanel === 'privacy' && <PrivacyView />}
      </main>
    </HUDLayout>
  );
}

function DashboardView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-3">
        <section className="aurora-panel relative overflow-hidden rounded-[1.8rem] border border-aurora-border/60 px-5 py-6">
          <div className="absolute inset-0 bg-panel-grid opacity-[0.08]" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center xl:flex-col xl:items-stretch">
            <div className="flex justify-center sm:flex-1 xl:justify-start">
              <CognitiveCore />
            </div>
            <div className="space-y-3 sm:flex-1">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.34em] text-aurora-cyan/80">
                  Cognitive Deck
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-aurora-white sm:text-3xl">
                  Original adaptive HUD for live conversation control.
                </h1>
                <p className="mt-2 max-w-md text-sm text-aurora-muted">
                  AURORA balances routed models, voice-aware interaction, and captioned dialogue inside a dark glass command surface.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs uppercase tracking-[0.24em]">
                <div className="rounded-2xl border border-aurora-border/40 bg-black/10 px-3 py-3 text-aurora-cyan">
                  core
                </div>
                <div className="rounded-2xl border border-aurora-border/40 bg-black/10 px-3 py-3 text-aurora-teal">
                  voice
                </div>
                <div className="rounded-2xl border border-aurora-border/40 bg-black/10 px-3 py-3 text-aurora-blue">
                  router
                </div>
              </div>
            </div>
          </div>
        </section>
        <SystemsStream />
      </div>

      <div className="space-y-4 xl:col-span-6">
        <DialogueLedger />
        <div className="xl:hidden">
          <ModelRouter compact />
        </div>
        <div className="xl:hidden">
          <VoiceAdaptation compact />
        </div>
        <div className="sticky bottom-24 z-20">
          <IntentConsole />
        </div>
      </div>

      <div className="hidden space-y-4 xl:col-span-3 xl:block">
        <ModelRouter />
        <VoiceAdaptation compact />
      </div>
    </div>
  );
}

function ProvidersView() {
  return (
    <div className="max-w-2xl mx-auto">
      <ModelRouter />
    </div>
  );
}

function VoiceView() {
  return (
    <div className="max-w-2xl mx-auto">
      <VoiceAdaptation />
    </div>
  );
}

function AccessibilityView() {
  return (
    <div className="max-w-xl mx-auto">
      <AccessibilitySettingsPanel />
    </div>
  );
}

function PrivacyView() {
  return (
    <div className="max-w-xl mx-auto">
      <PrivacySettingsPanel />
    </div>
  );
}
