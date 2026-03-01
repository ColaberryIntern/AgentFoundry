import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchIndustries,
  fetchUseCases,
  fetchAgentSkeletons,
  fetchAgentVariants,
  fetchIntelligence,
} from '../store/registrySlice';
import {
  fetchIntents,
  fetchActions,
  fetchViolations,
  fetchSettings,
} from '../store/orchestratorSlice';
import { fetchOntologyRelationships } from '../graph/state/graphSlice';
import { GraphEngine } from '../graph/engine/GraphEngine';
import { ContextPanel } from '../graph/panels/ContextPanel';
import { SimulationProvider } from '../graph/simulation/SimulationProvider';
import { SimulationDiffPanel } from '../graph/simulation/SimulationDiffPanel';
import { GovernanceOverlay } from '../graph/governance/GovernanceOverlay';
import { AutonomyControlPanel } from '../graph/autonomy/AutonomyControlPanel';

export default function GraphPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { contextPanelOpen, simulationMode, viewMode } = useAppSelector((s) => s.graph);

  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [autonomyOpen, setAutonomyOpen] = useState(false);

  // Open governance overlay when switching to governance mode
  useEffect(() => {
    if (viewMode === 'governance') setGovernanceOpen(true);
  }, [viewMode]);

  // Load all data needed for the graph
  useEffect(() => {
    if (!user) return;
    dispatch(fetchIndustries({ page: 1, limit: 100 }));
    dispatch(fetchUseCases({ page: 1, limit: 100 }));
    dispatch(fetchAgentSkeletons());
    dispatch(fetchAgentVariants({ page: 1, limit: 100 }));
    dispatch(fetchIntelligence({}));
    dispatch(fetchOntologyRelationships({ limit: 500 }));
    // Governance data
    dispatch(fetchIntents({ page: 1, limit: 50 }));
    dispatch(fetchActions({ page: 1, limit: 50 }));
    dispatch(fetchViolations({ page: 1, limit: 50 }));
    dispatch(fetchSettings({}));
  }, [dispatch, user]);

  // Not logged in — redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SimulationProvider>
      <div className="flex h-[calc(100vh-var(--topbar-height))] -m-4 sm:-m-6 lg:-m-8">
        {/* Governance Overlay (left side) */}
        <GovernanceOverlay open={governanceOpen} onClose={() => setGovernanceOpen(false)} />

        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <GraphEngine />

          {/* Governance toggle button (only when overlay is closed) */}
          {!governanceOpen && (
            <button
              onClick={() => setGovernanceOpen(true)}
              className="absolute top-16 left-4 z-30 p-2 rounded-lg bg-[var(--surface-primary)]/60 backdrop-blur-md border border-white/5 text-[var(--text-muted)] hover:text-amber-300 hover:border-amber-500/20 transition-colors"
              title="Open Governance Panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </button>
          )}

          {/* Autonomy toggle button */}
          <button
            onClick={() => setAutonomyOpen(true)}
            className="absolute top-28 left-4 z-30 p-2 rounded-lg bg-[var(--surface-primary)]/60 backdrop-blur-md border border-white/5 text-[var(--text-muted)] hover:text-blue-300 hover:border-blue-500/20 transition-colors"
            title="Autonomy Controls"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </button>
        </div>

        {/* Context Panel (right side) */}
        {contextPanelOpen && <ContextPanel />}

        {/* Simulation Diff Panel (right side, replaces context panel when sim active) */}
        {simulationMode && <SimulationDiffPanel />}

        {/* Autonomy Control Panel (modal overlay) */}
        <AutonomyControlPanel open={autonomyOpen} onClose={() => setAutonomyOpen(false)} />
      </div>
    </SimulationProvider>
  );
}
