import type { MarketplaceNodeData } from '../types/graphTypes';

export function MarketplacePanel({ data }: { data: MarketplaceNodeData }) {
  const statusColors: Record<string, string> = {
    published: 'bg-emerald-500/15 text-emerald-400',
    approved: 'bg-emerald-500/15 text-emerald-400',
    submitted: 'bg-blue-500/15 text-blue-400',
    under_review: 'bg-amber-500/15 text-amber-400',
    testing: 'bg-cyan-500/15 text-cyan-400',
    draft: 'bg-gray-500/15 text-gray-400',
    rejected: 'bg-red-500/15 text-red-400',
    delisted: 'bg-red-500/15 text-red-400',
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-bold text-[var(--text-primary)]">{data.submissionName}</div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${statusColors[data.marketplaceStatus] ?? statusColors.draft}`}
        >
          {data.marketplaceStatus?.replace(/_/g, ' ')}
        </span>
        {data.certificationRequired && (
          <span className="px-2 py-0.5 text-xs rounded bg-amber-500/15 text-amber-400">
            Cert Required
          </span>
        )}
      </div>

      <div className="text-[10px] text-[var(--text-muted)] font-mono pt-2 border-t border-white/5">
        <div>Submitter: {data.submitterId}</div>
        {data.variantId && <div>Variant: {data.variantId}</div>}
      </div>
    </div>
  );
}
