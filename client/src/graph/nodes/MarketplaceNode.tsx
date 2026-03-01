import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseGraphNode } from './BaseGraphNode';
import type { MarketplaceNodeData } from '../types/graphTypes';

const STATUS_COLORS: Record<string, string> = {
  published: 'text-emerald-400 bg-emerald-500/15',
  approved: 'text-emerald-400 bg-emerald-500/15',
  submitted: 'text-blue-400 bg-blue-500/15',
  under_review: 'text-amber-400 bg-amber-500/15',
  testing: 'text-cyan-400 bg-cyan-500/15',
  draft: 'text-gray-400 bg-gray-500/15',
  rejected: 'text-red-400 bg-red-500/15',
  delisted: 'text-red-400 bg-red-500/15',
};

function MarketplaceNodeComponent({ data }: NodeProps) {
  const d = data as MarketplaceNodeData;

  return (
    <BaseGraphNode nodeType="marketplace" data={d}>
      <div className="text-sm font-medium text-[var(--text-primary)] leading-tight line-clamp-2">
        {d.submissionName}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span
          className={`px-1.5 py-0.5 text-[9px] font-medium rounded capitalize ${STATUS_COLORS[d.marketplaceStatus] ?? STATUS_COLORS.draft}`}
        >
          {d.marketplaceStatus?.replace(/_/g, ' ')}
        </span>
        {d.certificationRequired && <span className="text-[9px] text-amber-400">Cert req</span>}
      </div>
    </BaseGraphNode>
  );
}

export const MarketplaceNode = memo(MarketplaceNodeComponent);
