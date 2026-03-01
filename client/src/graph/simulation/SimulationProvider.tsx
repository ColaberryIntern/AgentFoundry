import { createContext, useContext, type ReactNode } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { enterSimulation, exitSimulation, pushState } from '../state/graphSlice';
import type { AltitudeLevel, AltitudeContext } from '../altitude/altitudeTypes';
import { ALTITUDE_LABELS } from '../altitude/altitudeTypes';

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
  altitude: AltitudeLevel;
  altitudeContext: AltitudeContext;
  altitudeLabel: string;
  enter: () => void;
  exit: () => void;
}

const SimulationContext = createContext<SimulationCtx>({
  active: false,
  modifications: [],
  enteredAt: null,
  altitude: 'GLOBAL',
  altitudeContext: { industryCode: null, useCaseId: null, skeletonId: null, variantId: null },
  altitudeLabel: 'Global Intelligence',
  enter: () => {},
  exit: () => {},
});

export function SimulationProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { simulationMode, simulationFork, currentAltitude, altitudeContext } = useAppSelector(
    (s) => s.graph,
  );

  const enter = () => {
    dispatch(
      pushState({
        viewport: { x: 0, y: 0, zoom: 1 },
        label: `Pre-simulation @ ${ALTITUDE_LABELS[currentAltitude]}`,
      }),
    );
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
        altitude: currentAltitude,
        altitudeContext,
        altitudeLabel: ALTITUDE_LABELS[currentAltitude],
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
