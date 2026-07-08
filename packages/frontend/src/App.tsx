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
import { PersonalitySettingsPanel } from './components/settings/PersonalitySettings.js';
import { MicrosoftIntegration } from './components/microsoft/MicrosoftIntegration.js';
import { useSettingsStore } from './store/settingsStore.js';
import './index.css';

/**
 * J.A.R.G.I.I.N. — App root.
 * Renders the active panel based on navigation state from settingsStore.
 */
export default function App() {
  const activePanel = useSettingsStore((s) => s.activePanel);
  const bootMode = useSettingsStore((s) => s.bootMode);

  return (
    <HUDLayout>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-jargiin-cyan focus:text-jargiin-bg focus:px-4 focus:py-2 focus:rounded-lg font-mono text-sm"
      >
        Skip to main content
      </a>

      {/* Navigation menu — only visible in boot/configuration mode */}
      {bootMode && <StatusBar />}

      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6">
        {bootMode ? (
          <>
            {activePanel === 'dashboard' && <DashboardView />}
            {activePanel === 'providers' && <ProvidersView />}
            {activePanel === 'personality' && <PersonalityView />}
            {activePanel === 'voice' && <VoiceView />}
            {activePanel === 'accessibility' && <AccessibilityView />}
            {activePanel === 'privacy' && <PrivacyView />}
            {activePanel === 'microsoft' && <MicrosoftView />}
          </>
        ) : (
          <DashboardView />
        )}
      </main>
    </HUDLayout>
  );
}

function DashboardView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column */}
      <div className="space-y-4">
        <div className="flex justify-center py-4">
          <CognitiveCore />
        </div>
        <SystemsStream />
      </div>

      {/* Main column */}
      <div className="lg:col-span-2 space-y-4">
        <DialogueLedger />
        <IntentConsole />
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

function MicrosoftView() {
  return (
    <div className="max-w-2xl mx-auto">
      <MicrosoftIntegration />
    </div>
  );
}

function PersonalityView() {
  return (
    <div className="max-w-2xl mx-auto">
      <PersonalitySettingsPanel />
    </div>
  );
}
