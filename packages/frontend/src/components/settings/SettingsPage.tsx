import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button.js';
import { ModelRouter } from '../panels/ModelRouter.js';
import { VoiceAdaptation } from '../panels/VoiceAdaptation.js';
import { AccessibilitySettingsPanel } from './AccessibilitySettings.js';
import { PrivacySettingsPanel } from './PrivacySettings.js';
import { useSettingsStore } from '../../store/settingsStore.js';
import { useSpeechProfileStore } from '../../store/speechProfileStore.js';
import { getUserConfig, saveUserConfig } from '../../services/api.js';

const SETTINGS_TABS = [
  { id: 'provider', label: 'Provider routing' },
  { id: 'voice', label: 'Voice profile' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'privacy', label: 'Privacy' },
] as const;

type SettingsTabId = typeof SETTINGS_TABS[number]['id'];

class VoiceSettingsBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(_error: unknown, _errorInfo: ErrorInfo): void {}

  render() {
    if (this.state.hasError) {
      return (
        <section className="bg-aurora-panel/80 border border-aurora-danger/50 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-mono font-semibold text-aurora-danger">Voice settings failed to load</h2>
          <p className="text-sm text-aurora-white/90">
            Stored voice profile data appears incompatible. Resetting the voice profile will restore this tab.
          </p>
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem('aurora-speech-profile');
                window.location.reload();
              }
            }}
          >
            Reset voice profile
          </Button>
        </section>
      );
    }

    return this.props.children;
  }
}

/**
 * Unified settings page for all user configuration.
 * Optimized for tracking/focus challenges with large tap targets and clear sectioning.
 */
export function SettingsPage() {
  const accessibility = useSettingsStore((s) => s.accessibility);
  const privacy = useSettingsStore((s) => s.privacy);
  const updateAccessibility = useSettingsStore((s) => s.updateAccessibility);
  const setAllSettings = useSettingsStore((s) => s.setAllSettings);
  const profile = useSpeechProfileStore((s) => s.profile);
  const setProfile = useSpeechProfileStore((s) => s.setProfile);
  const markSaved = useSpeechProfileStore((s) => s.markSaved);
  const [activeTab, setActiveTab] = useState<SettingsTabId>('provider');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const lastSavedSnapshotRef = useRef('');

  function createSnapshot(next: {
    speechProfile: typeof profile;
    accessibility: typeof accessibility;
    privacy: typeof privacy;
  }): string {
    return JSON.stringify({
      speechProfile: {
        ...next.speechProfile,
        updatedAt: '',
      },
      accessibility: next.accessibility,
      privacy: next.privacy,
    });
  }

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
        lastSavedSnapshotRef.current = createSnapshot({
          speechProfile: remote.speechProfile,
          accessibility: remote.accessibility,
          privacy: remote.privacy,
        });
      } catch {
        if (!cancelled) setSaveStatus('Running with local settings. Save will retry cloud persistence.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setAllSettings, setProfile]);

  const canSave = useMemo(() => !isLoading && !isSaving, [isLoading, isSaving]);

  async function onSaveAll() {
    if (!canSave) return;
    setIsSaving(true);
    setSaveStatus('');
    try {
      const saved = await saveUserConfig({
        speechProfile: profile,
        accessibility,
        privacy,
      });
      setAllSettings({
        accessibility: saved.accessibility,
        privacy: saved.privacy,
      });
      setProfile(saved.speechProfile);
      markSaved();
      lastSavedSnapshotRef.current = createSnapshot({
        speechProfile: saved.speechProfile,
        accessibility: saved.accessibility,
        privacy: saved.privacy,
      });
      setSaveStatus('Saved to SharePoint-backed user profile.');
    } catch {
      setSaveStatus('Save failed. Please retry in a moment.');
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (isLoading || isSaving) return;
    const snapshot = createSnapshot({ speechProfile: profile, accessibility, privacy });
    if (snapshot === lastSavedSnapshotRef.current) return;

    const timer = window.setTimeout(() => {
      void onSaveAll();
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [profile, accessibility, privacy, isLoading, isSaving]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-base leading-7">
      <section
        aria-labelledby="settings-page-heading"
        className="bg-aurora-panel/80 border border-aurora-border/60 rounded-xl p-5 space-y-4"
      >
        <h1 id="settings-page-heading" className="text-xl sm:text-2xl font-mono font-semibold text-aurora-cyan">
          Settings Hub
        </h1>

        <p className="text-aurora-white/90">
          All configuration is consolidated on this single page. Use tabs to focus on one settings
          area at a time with less visual distraction.
        </p>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" onClick={onSaveAll} disabled={!canSave}>
            {isSaving ? 'Saving...' : 'Save all settings'}
          </Button>
          {saveStatus && <p className="text-xs text-aurora-muted">{saveStatus}</p>}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick readability actions">
          <Button
            variant={accessibility.reducedMotion ? 'primary' : 'ghost'}
            size="md"
            onClick={() => updateAccessibility({ reducedMotion: !accessibility.reducedMotion })}
          >
            {accessibility.reducedMotion ? 'Reduced motion: on' : 'Reduced motion: off'}
          </Button>
          <Button
            variant={accessibility.highContrast ? 'primary' : 'ghost'}
            size="md"
            onClick={() => updateAccessibility({ highContrast: !accessibility.highContrast })}
          >
            {accessibility.highContrast ? 'High contrast: on' : 'High contrast: off'}
          </Button>
          <Button
            variant={accessibility.largeText ? 'primary' : 'ghost'}
            size="md"
            onClick={() =>
              updateAccessibility({
                largeText: !accessibility.largeText,
                fontScale: accessibility.largeText ? 1.0 : 1.4,
              })}
          >
            {accessibility.largeText ? 'Large text: on' : 'Large text: off'}
          </Button>
        </div>

        <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-2">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center rounded-lg border px-3 py-2 min-h-[44px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 ${
                activeTab === tab.id
                  ? 'border-aurora-cyan/70 bg-aurora-cyan/15 text-aurora-cyan'
                  : 'border-aurora-border/70 bg-aurora-bg/40 text-aurora-white hover:border-aurora-cyan/60 hover:text-aurora-cyan'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'provider' && (
        <section id="panel-provider" role="tabpanel" aria-labelledby="tab-provider">
          <ModelRouter />
        </section>
      )}

      {activeTab === 'voice' && (
        <section id="panel-voice" role="tabpanel" aria-labelledby="tab-voice">
          <VoiceSettingsBoundary>
            <VoiceAdaptation />
          </VoiceSettingsBoundary>
        </section>
      )}

      {activeTab === 'accessibility' && (
        <section id="panel-accessibility" role="tabpanel" aria-labelledby="tab-accessibility">
          <AccessibilitySettingsPanel />
        </section>
      )}

      {activeTab === 'privacy' && (
        <section id="panel-privacy" role="tabpanel" aria-labelledby="tab-privacy">
          <PrivacySettingsPanel />
        </section>
      )}
    </div>
  );
}
