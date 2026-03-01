import { memo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import type { GraphEdgeData } from '../types/graphTypes';

function SemanticEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const edgeData = data as GraphEdgeData | undefined;
  const label = edgeData?.label;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: 'rgba(148, 163, 184, 0.2)',
          strokeWidth: 1,
          strokeDasharray: '6 3',
          ...style,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none text-[8px] text-[var(--text-muted)] bg-[var(--surface-primary)] px-1 rounded opacity-0 hover:opacity-100 transition-opacity"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            data-edge-id={id}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const SemanticEdge = memo(SemanticEdgeComponent);
