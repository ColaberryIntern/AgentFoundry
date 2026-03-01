import type { AppDispatch } from '../../store/store';
import type { GraphNodeType } from '../types/graphTypes';
import {
  selectNode,
  multiSelectNode,
  deselectAll,
  expandNode,
  isolateSubgraph,
  exitIsolation,
  pushState,
  popState,
  showContextMenu,
  hideContextMenu,
  setViewMode,
} from '../state/graphSlice';

export class DrillController {
  constructor(
    private dispatch: AppDispatch,
    private getViewport: () => { x: number; y: number; zoom: number },
  ) {}

  // -- Single Click: Select + Open Context Panel --
  handleNodeClick(nodeId: string, nodeType: GraphNodeType, event: React.MouseEvent) {
    this.dispatch(hideContextMenu());

    if (event.altKey) {
      // Alt+Click → Isolate subgraph
      this.pushCurrentState(`Isolated ${nodeType} ${nodeId.split('-').pop()}`);
      this.dispatch(isolateSubgraph(nodeId));
      this.dispatch(selectNode({ nodeId, nodeType }));
    } else if (event.shiftKey) {
      // Shift+Click → Multi-select
      this.dispatch(multiSelectNode(nodeId));
    } else {
      // Normal click → Select + open panel
      this.dispatch(selectNode({ nodeId, nodeType }));
    }
  }

  // -- Double Click: Expand Children --
  handleNodeDoubleClick(nodeId: string) {
    this.pushCurrentState(`Expanded ${nodeId.split('-')[0]} ${nodeId.split('-').pop()}`);
    this.dispatch(expandNode(nodeId));
  }

  // -- Right Click: Traverse Menu --
  handleNodeContextMenu(nodeId: string, nodeType: GraphNodeType, event: React.MouseEvent) {
    event.preventDefault();
    this.dispatch(
      showContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId,
        nodeType,
      }),
    );
  }

  // -- Pane Click: Deselect --
  handlePaneClick() {
    this.dispatch(deselectAll());
    this.dispatch(hideContextMenu());
  }

  // -- Back Navigation --
  handleBack() {
    this.dispatch(popState());
  }

  // -- Escape --
  handleEscape() {
    // If context menu is visible, close it first
    this.dispatch(hideContextMenu());
    // If isolated, exit isolation
    this.dispatch(exitIsolation());
    // Pop state
    this.dispatch(popState());
  }

  // -- Mode Switch --
  handleModeSwitch(
    mode: 'strategy' | 'governance' | 'architecture' | 'performance' | 'marketplace' | 'simulation',
  ) {
    this.pushCurrentState(`Mode: ${mode}`);
    this.dispatch(setViewMode(mode));
  }

  // -- Helpers --
  private pushCurrentState(label: string) {
    this.dispatch(
      pushState({
        viewport: this.getViewport(),
        label,
      }),
    );
  }
}
