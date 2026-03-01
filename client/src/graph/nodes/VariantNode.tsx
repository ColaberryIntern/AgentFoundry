import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseGraphNode } from './BaseGraphNode';
import type { VariantNodeData } from '../types/graphTypes';

const CERT_COLORS: Record<string, string> = {
  certified: 'text-emerald-400 bg-emerald-500/15',
  pending: 'text-amber-400 bg-amber-500/15',
  uncertified: 'text-gray-400 bg-gray-500/15',
  expired: 'text-red-400 bg-red-500/15',
  revoked: 'text-red-400 bg-red-500/15',
};

function VariantNodeComponent({ data }: NodeProps) {
  const d = data as VariantNodeData;
  const certColor = CERT_COLORS[d.certificationStatus] ?? CERT_COLORS.uncertified;

  return (
    <BaseGraphNode nodeType="variant" data={d}>
      <div className="text-sm font-medium text-[var(--text-primary)] leading-tight line-clamp-2">
        {d.name}
      </div>
      {d.skeletonName && (
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{d.skeletonName}</div>
      )}
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${certColor}`}>
          {d.certificationStatus}
        </span>
        {d.industryCode && <span className="text-[9px] text-blue-400">{d.industryCode}</span>}
      </div>
      {d.certificationScore != null && (
        <div className="mt-1 flex items-center gap-1">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${d.certificationScore}%` }}
            />
          </div>
          <span className="text-[9px] text-emerald-400">{Math.round(d.certificationScore)}%</span>
        </div>
      )}
    </BaseGraphNode>
  );
}

export const VariantNode = memo(VariantNodeComponent);
