import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseGraphNode } from './BaseGraphNode';
import type { SkeletonNodeData } from '../types/graphTypes';

function SkeletonNodeComponent({ data }: NodeProps) {
  const d = data as SkeletonNodeData;
  return (
    <BaseGraphNode nodeType="skeleton" data={d}>
      <div className="text-sm font-medium text-[var(--text-primary)] leading-tight line-clamp-2">
        {d.name}
      </div>
      <div className="text-[10px] text-purple-400 capitalize mt-1">
        {d.specializationType?.replace(/_/g, ' ')}
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--text-muted)]">
        <span>{d.variantCount} variants</span>
        <span className="opacity-40">|</span>
        <span className="capitalize">{d.riskLevel} risk</span>
      </div>
    </BaseGraphNode>
  );
}

export const SkeletonNode = memo(SkeletonNodeComponent);
