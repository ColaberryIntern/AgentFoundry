import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setDemoMode } from '../state/graphSlice';
import { loadDemoData, restoreRealData } from '../../store/registrySlice';
import { generateHealthcareDemoData } from '../demo/healthcareDemoData';

/**
 * Toggle pill: LIVE DATA (green) ↔ DEMO DATA (amber).
 * Switches the registry between real backend data and generated demo data.
 */
export function DemoModeToggle() {
  const dispatch = useAppDispatch();
  const demoMode =
    useAppSelector((s) => (s.graph as unknown as { demoMode?: boolean }).demoMode) ?? false;

  const handleToggle = () => {
    if (demoMode) {
      // Switch to live
      dispatch(restoreRealData());
      dispatch(setDemoMode(false));
    } else {
      // Switch to demo
      dispatch(loadDemoData(generateHealthcareDemoData()));
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
