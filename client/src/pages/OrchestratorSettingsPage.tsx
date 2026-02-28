import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchSettings, updateSetting } from '../store/orchestratorSlice';
import { GlassCard } from '../components/ui/GlassCard';
import { SettingsControl } from '../components/orchestrator/SettingsControl';
import type { SettingCategory } from '../types/orchestrator';

const categoryLabels: Record<SettingCategory, string> = {
  autonomy: 'Autonomy',
  guardrails: 'Guardrails',
  scheduling: 'Scheduling',
  marketplace: 'Marketplace',
};

const categoryDescriptions: Record<SettingCategory, string> = {
  autonomy: 'Control how autonomous the orchestrator operates',
  guardrails: 'Safety boundaries and risk thresholds',
  scheduling: 'Scan frequencies and timing configuration',
  marketplace: 'Agent marketplace and listing settings',
};

export default function OrchestratorSettingsPage() {
  const dispatch = useAppDispatch();
  const { settings, settingsLoading, error } = useAppSelector((state) => state.orchestrator);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchSettings({}));
  }, [dispatch]);

  const handleUpdate = (key: string, value: unknown) => {
    dispatch(updateSetting({ key, value }));
  };

  const isAdmin = user?.role === 'it_admin';

  const grouped = (
    ['autonomy', 'guardrails', 'scheduling', 'marketplace'] as SettingCategory[]
  ).map((category) => ({
    category,
    label: categoryLabels[category],
    description: categoryDescriptions[category],
    settings: settings.filter((s) => s.category === category),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Orchestrator Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure autonomy levels, guardrails, scan frequencies, and marketplace rules
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Settings are read-only. Only IT administrators can modify orchestrator settings.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {settingsLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <GlassCard key={group.category}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                  {group.label}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{group.description}</p>
              </div>
              {group.settings.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  No settings in this category
                </p>
              ) : (
                <div className="space-y-2">
                  {group.settings.map((setting) => (
                    <SettingsControl
                      key={setting.settingKey}
                      setting={setting}
                      onUpdate={isAdmin ? handleUpdate : () => {}}
                    />
                  ))}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
