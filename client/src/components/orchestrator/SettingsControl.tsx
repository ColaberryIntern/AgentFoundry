import type { OrchestratorSetting } from '../../types/orchestrator';

interface SettingsControlProps {
  setting: OrchestratorSetting;
  onUpdate: (key: string, value: unknown) => void;
}

export function SettingsControl({ setting, onUpdate }: SettingsControlProps) {
  const value = setting.settingValue;

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)]">{setting.label}</div>
        {setting.description && (
          <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
            {setting.description}
          </div>
        )}
      </div>

      <div className="flex-shrink-0">
        {setting.settingType === 'toggle' && (
          <button
            onClick={() => onUpdate(setting.settingKey, !value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )}

        {setting.settingType === 'slider' && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={setting.minValue ?? 0}
              max={setting.maxValue ?? 100}
              step={setting.maxValue && setting.maxValue <= 1 ? 0.05 : 1}
              value={Number(value) || 0}
              onChange={(e) => onUpdate(setting.settingKey, parseFloat(e.target.value))}
              className="w-24 h-1.5 accent-blue-500"
            />
            <span className="text-xs font-mono text-[var(--text-secondary)] w-10 text-right">
              {typeof value === 'number' && value <= 1 ? value.toFixed(2) : String(value)}
            </span>
          </div>
        )}

        {setting.settingType === 'number' && (
          <input
            type="number"
            value={Number(value) || 0}
            min={setting.minValue ?? undefined}
            max={setting.maxValue ?? undefined}
            onChange={(e) => onUpdate(setting.settingKey, parseInt(e.target.value, 10))}
            className="w-20 px-2 py-1 text-sm text-right rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--text-primary)]"
          />
        )}

        {setting.settingType === 'select' && (
          <select
            value={String(value)}
            onChange={(e) => onUpdate(setting.settingKey, e.target.value)}
            className="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--text-primary)]"
          >
            {setting.settingKey === 'autonomy_level' && (
              <>
                <option value="advisory">Advisory</option>
                <option value="semi_autonomous">Semi-Autonomous</option>
                <option value="full_autonomous">Full Autonomous</option>
              </>
            )}
            {setting.settingKey === 'regulatory_scan_frequency' && (
              <>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </>
            )}
            {setting.settingKey === 'drift_scan_frequency' && (
              <>
                <option value="5min">5 min</option>
                <option value="15min">15 min</option>
                <option value="30min">30 min</option>
                <option value="hourly">Hourly</option>
              </>
            )}
            {setting.settingKey === 'gap_scan_frequency' && (
              <>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </>
            )}
          </select>
        )}
      </div>
    </div>
  );
}
