import { useAppSelector, useAppDispatch } from '../../store/hooks';
import type { ViewMode } from '../types/graphTypes';
import { pushState, setViewMode } from '../state/graphSlice';

interface ModeButton {
  id: ViewMode;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const MODES: ModeButton[] = [
  {
    id: 'strategy',
    label: 'Strategy',
    shortLabel: 'STR',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
  {
    id: 'governance',
    label: 'Governance',
    shortLabel: 'GOV',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    id: 'architecture',
    label: 'Architecture',
    shortLabel: 'ARC',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
  },
  {
    id: 'performance',
    label: 'Performance',
    shortLabel: 'PRF',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    shortLabel: 'MKT',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
        />
      </svg>
    ),
  },
  {
    id: 'simulation',
    label: 'Simulation',
    shortLabel: 'SIM',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
  },
];

export function ModeToolbar() {
  const dispatch = useAppDispatch();
  const { viewMode, graphStateStack, simulationMode } = useAppSelector((s) => s.graph);

  const handleModeClick = (mode: ViewMode) => {
    if (mode === viewMode) return;
    dispatch(pushState({ viewport: { x: 0, y: 0, zoom: 1 }, label: `Mode: ${mode}` }));
    dispatch(setViewMode(mode));
  };

  const handleBack = () => {
    if (graphStateStack.length > 0) {
      dispatch({ type: 'graph/popState' });
    }
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-primary)]/80 backdrop-blur-xl border border-white/10 shadow-lg">
      {/* Back button */}
      {graphStateStack.length > 0 && (
        <button
          onClick={handleBack}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
          title="Back"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
      )}

      {/* Mode buttons */}
      {MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => handleModeClick(mode.id)}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
            ${
              viewMode === mode.id
                ? 'bg-blue-500/20 text-blue-400 shadow-sm shadow-blue-500/10'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
            }
          `}
          title={mode.label}
        >
          {mode.icon}
          <span className="hidden sm:inline">{mode.shortLabel}</span>
        </button>
      ))}

      {/* Simulation indicator */}
      {simulationMode && (
        <div className="ml-1 px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold animate-pulse">
          SIM
        </div>
      )}
    </div>
  );
}
