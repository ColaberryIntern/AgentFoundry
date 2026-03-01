import { createContext, useContext, type ReactNode } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { enterSimulation, exitSimulation, pushState } from '../state/graphSlice';

interface SimulationCtx {
  active: boolean;
  modifications: Array<{
    entityType: string;
    entityId: string;
    action: 'add' | 'modify' | 'remove';
    field?: string;
    before?: unknown;
    after?: unknown;
  }>;
  enteredAt: number | null;
  enter: () => void;
  exit: () => void;
}

const SimulationContext = createContext<SimulationCtx>({
  active: false,
  modifications: [],
  enteredAt: null,
  enter: () => {},
  exit: () => {},
});

export function SimulationProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { simulationMode, simulationFork } = useAppSelector((s) => s.graph);

  const enter = () => {
    dispatch(pushState({ viewport: { x: 0, y: 0, zoom: 1 }, label: 'Pre-simulation' }));
    dispatch(enterSimulation());
  };

  const exit = () => {
    dispatch(exitSimulation());
  };

  return (
    <SimulationContext.Provider
      value={{
        active: simulationMode,
        modifications: simulationFork?.modifications ?? [],
        enteredAt: simulationFork?.enteredAt ?? null,
        enter,
        exit,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  return useContext(SimulationContext);
}
