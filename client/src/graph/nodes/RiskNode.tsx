import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseGraphNode } from './BaseGraphNode';
import type { RiskNodeData } from '../types/graphTypes';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/15',
  high: 'text-orange-400 bg-orange-500/15',
  medium: 'text-amber-400 bg-amber-500/15',
  low: 'text-emerald-400 bg-emerald-500/15',
};

function RiskNodeComponent({ data }: NodeProps) {
  const d = data as RiskNodeData;

  return (
    <BaseGraphNode nodeType="risk" data={d}>
      <div className="text-sm font-medium text-[var(--text-primary)] leading-tight line-clamp-2">
        {d.label}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span
          className={`px-1.5 py-0.5 text-[9px] font-medium rounded capitalize ${SEVERITY_COLORS[d.severity] ?? SEVERITY_COLORS.medium}`}
        >
          {d.severity}
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">{d.category}</span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-[9px] text-[var(--text-muted)]">
        <span>Risk: {Math.round(d.riskScore)}</span>
        <span>L: {d.likelihood.toFixed(1)}</span>
        <span>I: {d.impact.toFixed(1)}</span>
      </div>
    </BaseGraphNode>
  );
}

export const RiskNode = memo(RiskNodeComponent);
