import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { hideContextMenu, isolateSubgraph, pushState, setViewMode } from '../state/graphSlice';
import type { GraphNodeType } from '../types/graphTypes';

interface MenuItem {
  label: string;
  action: () => void;
}

function getMenuItems(
  nodeId: string,
  nodeType: GraphNodeType,
  dispatch: ReturnType<typeof useAppDispatch>,
): MenuItem[] {
  const pushAndDo = (label: string, fn: () => void) => ({
    label,
    action: () => {
      dispatch(pushState({ viewport: { x: 0, y: 0, zoom: 1 }, label }));
      fn();
      dispatch(hideContextMenu());
    },
  });

  switch (nodeType) {
    case 'industry':
      return [
        pushAndDo('Show Use Cases', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Marketplace View', () => dispatch(setViewMode('marketplace'))),
        pushAndDo('Governance View', () => dispatch(setViewMode('governance'))),
        pushAndDo('Simulate', () => dispatch(setViewMode('simulation'))),
      ];
    case 'useCase':
      return [
        pushAndDo('Show Stack Templates', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Performance View', () => dispatch(setViewMode('performance'))),
        pushAndDo('Architecture View', () => dispatch(setViewMode('architecture'))),
      ];
    case 'skeleton':
      return [
        pushAndDo('Show Variants', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Architecture View', () => dispatch(setViewMode('architecture'))),
        pushAndDo('Simulate', () => dispatch(setViewMode('simulation'))),
      ];
    case 'variant':
      return [
        pushAndDo('Show Deployments', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Certifications', () => dispatch(setViewMode('governance'))),
        pushAndDo('Performance View', () => dispatch(setViewMode('performance'))),
      ];
    case 'certification':
      return [
        pushAndDo('Show Impacted Nodes', () => dispatch(isolateSubgraph(nodeId))),
        pushAndDo('Governance View', () => dispatch(setViewMode('governance'))),
        pushAndDo('Impact Simulation', () => dispatch(setViewMode('simulation'))),
      ];
    case 'deployment':
      return [
        pushAndDo('Performance View', () => dispatch(setViewMode('performance'))),
        pushAndDo('Architecture View', () => dispatch(setViewMode('architecture'))),
      ];
    case 'risk':
      return [
        pushAndDo('Governance View', () => dispatch(setViewMode('governance'))),
        pushAndDo('Simulate Mitigation', () => dispatch(setViewMode('simulation'))),
      ];
    case 'marketplace':
      return [
        pushAndDo('Marketplace View', () => dispatch(setViewMode('marketplace'))),
        pushAndDo('Certifications', () => dispatch(setViewMode('governance'))),
      ];
    default:
      return [];
  }
}

export function TraverseMenu() {
  const dispatch = useAppDispatch();
  const { contextMenu } = useAppSelector((s) => s.graph);

  if (!contextMenu.visible) return null;

  const items = getMenuItems(contextMenu.nodeId, contextMenu.nodeType, dispatch);

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
          <button
            key={item.label}
            onClick={item.action}
            className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-white/5 transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
