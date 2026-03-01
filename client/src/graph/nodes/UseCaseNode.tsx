import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseGraphNode } from './BaseGraphNode';
import type { UseCaseNodeData } from '../types/graphTypes';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500',
  draft: 'bg-gray-400',
  deprecated: 'bg-red-500',
};

function UseCaseNodeComponent({ data }: NodeProps) {
  const d = data as UseCaseNodeData;
  return (
    <BaseGraphNode nodeType="useCase" data={d}>
      <div className="text-sm font-medium text-[var(--text-primary)] leading-tight line-clamp-2">
        {d.label}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {d.status && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[d.status] ?? 'bg-gray-400'}`}
          />
        )}
        <span className="text-[10px] text-[var(--text-muted)] capitalize">
          {d.monetizationType?.replace(/_/g, ' ')}
        </span>
      </div>
      {d.urgencyScore != null && (
        <div className="mt-1.5 flex items-center gap-1">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${d.urgencyScore * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-amber-400">{Math.round(d.urgencyScore * 100)}%</span>
        </div>
      )}
    </BaseGraphNode>
  );
}

export const UseCaseNode = memo(UseCaseNodeComponent);
