import type { GraphNodeType, ViewMode, ContextMenuState } from './graphTypes';
import type { AltitudeLevel, AltitudeContext } from '../altitude/altitudeTypes';
import { EMPTY_ALTITUDE_CONTEXT } from '../altitude/altitudeTypes';

// ---------------------------------------------------------------------------
// Graph State Stack Entry — snapshot for back-navigation
// ---------------------------------------------------------------------------

export interface GraphStateEntry {
  id: string;
  timestamp: number;
  expandedNodeIds: string[];
  isolatedSubgraphRoot: string | null;
  selectedNodeIds: string[];
  viewMode: ViewMode;
  filters: GraphFilters;
  viewport: { x: number; y: number; zoom: number };
  label: string;
  // Altitude snapshot
  altitude: AltitudeLevel;
  altitudeContext: AltitudeContext;
}

// ---------------------------------------------------------------------------
// Graph Filters
// ---------------------------------------------------------------------------

export interface GraphFilters {
  nodeTypes: GraphNodeType[];
  certificationStatus: string[];
  industryCode: string | null;
  searchQuery: string;
}

// ---------------------------------------------------------------------------
// Simulation Fork
// ---------------------------------------------------------------------------

export interface SimulationModification {
  entityType: GraphNodeType;
  entityId: string;
  action: 'add' | 'modify' | 'remove';
  field?: string;
  before: unknown;
  after: unknown;
}

export interface SimulationFork {
  modifications: SimulationModification[];
  enteredAt: number;
}

// ---------------------------------------------------------------------------
// Full Graph UI State (Redux)
// ---------------------------------------------------------------------------

export interface GraphUIState {
  // Selection
  selectedNodeIds: string[];
  hoveredNodeId: string | null;

  // Context panel
  contextPanelOpen: boolean;
  contextPanelNodeId: string | null;
  contextPanelNodeType: GraphNodeType | null;

  // View mode
  viewMode: ViewMode;

  // Altitude
  currentAltitude: AltitudeLevel;
  altitudeContext: AltitudeContext;
  altitudeAnimating: boolean;

  // Navigation stack
  graphStateStack: GraphStateEntry[];

  // Expansion / Isolation
  expandedNodeIds: string[];
  isolatedSubgraphRoot: string | null;

  // Filters
  filters: GraphFilters;

  // Context menu
  contextMenu: ContextMenuState;

  // Simulation
  simulationMode: boolean;
  simulationFork: SimulationFork | null;

  // Data loading
  ontologyLoading: boolean;
  ontologyLoaded: boolean;
}

export const DEFAULT_FILTERS: GraphFilters = {
  nodeTypes: [
    'industry',
    'useCase',
    'skeleton',
    'variant',
    'certification',
    'deployment',
    'risk',
    'marketplace',
    'industryCluster',
    'useCaseCluster',
    'stackCluster',
  ],
  certificationStatus: [],
  industryCode: null,
  searchQuery: '',
};

export const INITIAL_GRAPH_STATE: GraphUIState = {
  selectedNodeIds: [],
  hoveredNodeId: null,
  contextPanelOpen: false,
  contextPanelNodeId: null,
  contextPanelNodeType: null,
  viewMode: 'strategy',
  currentAltitude: 'GLOBAL',
  altitudeContext: { ...EMPTY_ALTITUDE_CONTEXT },
  altitudeAnimating: false,
  graphStateStack: [],
  expandedNodeIds: [],
  isolatedSubgraphRoot: null,
  filters: { ...DEFAULT_FILTERS },
  contextMenu: { visible: false, x: 0, y: 0, nodeId: '', nodeType: 'industry' },
  simulationMode: false,
  simulationFork: null,
  ontologyLoading: false,
  ontologyLoaded: false,
};
