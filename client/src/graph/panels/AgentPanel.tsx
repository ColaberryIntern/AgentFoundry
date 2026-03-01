import type { VariantNodeData } from '../types/graphTypes';

export function AgentPanel({ data }: { data: VariantNodeData }) {
  const certColors: Record<string, string> = {
    certified: 'text-emerald-400 bg-emerald-500/15',
    pending: 'text-amber-400 bg-amber-500/15',
    uncertified: 'text-gray-400 bg-gray-500/15',
    expired: 'text-red-400 bg-red-500/15',
    revoked: 'text-red-400 bg-red-500/15',
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-bold text-[var(--text-primary)]">{data.name}</div>
        {data.skeletonName && (
          <div className="text-sm text-[var(--text-muted)]">Type: {data.skeletonName}</div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${certColors[data.certificationStatus] ?? certColors.uncertified}`}
        >
          {data.certificationStatus}
        </span>
        {data.industryCode && (
          <span className="px-2 py-0.5 text-xs rounded bg-blue-500/15 text-blue-400">
            {data.industryCode}
          </span>
        )}
      </div>

      {data.certificationScore != null && (
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Certification Score
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${data.certificationScore}%` }}
              />
            </div>
            <span className="text-sm font-medium text-emerald-400">
              {Math.round(data.certificationScore)}%
            </span>
          </div>
        </div>
      )}

      <div className="text-[10px] text-[var(--text-muted)] font-mono pt-2 border-t border-white/5">
        Skeleton: {data.skeletonId}
      </div>
    </div>
  );
}
