import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseGraphNode } from './BaseGraphNode';
import type { CertificationNodeData } from '../types/graphTypes';

function CertificationNodeComponent({ data }: NodeProps) {
  const d = data as CertificationNodeData;
  const isExpired = new Date(d.expiryDate) < new Date();
  const isExpiring = !isExpired && new Date(d.expiryDate).getTime() - Date.now() < 30 * 86400000;

  return (
    <BaseGraphNode nodeType="certification" data={d}>
      <div className="text-sm font-medium text-[var(--text-primary)] leading-tight line-clamp-2">
        {d.complianceFramework}
      </div>
      <div className="text-[10px] text-[var(--text-muted)] capitalize mt-0.5">
        {d.certificationType?.replace(/_/g, ' ')}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span
          className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${d.auditPassed ? 'text-emerald-400 bg-emerald-500/15' : 'text-red-400 bg-red-500/15'}`}
        >
          {d.auditPassed ? 'Passed' : 'Failed'}
        </span>
        {isExpired && <span className="text-[9px] text-red-400">Expired</span>}
        {isExpiring && <span className="text-[9px] text-amber-400">Expiring</span>}
      </div>
      <div className="mt-1 flex items-center gap-1">
        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${d.bestPracticeScore >= 80 ? 'bg-emerald-500' : d.bestPracticeScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${d.bestPracticeScore}%` }}
          />
        </div>
        <span className="text-[9px] text-[var(--text-muted)]">
          {Math.round(d.bestPracticeScore)}%
        </span>
      </div>
    </BaseGraphNode>
  );
}

export const CertificationNode = memo(CertificationNodeComponent);
