import { Panel } from '../ui/Panel.js';
import { useSettingsStore } from '../../store/settingsStore.js';
import { useSpeechProfileStore } from '../../store/speechProfileStore.js';
import type { PrivacySettings } from '../../types/settings.js';

/**
 * PrivacySettings panel — transparent user controls for data handling.
 * Following a privacy-first, consent-first design.
 */
export function PrivacySettingsPanel() {
  const settings = useSettingsStore((s) => s.privacy);
  const update = useSettingsStore((s) => s.updatePrivacy);
  const speechProfile = useSpeechProfileStore((s) => s.profile);
  const updateProfile = useSpeechProfileStore((s) => s.updateProfile);

  function patch(p: Partial<PrivacySettings>) {
    update(p);
  }

  return (
    <Panel title="Privacy Settings" aria-label="Privacy and data preferences">
      <div className="space-y-4 text-sm">
        {/* Data retention */}
        <section aria-labelledby="data-retention-heading">
          <h3 id="data-retention-heading" className="text-xs font-mono font-semibold tracking-widest uppercase text-jargiin-muted mb-2">
            Data Retention
          </h3>

          <label className="flex items-start gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={settings.persistTranscripts}
              onChange={(e) => patch({ persistTranscripts: e.target.checked })}
              className="mt-0.5 accent-jargiin-cyan w-5 h-5"
              aria-describedby="persist-desc"
            />
            <span>
              <span className="font-mono text-jargiin-white">Persist conversation transcripts</span>
              <span id="persist-desc" className="block text-jargiin-muted text-xs mt-0.5">
                By default, conversations are not saved. Enable this to retain a local history.
              </span>
            </span>
          </label>
        </section>

        {/* Consent */}
        <section aria-labelledby="consent-heading">
          <h3 id="consent-heading" className="text-xs font-mono font-semibold tracking-widest uppercase text-jargiin-muted mb-2">
            Consent
          </h3>

          <label className="flex items-start gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={speechProfile.consentStoringCorrections}
              onChange={(e) => updateProfile({ consentStoringCorrections: e.target.checked })}
              className="mt-0.5 accent-jargiin-cyan w-5 h-5"
              aria-describedby="consent-corrections-desc"
            />
            <span>
              <span className="font-mono text-jargiin-white">Store my speech corrections</span>
              <span id="consent-corrections-desc" className="block text-jargiin-muted text-xs mt-0.5">
                When I correct a misrecognised word, save it to my profile for future sessions.
                This data stays on your device.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={speechProfile.consentLocalLearning}
              onChange={(e) => updateProfile({ consentLocalLearning: e.target.checked })}
              className="mt-0.5 accent-jargiin-cyan w-5 h-5"
              aria-describedby="consent-learning-desc"
            />
            <span>
              <span className="font-mono text-jargiin-white">Enable local speech profile learning</span>
              <span id="consent-learning-desc" className="block text-jargiin-muted text-xs mt-0.5">
                Allow J.A.R.G.I.I.N. to refine my interaction preferences over time based on local usage.
                No data leaves this device.
              </span>
            </span>
          </label>
        </section>

        {/* Transparency notice */}
        <section className="bg-jargiin-bg/40 border border-jargiin-border/30 rounded-lg p-3 text-xs text-jargiin-muted space-y-1">
          <p className="font-mono font-semibold text-jargiin-cyan/80">Privacy assurance</p>
          <p>• API keys are never stored in your browser or logs.</p>
          <p>• Prompts and responses are not logged by default.</p>
          <p>• All processing uses the provider you configure.</p>
          <p>• Speech data is not sent to third parties unless you configure a cloud STT provider.</p>
          <p>• You can clear all local data at any time by clearing site data in your browser settings.</p>
        </section>
      </div>
    </Panel>
  );
}
