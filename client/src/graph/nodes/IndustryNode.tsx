import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseGraphNode } from './BaseGraphNode';
import type { IndustryNodeData } from '../types/graphTypes';

function IndustryNodeComponent({ data }: NodeProps) {
  const d = data as IndustryNodeData;
  return (
    <BaseGraphNode nodeType="industry" data={d}>
      <div className="text-xs font-bold text-blue-400 mb-0.5">{d.code}</div>
      <div className="text-sm font-medium text-[var(--text-primary)] leading-tight line-clamp-2">
        {d.title}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-muted)]">
        <span>{d.useCaseCount} UC</span>
        <span className="opacity-40">|</span>
        <span>{d.variantCount} agents</span>
        {d.certifiedCount > 0 && (
          <>
            <span className="opacity-40">|</span>
            <span className="text-emerald-400">{d.certifiedCount} cert</span>
          </>
        )}
      </div>
    </BaseGraphNode>
  );
}

export const IndustryNode = memo(IndustryNodeComponent);
