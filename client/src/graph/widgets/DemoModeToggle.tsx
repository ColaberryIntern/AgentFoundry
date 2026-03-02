import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setDemoMode, loadDemoOntology, restoreLiveOntology } from '../state/graphSlice';
import { loadDemoData, restoreRealData } from '../../store/registrySlice';
import {
  loadDemoMarketplace,
  loadDemoDashboard,
  restoreLiveOrchestrator,
} from '../../store/orchestratorSlice';
import { loadDemoRiskAnalysis, restoreLiveRiskAnalysis } from '../../store/complianceSlice';
import { generateAllSectorDemoData } from '../demo/allSectorDemoData';

/**
 * Toggle pill: LIVE DATA (green) ↔ DEMO DATA (amber).
 * Switches all stores between real backend data and generated demo data.
 */
export function DemoModeToggle() {
  const dispatch = useAppDispatch();
  const demoMode =
    useAppSelector((s) => (s.graph as unknown as { demoMode?: boolean }).demoMode) ?? false;

  const handleToggle = () => {
    if (demoMode) {
      // Switch to live — restore all stores
      dispatch(restoreRealData());
      dispatch(restoreLiveOrchestrator());
      dispatch(restoreLiveRiskAnalysis());
      dispatch(restoreLiveOntology());
      dispatch(setDemoMode(false));
    } else {
      // Switch to demo — populate all stores
      const demo = generateAllSectorDemoData();
      dispatch(loadDemoData(demo));
      dispatch(loadDemoMarketplace(demo.marketplace));
      dispatch(loadDemoDashboard(demo.dashboard));
      dispatch(loadDemoRiskAnalysis(demo.riskAnalysis));
      dispatch(loadDemoOntology(demo.ontologyRelationships));
      dispatch(setDemoMode(true));
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[10px] font-semibold"
      style={{
        backgroundColor: demoMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
        borderColor: demoMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)',
        color: demoMode ? '#f59e0b' : '#10b981',
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: demoMode ? '#f59e0b' : '#10b981',
          boxShadow: `0 0 6px ${demoMode ? 'rgba(245, 158, 11, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
        }}
      />
      {demoMode ? 'DEMO DATA' : 'LIVE DATA'}
    </button>
  );
}
