import type { SkeletonNodeData } from '../types/graphTypes';

export function StackPanel({ data }: { data: SkeletonNodeData }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-bold text-[var(--text-primary)]">{data.name}</div>
        <div className="text-sm text-purple-400 capitalize">
          {data.specializationType?.replace(/_/g, ' ')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="text-[10px] text-[var(--text-muted)]">Variants</div>
          <div className="text-lg font-bold text-[var(--text-primary)]">{data.variantCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="text-[10px] text-[var(--text-muted)]">Risk Level</div>
          <div
            className={`text-lg font-bold capitalize ${data.riskLevel === 'critical' || data.riskLevel === 'high' ? 'text-red-400' : data.riskLevel === 'medium' ? 'text-amber-400' : 'text-emerald-400'}`}
          >
            {data.riskLevel}
          </div>
        </div>
      </div>

      {data.capabilities.length > 0 && (
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Core Capabilities
          </div>
          <div className="space-y-1">
            {data.capabilities.map((cap) => (
              <div key={cap} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <span className="w-1 h-1 rounded-full bg-purple-400" />
                {cap}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
