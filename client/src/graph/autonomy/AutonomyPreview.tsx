interface AutonomyPreviewProps {
  changes: Array<{
    setting: string;
    from: number | string;
    to: number | string;
  }>;
  projectedImpact: {
    automationDelta: number;
    riskDelta: number;
    tokenDelta: number;
    governanceDelta: number;
  };
  onApply: () => void;
  onCancel: () => void;
}

export function AutonomyPreview({
  changes,
  projectedImpact,
  onApply,
  onCancel,
}: AutonomyPreviewProps) {
  if (changes.length === 0) return null;

  const impacts = [
    { label: 'Automation', value: projectedImpact.automationDelta, suffix: '%', positive: true },
    { label: 'Risk', value: projectedImpact.riskDelta, suffix: 'pts', positive: false },
    { label: 'Token Usage', value: projectedImpact.tokenDelta, suffix: '%', positive: false },
    { label: 'Gov Load', value: projectedImpact.governanceDelta, suffix: '%', positive: false },
  ];

  return (
    <div className="border-t border-white/5 mt-4 pt-4 space-y-3">
      <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
        Projected Impact
      </div>

      {/* Changes summary */}
      <div className="space-y-1.5">
        {changes.map((c, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--text-muted)]">{c.setting}</span>
            <div>
              <span className="text-red-400/70 line-through mr-1">{c.from}</span>
              <span className="text-emerald-400">{c.to}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Impact grid */}
      <div className="grid grid-cols-2 gap-2">
        {impacts.map((impact) => {
          const isGood = impact.positive ? impact.value > 0 : impact.value <= 0;
          const color = isGood ? 'text-emerald-400' : 'text-amber-400';
          const prefix = impact.value > 0 ? '+' : '';
          return (
            <div
              key={impact.label}
              className="p-2 rounded-lg bg-white/[0.03] border border-white/5"
            >
              <div className="text-[10px] text-[var(--text-muted)]">{impact.label}</div>
              <div className={`text-sm font-bold ${color}`}>
                {prefix}
                {impact.value}
                {impact.suffix}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApply}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 transition-colors"
        >
          Apply Changes
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-[var(--text-muted)] hover:bg-white/10 border border-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
