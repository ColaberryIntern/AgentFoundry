import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  pushState,
  descendAltitude,
  ascendAltitude,
  setAltitude,
  setAltitudeAnimating,
  selectNode,
} from '../state/graphSlice';
import { AltitudeController } from './AltitudeController';
import {
  isClusterNodeId,
  extractClusterEntityId,
  getNodeTypeFromId,
} from '../engine/nodeTransformers';
import type { AltitudeLevel, AltitudeContext } from './altitudeTypes';

/**
 * Hook that wraps AltitudeController with Redux dispatch and ReactFlow viewport transitions.
 * Replaces useDrillController for altitude-aware navigation.
 */
export function useAltitudeController() {
  const dispatch = useAppDispatch();
  const reactFlow = useReactFlow();
  const { currentAltitude, altitudeContext } = useAppSelector((s) => s.graph);

  const getViewport = useCallback(() => {
    try {
      return reactFlow.getViewport();
    } catch {
      return { x: 0, y: 0, zoom: 1 };
    }
  }, [reactFlow]);

  /**
   * Handle node click — descend into cluster or select detail node.
   */
  const handleNodeClick = useCallback(
    (nodeId: string, event: React.MouseEvent) => {
      const nodeType = getNodeTypeFromId(nodeId);
      if (!nodeType) return;

      if (isClusterNodeId(nodeId)) {
        // Cluster click → descend
        const entityId = extractClusterEntityId(nodeId);
        dispatch(pushState({ viewport: getViewport(), label: `Descend into ${nodeId}` }));
        dispatch(descendAltitude({ targetId: entityId, targetType: nodeType }));

        // Animated viewport transition
        setTimeout(() => {
          reactFlow.fitView({ duration: 400, padding: 0.2 });
          setTimeout(() => dispatch(setAltitudeAnimating(false)), 400);
        }, 50);
      } else if (event.altKey) {
        // Alt+click on detail node: no-op at altitude level (was isolateSubgraph)
        dispatch(selectNode({ nodeId, nodeType }));
      } else if (event.shiftKey) {
        // Shift+click: multi-select (keep existing behavior)
        dispatch(selectNode({ nodeId, nodeType }));
      } else {
        // Normal click: select and open panel
        dispatch(selectNode({ nodeId, nodeType }));
      }
    },
    [dispatch, getViewport, reactFlow],
  );

  /**
   * Handle double-click — descend if on cluster, or at STACK level variant click descends to AGENT.
   */
  const handleNodeDoubleClick = useCallback(
    (nodeId: string) => {
      const nodeType = getNodeTypeFromId(nodeId);
      if (!nodeType) return;

      if (isClusterNodeId(nodeId)) {
        const entityId = extractClusterEntityId(nodeId);
        dispatch(pushState({ viewport: getViewport(), label: `Descend into ${nodeId}` }));
        dispatch(descendAltitude({ targetId: entityId, targetType: nodeType }));
      } else if (currentAltitude === 'STACK' && nodeType === 'variant') {
        // At STACK, double-click variant → descend to AGENT
        const entityId = nodeId.replace('variant-', '');
        dispatch(pushState({ viewport: getViewport(), label: `Agent detail ${entityId}` }));
        dispatch(descendAltitude({ targetId: entityId, targetType: 'variant' }));
      }

      setTimeout(() => {
        reactFlow.fitView({ duration: 400, padding: 0.2 });
        setTimeout(() => dispatch(setAltitudeAnimating(false)), 400);
      }, 50);
    },
    [dispatch, getViewport, reactFlow, currentAltitude],
  );

  /**
   * Ascend one altitude level.
   */
  const handleAscend = useCallback(() => {
    if (!AltitudeController.canAscend(currentAltitude)) return;
    dispatch(pushState({ viewport: getViewport(), label: `Ascend from ${currentAltitude}` }));
    dispatch(ascendAltitude());
    setTimeout(() => {
      reactFlow.fitView({ duration: 400, padding: 0.2 });
      setTimeout(() => dispatch(setAltitudeAnimating(false)), 400);
    }, 50);
  }, [dispatch, getViewport, reactFlow, currentAltitude]);

  /**
   * Jump to a specific altitude level (from breadcrumb).
   */
  const handleJumpTo = useCallback(
    (level: AltitudeLevel, context: AltitudeContext) => {
      dispatch(pushState({ viewport: getViewport(), label: `Jump to ${level}` }));
      dispatch(setAltitude({ level, context }));
      setTimeout(() => {
        reactFlow.fitView({ duration: 400, padding: 0.2 });
        setTimeout(() => dispatch(setAltitudeAnimating(false)), 400);
      }, 50);
    },
    [dispatch, getViewport, reactFlow],
  );

  return {
    currentAltitude,
    altitudeContext,
    canAscend: AltitudeController.canAscend(currentAltitude),
    canDescend: AltitudeController.canDescend(currentAltitude),
    handleNodeClick,
    handleNodeDoubleClick,
    handleAscend,
    handleJumpTo,
  };
}
