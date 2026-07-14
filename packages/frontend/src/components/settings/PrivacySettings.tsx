import { Panel } from '../ui/Panel.js';
import { AccordionSection } from '../ui/AccordionSection.js';
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
      <div className="space-y-3 text-sm">
        <AccordionSection
          id="privacy-retention"
          title="Data retention"
          subtitle="Transcript persistence controls"
          defaultOpen
        >
          <label className="flex items-start gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={settings.persistTranscripts}
              onChange={(e) => patch({ persistTranscripts: e.target.checked })}
              className="mt-0.5 accent-aurora-cyan w-5 h-5"
              aria-describedby="persist-desc"
            />
            <span>
              <span className="font-mono text-aurora-white">Persist conversation transcripts</span>
              <span id="persist-desc" className="block text-aurora-muted text-xs mt-0.5">
                By default, conversations are not saved. Enable this to retain a local history.
              </span>
            </span>
          </label>
        </AccordionSection>

        <AccordionSection
          id="privacy-consent"
          title="Consent"
          subtitle="Speech profile learning permissions"
          defaultOpen
        >
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={speechProfile.consentStoringCorrections}
                onChange={(e) => updateProfile({ consentStoringCorrections: e.target.checked })}
                className="mt-0.5 accent-aurora-cyan w-5 h-5"
                aria-describedby="consent-corrections-desc"
              />
              <span>
                <span className="font-mono text-aurora-white">Store my speech corrections</span>
                <span id="consent-corrections-desc" className="block text-aurora-muted text-xs mt-0.5">
                  When I correct a misrecognised word, save it to my profile for future sessions.
                  This data is stored in your managed SharePoint settings profile.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={speechProfile.consentLocalLearning}
                onChange={(e) => updateProfile({ consentLocalLearning: e.target.checked })}
                className="mt-0.5 accent-aurora-cyan w-5 h-5"
                aria-describedby="consent-learning-desc"
              />
              <span>
                <span className="font-mono text-aurora-white">Enable local speech profile learning</span>
                <span id="consent-learning-desc" className="block text-aurora-muted text-xs mt-0.5">
                  Allow J.A.R.G.I.I.N. to refine my interaction preferences over time based on your
                  profile usage patterns.
                </span>
              </span>
            </label>
          </div>
        </AccordionSection>

        <AccordionSection
          id="privacy-m365"
          title="Microsoft 365 Context"
          subtitle="Let JARGIIIN read your calendar and emails"
          defaultOpen
        >
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={settings.m365ContextEnabled}
                onChange={(e) => patch({ m365ContextEnabled: e.target.checked })}
                className="mt-0.5 accent-aurora-cyan w-5 h-5"
                aria-describedby="m365-context-desc"
              />
              <span>
                <span className="font-mono text-aurora-white">Enable Microsoft 365 context awareness</span>
                <span id="m365-context-desc" className="block text-aurora-muted text-xs mt-0.5">
                  When enabled, J.A.R.G.I.I.N. will include your upcoming calendar events and recent
                  emails as context so it can give more relevant answers about your workday.
                  Requires M365 Graph permissions — see the setup steps below.
                </span>
              </span>
            </label>

            <div className="mt-2 p-3 rounded bg-aurora-surface border border-aurora-muted/20 text-xs text-aurora-muted space-y-1.5">
              <p className="text-aurora-white font-semibold">One-time activation (Azure Portal)</p>
              <p>1. Sign in at <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-aurora-cyan underline">portal.azure.com</a></p>
              <p>2. Go to <span className="font-mono">Entra ID → App registrations → swa-jargiin-prod-auth</span></p>
              <p>3. Click <span className="font-mono">API permissions → Add a permission → Microsoft Graph → Delegated</span></p>
              <p>4. Add: <span className="font-mono">User.Read, Calendars.Read, Mail.Read, Files.Read</span></p>
              <p>5. Click <span className="font-mono">Grant admin consent</span></p>
              <p>6. Log out and back in to J.A.R.G.I.I.N. to re-consent</p>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          id="privacy-assurance"
          title="Privacy assurance"
          subtitle="How data is handled in this app"
        >
          <section className="text-xs text-aurora-muted space-y-1">
            <p>• API keys are never stored in your browser or logs.</p>
            <p>• Prompts and responses are not logged by default.</p>
            <p>• All processing uses the provider you configure.</p>
            <p>• Speech data is not sent to third parties unless you configure a cloud STT provider.</p>
            <p>• You can clear all local data at any time by clearing site data in your browser settings.</p>
          </section>
        </AccordionSection>
      </div>
    </Panel>
  );
}
