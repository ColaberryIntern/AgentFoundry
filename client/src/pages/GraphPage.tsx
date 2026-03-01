import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchIndustries,
  fetchUseCases,
  fetchAgentSkeletons,
  fetchAgentVariants,
  fetchIntelligence,
} from '../store/registrySlice';
import { fetchOntologyRelationships } from '../graph/state/graphSlice';
import { GraphEngine } from '../graph/engine/GraphEngine';
import { ContextPanel } from '../graph/panels/ContextPanel';

export default function GraphPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { contextPanelOpen } = useAppSelector((s) => s.graph);

  // Load all data needed for the graph
  useEffect(() => {
    if (!user) return;
    dispatch(fetchIndustries({ page: 1, limit: 100 }));
    dispatch(fetchUseCases({ page: 1, limit: 100 }));
    dispatch(fetchAgentSkeletons());
    dispatch(fetchAgentVariants({ page: 1, limit: 100 }));
    dispatch(fetchIntelligence({}));
    dispatch(fetchOntologyRelationships({ limit: 500 }));
  }, [dispatch, user]);

  // Not logged in — redirect handled by Layout, show minimal state
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
            A
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-4">
            Agent OS
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Graph-Driven Intelligence Operating System
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--topbar-height))] -m-4 sm:-m-6 lg:-m-8">
      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <GraphEngine />
      </div>

      {/* Context Panel */}
      {contextPanelOpen && <ContextPanel />}
    </div>
  );
}
