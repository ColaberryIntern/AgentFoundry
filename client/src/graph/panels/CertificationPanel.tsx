import type { CertificationNodeData } from '../types/graphTypes';

export function CertificationPanel({ data }: { data: CertificationNodeData }) {
  const isExpired = new Date(data.expiryDate) < new Date();
  const daysLeft = Math.ceil((new Date(data.expiryDate).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-bold text-[var(--text-primary)]">
          {data.complianceFramework}
        </div>
        <div className="text-sm text-[var(--text-muted)] capitalize">
          {data.certificationType?.replace(/_/g, ' ')}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${data.auditPassed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}
        >
          Audit {data.auditPassed ? 'Passed' : 'Failed'}
        </span>
        {isExpired ? (
          <span className="px-2 py-0.5 text-xs rounded bg-red-500/15 text-red-400">Expired</span>
        ) : daysLeft <= 30 ? (
          <span className="px-2 py-0.5 text-xs rounded bg-amber-500/15 text-amber-400">
            {daysLeft}d left
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/15 text-emerald-400">
            {daysLeft}d left
          </span>
        )}
      </div>

      <div>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
          Best Practice Score
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${data.bestPracticeScore >= 80 ? 'bg-emerald-500' : data.bestPracticeScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${data.bestPracticeScore}%` }}
            />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {Math.round(data.bestPracticeScore)}%
          </span>
        </div>
      </div>

      <div>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
          Expiry Date
        </div>
        <div className="text-sm text-[var(--text-primary)]">
          {new Date(data.expiryDate).toLocaleDateString()}
        </div>
      </div>

      <div className="text-[10px] text-[var(--text-muted)] font-mono pt-2 border-t border-white/5">
        Variant: {data.variantId}
      </div>
    </div>
  );
}
