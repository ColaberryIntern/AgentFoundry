import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  hideContextMenu,
  isolateSubgraph,
  pushState,
  setViewMode,
  descendAltitude,
  ascendAltitude,
} from '../state/graphSlice';
import type { GraphNodeType } from '../types/graphTypes';
import { isClusterNodeId, extractClusterEntityId } from '../engine/nodeTransformers';
import { AltitudeController } from '../altitude/AltitudeController';
import { ALTITUDE_LABELS } from '../altitude/altitudeTypes';
import type { AltitudeLevel } from '../altitude/altitudeTypes';

interface MenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
}

function getMenuItems(
  nodeId: string,
  nodeType: GraphNodeType,
  dispatch: ReturnType<typeof useAppDispatch>,
  currentAltitude: AltitudeLevel,
): MenuItem[] {
  const pushAndDo = (label: string, fn: () => void) => ({
    label,
    action: () => {
      dispatch(pushState({ viewport: { x: 0, y: 0, zoom: 1 }, label }));
      fn();
      dispatch(hideContextMenu());
    },
  });

  const items: MenuItem[] = [];

  // Altitude-aware cluster actions
  if (isClusterNodeId(nodeId)) {
    const entityId = extractClusterEntityId(nodeId);
    items.push(
      pushAndDo(`Descend into ${nodeType.replace('Cluster', '')}`, () =>
        dispatch(descendAltitude({ targetId: entityId, targetType: nodeType })),
      ),
    );
  }

  // Ascend option when not at GLOBAL
  if (AltitudeController.canAscend(currentAltitude)) {
    const parentLevel = AltitudeController.getPreviousAltitude(currentAltitude);
    if (parentLevel) {
      items.push(
        pushAndDo(`Ascend to ${ALTITUDE_LABELS[parentLevel]}`, () => dispatch(ascendAltitude())),
      );
    }
  }

  // Add separator if we added altitude items before detail items
  if (items.length > 0) {
    items[items.length - 1].separator = true;
  }

  // Original detail-node actions
  switch (nodeType) {
    case 'industry':
      items.push(
        pushAndDo('Show Use Cases', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Marketplace View', () => dispatch(setViewMode('marketplace'))),
        pushAndDo('Governance View', () => dispatch(setViewMode('governance'))),
        pushAndDo('Simulate', () => dispatch(setViewMode('simulation'))),
      );
      break;
    case 'useCase':
      items.push(
        pushAndDo('Show Stack Templates', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Performance View', () => dispatch(setViewMode('performance'))),
        pushAndDo('Architecture View', () => dispatch(setViewMode('architecture'))),
      );
      break;
    case 'skeleton':
      items.push(
        pushAndDo('Show Variants', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Architecture View', () => dispatch(setViewMode('architecture'))),
        pushAndDo('Simulate', () => dispatch(setViewMode('simulation'))),
      );
      break;
    case 'variant':
      items.push(
        pushAndDo('Show Deployments', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Certifications', () => dispatch(setViewMode('governance'))),
        pushAndDo('Performance View', () => dispatch(setViewMode('performance'))),
      );
      break;
    case 'certification':
      items.push(
        pushAndDo('Show Impacted Nodes', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Governance View', () => dispatch(setViewMode('governance'))),
        pushAndDo('Impact Simulation', () => dispatch(setViewMode('simulation'))),
      );
      break;
    case 'deployment':
      items.push(
        pushAndDo('Performance View', () => dispatch(setViewMode('performance'))),
        pushAndDo('Architecture View', () => dispatch(setViewMode('architecture'))),
      );
      break;
    case 'risk':
      items.push(
        pushAndDo('Governance View', () => dispatch(setViewMode('governance'))),
        pushAndDo('Simulate Mitigation', () => dispatch(setViewMode('simulation'))),
      );
      break;
    case 'marketplace':
      items.push(
        pushAndDo('Marketplace View', () => dispatch(setViewMode('marketplace'))),
        pushAndDo('Certifications', () => dispatch(setViewMode('governance'))),
      );
      break;
    case 'industryCluster':
    case 'useCaseCluster':
    case 'stackCluster':
      // Cluster-specific modes
      items.push(
        pushAndDo('Governance View', () => dispatch(setViewMode('governance'))),
        pushAndDo('Simulate', () => dispatch(setViewMode('simulation'))),
      );
      break;
    default:
      break;
  }

  return items;
}

export function TraverseMenu() {
  const dispatch = useAppDispatch();
  const { contextMenu, currentAltitude } = useAppSelector((s) => s.graph);

  if (!contextMenu.visible) return null;

  const items = getMenuItems(contextMenu.nodeId, contextMenu.nodeType, dispatch, currentAltitude);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={() => dispatch(hideContextMenu())} />

      {/* Menu */}
      <div
        className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-white/10 bg-[var(--surface-primary)] backdrop-blur-xl shadow-xl"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <div className="px-3 py-1.5 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider border-b border-white/5">
          {contextMenu.nodeType.replace(/([A-Z])/g, ' $1').trim()}
        </div>
        {items.map((item) => (
          <div key={item.label}>
            <button
              onClick={item.action}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-white/5 transition-colors"
            >
              {item.label}
            </button>
            {item.separator && <div className="my-1 border-t border-white/5" />}
          </div>
        ))}
      </div>
    </>
  );
}
