import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { GraphNodeType, ViewMode, ContextMenuState } from '../types/graphTypes';
import type {
  GraphUIState,
  GraphStateEntry,
  GraphFilters,
  SimulationFork,
} from '../types/graphState';
import { INITIAL_GRAPH_STATE, DEFAULT_FILTERS } from '../types/graphState';
import { registryApi } from '../../services/registryApi';
import type { OntologyRelationship } from '../../types/compliance';
import type { AltitudeLevel, AltitudeContext } from '../altitude/altitudeTypes';
import { AltitudeController } from '../altitude/AltitudeController';
import type { WeightingMode } from '../altitude/weightingModes';
import type { MacroSectorId } from '../altitude/macroSectors';

// ---------------------------------------------------------------------------
// Ontology thunk (fetches relationships for graph edges)
// ---------------------------------------------------------------------------

interface OntologyState {
  relationships: OntologyRelationship[];
}

interface GraphSliceState extends GraphUIState {
  ontology: OntologyState;
  weightingMode: WeightingMode;
  heatmapEnabled: boolean;
  hoveredMacroSectorId: MacroSectorId | null;
  focusedSectorId: MacroSectorId | null;
  hiddenSectorIds: MacroSectorId[];
  activeMetricPanel: string | null;
  demoMode: boolean;
  _ontologyBackup: OntologyRelationship[] | null;
}

const initialState: GraphSliceState = {
  ...INITIAL_GRAPH_STATE,
  ontology: { relationships: [] },
  weightingMode: 'coverage',
  heatmapEnabled: false,
  hoveredMacroSectorId: null,
  focusedSectorId: null,
  hiddenSectorIds: [],
  activeMetricPanel: null,
  demoMode: false,
  _ontologyBackup: null,
};

export const fetchOntologyRelationships = createAsyncThunk(
  'graph/fetchOntologyRelationships',
  async (
    params: { subject_type?: string; object_type?: string; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await registryApi.getOntologyRelationships({ limit: 500, ...params });
      return response.data;
    } catch {
      return rejectWithValue('Failed to fetch ontology relationships');
    }
  },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let stateIdCounter = 0;
function generateStateId(): string {
  return `gs-${Date.now()}-${++stateIdCounter}`;
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    // -- Selection --
    selectNode(state, action: PayloadAction<{ nodeId: string; nodeType: GraphNodeType }>) {
      state.selectedNodeIds = [action.payload.nodeId];
      state.contextPanelOpen = true;
      state.contextPanelNodeId = action.payload.nodeId;
      state.contextPanelNodeType = action.payload.nodeType;
    },

    multiSelectNode(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.selectedNodeIds.includes(id)) {
        state.selectedNodeIds = state.selectedNodeIds.filter((n) => n !== id);
      } else {
        state.selectedNodeIds.push(id);
      }
    },

    deselectAll(state) {
      state.selectedNodeIds = [];
      state.contextPanelOpen = false;
      state.contextPanelNodeId = null;
      state.contextPanelNodeType = null;
    },

    hoverNode(state, action: PayloadAction<string | null>) {
      state.hoveredNodeId = action.payload;
    },

    // -- Context Panel --
    closeContextPanel(state) {
      state.contextPanelOpen = false;
      state.contextPanelNodeId = null;
      state.contextPanelNodeType = null;
    },

    // -- Expand / Collapse --
    expandNode(state, action: PayloadAction<string>) {
      if (!state.expandedNodeIds.includes(action.payload)) {
        state.expandedNodeIds.push(action.payload);
      }
    },

    collapseNode(state, action: PayloadAction<string>) {
      state.expandedNodeIds = state.expandedNodeIds.filter((id) => id !== action.payload);
    },

    toggleExpandNode(state, action: PayloadAction<string>) {
      const idx = state.expandedNodeIds.indexOf(action.payload);
      if (idx >= 0) {
        state.expandedNodeIds.splice(idx, 1);
      } else {
        state.expandedNodeIds.push(action.payload);
      }
    },

    // -- Isolation --
    isolateSubgraph(state, action: PayloadAction<string>) {
      state.isolatedSubgraphRoot = action.payload;
    },

    exitIsolation(state) {
      state.isolatedSubgraphRoot = null;
    },

    // -- View Mode --
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
    },

    // -- Filters --
    setFilters(state, action: PayloadAction<Partial<GraphFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilters(state) {
      state.filters = { ...DEFAULT_FILTERS };
    },

    // -- Context Menu --
    showContextMenu(state, action: PayloadAction<ContextMenuState>) {
      state.contextMenu = action.payload;
    },

    hideContextMenu(state) {
      state.contextMenu = { ...state.contextMenu, visible: false };
    },

    // -- State Stack --
    pushState(
      state,
      action: PayloadAction<{ viewport: { x: number; y: number; zoom: number }; label: string }>,
    ) {
      const entry: GraphStateEntry = {
        id: generateStateId(),
        timestamp: Date.now(),
        expandedNodeIds: [...state.expandedNodeIds],
        isolatedSubgraphRoot: state.isolatedSubgraphRoot,
        selectedNodeIds: [...state.selectedNodeIds],
        viewMode: state.viewMode,
        filters: { ...state.filters },
        viewport: action.payload.viewport,
        label: action.payload.label,
        altitude: state.currentAltitude,
        altitudeContext: { ...state.altitudeContext },
      };
      state.graphStateStack.push(entry);
      // Cap at 20 entries
      if (state.graphStateStack.length > 20) {
        state.graphStateStack.shift();
      }
    },

    popState(state) {
      const entry = state.graphStateStack.pop();
      if (entry) {
        state.expandedNodeIds = entry.expandedNodeIds;
        state.isolatedSubgraphRoot = entry.isolatedSubgraphRoot;
        state.selectedNodeIds = entry.selectedNodeIds;
        state.viewMode = entry.viewMode;
        state.filters = entry.filters;
        // Restore altitude
        state.currentAltitude = entry.altitude;
        state.altitudeContext = entry.altitudeContext;
        // viewport is restored by the component reading the stack
      }
    },

    // -- Altitude --
    setAltitude(state, action: PayloadAction<{ level: AltitudeLevel; context: AltitudeContext }>) {
      state.currentAltitude = action.payload.level;
      state.altitudeContext = action.payload.context;
      // Clear selection on altitude change
      state.selectedNodeIds = [];
      state.contextPanelOpen = false;
      state.contextPanelNodeId = null;
      state.contextPanelNodeType = null;
      // Preserve focusedSectorId if jumping to GLOBAL with a sectorId context
      if (action.payload.level === 'GLOBAL' && action.payload.context.sectorId) {
        state.focusedSectorId = action.payload.context.sectorId as MacroSectorId;
      } else if (action.payload.level === 'GLOBAL') {
        state.focusedSectorId = null;
      }
    },

    descendAltitude(
      state,
      action: PayloadAction<{ targetId: string; targetType: string; sectorId?: string }>,
    ) {
      const result = AltitudeController.descend(
        state.currentAltitude,
        state.altitudeContext,
        action.payload.targetId,
        action.payload.targetType,
      );
      if (result) {
        state.currentAltitude = result.level;
        state.altitudeContext = result.context;
        // Capture sectorId when descending from GLOBAL
        if (action.payload.sectorId) {
          state.altitudeContext.sectorId = action.payload.sectorId;
        }
        state.altitudeAnimating = true;
        // Clear selection and focus on descent
        state.selectedNodeIds = [];
        state.contextPanelOpen = false;
        state.contextPanelNodeId = null;
        state.contextPanelNodeType = null;
        state.expandedNodeIds = [];
        state.isolatedSubgraphRoot = null;
        state.focusedSectorId = null;
      }
    },

    ascendAltitude(state) {
      // Capture sectorId before ascend modifies context
      const sectorId = state.altitudeContext.sectorId;
      const wasIndustry = state.currentAltitude === 'INDUSTRY';

      const result = AltitudeController.ascend(state.currentAltitude, state.altitudeContext);
      if (result) {
        state.currentAltitude = result.level;
        state.altitudeContext = result.context;
        state.altitudeAnimating = true;
        // Clear selection on ascent
        state.selectedNodeIds = [];
        state.contextPanelOpen = false;
        state.contextPanelNodeId = null;
        state.contextPanelNodeType = null;
        state.expandedNodeIds = [];
        state.isolatedSubgraphRoot = null;
        // When ascending from INDUSTRY → GLOBAL, preserve sector focus
        // (useAltitudeController also dispatches setFocusedSector separately)
        state.focusedSectorId = wasIndustry && sectorId ? (sectorId as MacroSectorId) : null;
      }
    },

    setAltitudeAnimating(state, action: PayloadAction<boolean>) {
      state.altitudeAnimating = action.payload;
    },

    // -- Weighting & Heatmap --
    setWeightingMode(state, action: PayloadAction<WeightingMode>) {
      state.weightingMode = action.payload;
    },

    toggleHeatmap(state) {
      state.heatmapEnabled = !state.heatmapEnabled;
    },

    // -- Macro-sector hover / filter --
    setHoveredMacroSector(state, action: PayloadAction<MacroSectorId | null>) {
      state.hoveredMacroSectorId = action.payload;
    },

    toggleSectorVisibility(state, action: PayloadAction<MacroSectorId>) {
      const idx = state.hiddenSectorIds.indexOf(action.payload);
      if (idx >= 0) {
        state.hiddenSectorIds.splice(idx, 1);
      } else {
        state.hiddenSectorIds.push(action.payload);
      }
    },

    showAllSectors(state) {
      state.hiddenSectorIds = [];
    },

    // -- Sector focus --
    setFocusedSector(state, action: PayloadAction<MacroSectorId | null>) {
      state.focusedSectorId = action.payload;
    },

    // -- Metric detail panel --
    setActiveMetricPanel(state, action: PayloadAction<string | null>) {
      state.activeMetricPanel = action.payload;
    },

    // -- Demo mode --
    setDemoMode(state, action: PayloadAction<boolean>) {
      state.demoMode = action.payload;
    },

    loadDemoOntology(state, action: PayloadAction<OntologyRelationship[]>) {
      state._ontologyBackup = state.ontology.relationships;
      state.ontology.relationships = action.payload;
      state.ontologyLoaded = true;
    },

    restoreLiveOntology(state) {
      state.ontology.relationships = state._ontologyBackup ?? [];
      state._ontologyBackup = null;
    },

    // -- Simulation --
    enterSimulation(state) {
      state.simulationMode = true;
      state.simulationFork = { modifications: [], enteredAt: Date.now() };
    },

    exitSimulation(state) {
      state.simulationMode = false;
      state.simulationFork = null;
    },

    addSimulationModification(state, action: PayloadAction<SimulationFork['modifications'][0]>) {
      if (state.simulationFork) {
        state.simulationFork.modifications.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOntologyRelationships.pending, (state) => {
        state.ontologyLoading = true;
      })
      .addCase(fetchOntologyRelationships.fulfilled, (state, action) => {
        state.ontologyLoading = false;
        state.ontologyLoaded = true;
        state.ontology.relationships = action.payload?.data ?? [];
      })
      .addCase(fetchOntologyRelationships.rejected, (state) => {
        state.ontologyLoading = false;
        state.ontologyLoaded = true;
        state.ontology.relationships = [];
      });
  },
});

export const {
  selectNode,
  multiSelectNode,
  deselectAll,
  hoverNode,
  closeContextPanel,
  expandNode,
  collapseNode,
  toggleExpandNode,
  isolateSubgraph,
  exitIsolation,
  setViewMode,
  setFilters,
  resetFilters,
  showContextMenu,
  hideContextMenu,
  pushState,
  popState,
  setAltitude,
  descendAltitude,
  ascendAltitude,
  setAltitudeAnimating,
  setWeightingMode,
  toggleHeatmap,
  setHoveredMacroSector,
  setFocusedSector,
  toggleSectorVisibility,
  showAllSectors,
  setActiveMetricPanel,
  setDemoMode,
  loadDemoOntology,
  restoreLiveOntology,
  enterSimulation,
  exitSimulation,
  addSimulationModification,
} = graphSlice.actions;

export default graphSlice.reducer;
