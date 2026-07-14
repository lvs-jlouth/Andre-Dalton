import { Panel } from '../ui/Panel.js';
import { AccordionSection } from '../ui/AccordionSection.js';
import { useSettingsStore } from '../../store/settingsStore.js';
import type { AccessibilitySettings } from '../../types/settings.js';

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}

function Toggle({ id, label, checked, onChange, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-aurora-border/20 last:border-0">
      <div>
        <label htmlFor={id} className="text-sm font-mono text-aurora-white cursor-pointer">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-xs text-aurora-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 focus:ring-offset-2 focus:ring-offset-aurora-bg
          ${checked ? 'bg-aurora-cyan/60' : 'bg-aurora-border/40'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
          aria-hidden="true"
        />
        <span className="sr-only">{checked ? 'Enabled' : 'Disabled'}</span>
      </button>
    </div>
  );
}

/**
 * AccessibilitySettings panel.
 * Accessibility preferences panel.
 */
export function AccessibilitySettingsPanel() {
  const settings = useSettingsStore((s) => s.accessibility);
  const update = useSettingsStore((s) => s.updateAccessibility);

  function patch(p: Partial<AccessibilitySettings>) {
    update(p);
  }

  return (
    <Panel title="Accessibility Settings" aria-label="Accessibility preferences">
      <div className="space-y-3">
        <AccordionSection
          id="accessibility-visual"
          title="Visual readability"
          subtitle="Motion, contrast, and text scale"
          defaultOpen
        >
          <div className="space-y-1">
            <Toggle
              id="reduced-motion"
              label="Reduced motion"
              checked={settings.reducedMotion}
              onChange={(v) => patch({ reducedMotion: v })}
              description="Disables animations and transitions"
            />
            <Toggle
              id="high-contrast"
              label="High contrast"
              checked={settings.highContrast}
              onChange={(v) => patch({ highContrast: v })}
              description="Increases text and border contrast"
            />
            <Toggle
              id="large-text"
              label="Large text"
              checked={settings.largeText}
              onChange={(v) => patch({ largeText: v, fontScale: v ? 1.4 : 1.0 })}
              description="Increases base font size"
            />

            <div className="py-2">
              <label htmlFor="font-scale" className="block text-sm font-mono text-aurora-white mb-1">
                Font scale: {settings.fontScale.toFixed(1)}×
              </label>
              <input
                id="font-scale"
                type="range"
                min={0.8}
                max={2.5}
                step={0.1}
                value={settings.fontScale}
                onChange={(e) => patch({ fontScale: Number(e.target.value) })}
                className="w-full accent-aurora-cyan"
                aria-valuemin={0.8}
                aria-valuemax={2.5}
                aria-valuenow={settings.fontScale}
                aria-valuetext={`${settings.fontScale.toFixed(1)} times`}
              />
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          id="accessibility-interaction"
          title="Interaction aids"
          subtitle="Captions, touch targets, and one-handed layout"
          defaultOpen
        >
          <div className="space-y-1">
            <Toggle
              id="captions"
              label="Always-on captions"
              checked={settings.captions}
              onChange={(v) => patch({ captions: v })}
              description="Shows spoken responses as text"
            />
            <Toggle
              id="large-targets"
              label="Large touch targets"
              checked={settings.largeHitTargets}
              onChange={(v) => patch({ largeHitTargets: v })}
              description="Uses xl button sizes for easier tapping"
            />

            <div className="py-2">
              <fieldset>
                <legend className="text-sm font-mono text-aurora-white mb-1">
                  One-handed layout
                </legend>
                <div className="flex gap-3">
                  {(['none', 'left', 'right'] as const).map((val) => (
                    <label key={val} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="one-handed"
                        value={val}
                        checked={settings.onHandedLayout === val}
                        onChange={() => patch({ onHandedLayout: val })}
                        className="accent-aurora-cyan"
                      />
                      <span className="text-sm font-mono text-aurora-white capitalize">{val}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </AccordionSection>
      </div>
    </Panel>
  );
}
