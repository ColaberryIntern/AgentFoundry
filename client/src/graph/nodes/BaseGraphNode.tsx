import { Handle, Position } from '@xyflow/react';
import type { GraphNodeType, BaseNodeData } from '../types/graphTypes';
import { NODE_COLORS, NODE_TYPE_ABBREVS } from '../types/graphTypes';

interface BaseGraphNodeProps {
  nodeType: GraphNodeType;
  data: BaseNodeData;
  children: React.ReactNode;
}

export function BaseGraphNode({ nodeType, data, children }: BaseGraphNodeProps) {
  const colors = NODE_COLORS[nodeType];
  const abbrev = NODE_TYPE_ABBREVS[nodeType];

  return (
    <div
      className={`
        relative rounded-xl min-w-[180px] max-w-[220px]
        backdrop-blur-md border transition-all duration-200
        ${colors.bg} ${colors.border}
        ${data.selected ? `ring-2 ring-blue-500/50 ${colors.glow} shadow-lg` : 'shadow-sm'}
      `}
      style={{ opacity: data.opacity }}
    >
      {/* Type badge */}
      <div
        className={`absolute -top-2 -left-1 px-1.5 py-0.5 text-[9px] font-bold rounded ${colors.bg} ${colors.text} border ${colors.border}`}
      >
        {abbrev}
      </div>

      {/* Content */}
      <div className="p-3 pt-4">{children}</div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-blue-500/60 !border-blue-400/30"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-blue-500/60 !border-blue-400/30"
      />
    </div>
  );
}
