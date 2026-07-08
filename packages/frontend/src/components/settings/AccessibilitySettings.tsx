import { Panel } from '../ui/Panel.js';
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
    <div className="flex items-center justify-between gap-3 py-2 border-b border-jargiin-border/20 last:border-0">
      <div>
        <label htmlFor={id} className="text-sm font-mono text-jargiin-white cursor-pointer">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-xs text-jargiin-muted mt-0.5">{description}</p>
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
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-jargiin-cyan/50 focus:ring-offset-2 focus:ring-offset-jargiin-bg
          ${checked ? 'bg-jargiin-cyan/60' : 'bg-jargiin-border/40'}
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
 * All preferences are stored locally in the browser via Zustand/localStorage.
 */
export function AccessibilitySettingsPanel() {
  const settings = useSettingsStore((s) => s.accessibility);
  const update = useSettingsStore((s) => s.updateAccessibility);

  function patch(p: Partial<AccessibilitySettings>) {
    update(p);
  }

  return (
    <Panel title="Accessibility Settings" aria-label="Accessibility preferences">
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

        {/* Font scale slider */}
        <div className="py-2">
          <label htmlFor="font-scale" className="block text-sm font-mono text-jargiin-white mb-1">
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
            className="w-full accent-jargiin-cyan"
            aria-valuemin={0.8}
            aria-valuemax={2.5}
            aria-valuenow={settings.fontScale}
            aria-valuetext={`${settings.fontScale.toFixed(1)} times`}
          />
        </div>

        {/* One-handed layout */}
        <div className="py-2">
          <fieldset>
            <legend className="text-sm font-mono text-jargiin-white mb-1">
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
                    className="accent-jargiin-cyan"
                  />
                  <span className="text-sm font-mono text-jargiin-white capitalize">{val}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </Panel>
  );
}
