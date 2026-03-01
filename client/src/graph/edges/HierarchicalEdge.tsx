import { memo } from 'react';
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';

function HierarchicalEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: 'rgba(148, 163, 184, 0.3)',
        strokeWidth: 1.5,
        ...style,
      }}
    />
  );
}

export const HierarchicalEdge = memo(HierarchicalEdgeComponent);
