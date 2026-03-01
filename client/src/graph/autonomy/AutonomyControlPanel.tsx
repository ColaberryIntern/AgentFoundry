import { useState, useMemo, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateSetting, fetchSettings } from '../../store/orchestratorSlice';
import { AutonomySlider } from './AutonomySlider';
import { AutonomyPreview } from './AutonomyPreview';

interface AutonomyControlPanelProps {
  open: boolean;
  onClose: () => void;
}

interface SettingDraft {
  key: string;
  label: string;
  description: string;
  original: number;
  current: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  category: string;
}

const DEFAULT_SETTINGS: SettingDraft[] = [
  {
    key: 'autonomy_level',
    label: 'Autonomy Level',
    description: 'Overall autonomous operation threshold',
    original: 70,
    current: 70,
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    color: '#3b82f6',
    category: 'autonomy',
  },
  {
    key: 'risk_threshold',
    label: 'Risk Threshold',
    description: 'Maximum acceptable risk score before escalation',
    original: 65,
    current: 65,
    min: 0,
    max: 100,
    step: 5,
    unit: '',
    color: '#ef4444',
    category: 'guardrails',
  },
  {
    key: 'drift_tolerance',
    label: 'Drift Tolerance',
    description: 'Allowed certification score variance',
    original: 15,
    current: 15,
    min: 0,
    max: 50,
    step: 1,
    unit: '%',
    color: '#f59e0b',
    category: 'guardrails',
  },
  {
    key: 'token_budget',
    label: 'Token Budget',
    description: 'Max tokens per orchestrator cycle (thousands)',
    original: 50,
    current: 50,
    min: 10,
    max: 200,
    step: 10,
    unit: 'K',
    color: '#a855f7',
    category: 'scheduling',
  },
  {
    key: 'scan_interval',
    label: 'Scan Interval',
    description: 'Minutes between autonomous scans',
    original: 30,
    current: 30,
    min: 5,
    max: 120,
    step: 5,
    unit: 'min',
    color: '#06b6d4',
    category: 'scheduling',
  },
  {
    key: 'auto_certify',
    label: 'Auto-Certify Threshold',
    description: 'Min score for auto-certification approval',
    original: 85,
    current: 85,
    min: 50,
    max: 100,
    step: 5,
    unit: '%',
    color: '#10b981',
    category: 'marketplace',
  },
];

export function AutonomyControlPanel({ open, onClose }: AutonomyControlPanelProps) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.orchestrator.settings);

  // Merge API settings with defaults
  const [drafts, setDrafts] = useState<SettingDraft[]>(() => {
    return DEFAULT_SETTINGS.map((d) => {
      const apiSetting = settings.find((s) => s.settingKey === d.key);
      const val = apiSetting ? Number(apiSetting.settingValue) : d.original;
      return { ...d, original: val, current: val };
    });
  });

  const changes = useMemo(
    () =>
      drafts
        .filter((d) => d.current !== d.original)
        .map((d) => ({
          setting: d.label,
          from: `${d.original}${d.unit}`,
          to: `${d.current}${d.unit}`,
        })),
    [drafts],
  );

  const projectedImpact = useMemo(() => {
    const autonomyDraft = drafts.find((d) => d.key === 'autonomy_level');
    const riskDraft = drafts.find((d) => d.key === 'risk_threshold');
    const tokenDraft = drafts.find((d) => d.key === 'token_budget');

    const automationDelta = autonomyDraft ? autonomyDraft.current - autonomyDraft.original : 0;
    const riskDelta = riskDraft ? riskDraft.original - riskDraft.current : 0; // Lower threshold = more risk
    const tokenDelta = tokenDraft
      ? Math.round(((tokenDraft.current - tokenDraft.original) / tokenDraft.original) * 100)
      : 0;
    const governanceDelta = -Math.round(automationDelta * 0.5);

    return { automationDelta, riskDelta, tokenDelta, governanceDelta };
  }, [drafts]);

  const updateDraft = useCallback((key: string, value: number) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, current: value } : d)));
  }, []);

  const handleApply = useCallback(async () => {
    for (const d of drafts) {
      if (d.current !== d.original) {
        await dispatch(updateSetting({ key: d.key, value: d.current }));
      }
    }
    setDrafts((prev) => prev.map((d) => ({ ...d, original: d.current })));
    dispatch(fetchSettings({}));
  }, [drafts, dispatch]);

  const handleCancel = useCallback(() => {
    setDrafts((prev) => prev.map((d) => ({ ...d, current: d.original })));
  }, []);

  if (!open) return null;

  const categories = ['autonomy', 'guardrails', 'scheduling', 'marketplace'];
  const categoryLabels: Record<string, string> = {
    autonomy: 'Autonomy',
    guardrails: 'Guardrails',
    scheduling: 'Scheduling',
    marketplace: 'Marketplace',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[480px] max-h-[85vh] bg-[var(--surface-primary)] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">Autonomy Controls</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Configure orchestrator behaviour and guardrails
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {categories.map((cat) => {
            const catDrafts = drafts.filter((d) => d.category === cat);
            if (catDrafts.length === 0) return null;
            return (
              <div key={cat}>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-3 font-medium">
                  {categoryLabels[cat]}
                </div>
                <div className="space-y-4">
                  {catDrafts.map((d) => (
                    <AutonomySlider
                      key={d.key}
                      label={d.label}
                      description={d.description}
                      value={d.current}
                      min={d.min}
                      max={d.max}
                      step={d.step}
                      unit={d.unit}
                      color={d.color}
                      onChange={(v) => updateDraft(d.key, v)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Preview */}
          <AutonomyPreview
            changes={changes}
            projectedImpact={projectedImpact}
            onApply={handleApply}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
