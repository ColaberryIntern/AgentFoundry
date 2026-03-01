import { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import type { SimulationModification } from '../types/graphState';

/**
 * Returns live or forked entity data depending on simulation mode.
 * When simulation is active, modifications are applied on top of live data
 * so the graph reflects the forked view.
 */
export function useSimulationData() {
  const { simulationMode, simulationFork } = useAppSelector((s) => s.graph);
  const modifications = simulationFork?.modifications ?? [];

  // Derive summary stats from modifications
  const stats = useMemo(() => {
    if (!simulationMode || modifications.length === 0) {
      return { added: 0, modified: 0, removed: 0, total: 0 };
    }
    const added = modifications.filter((m) => m.action === 'add').length;
    const modified = modifications.filter((m) => m.action === 'modify').length;
    const removed = modifications.filter((m) => m.action === 'remove').length;
    return { added, modified, removed, total: modifications.length };
  }, [simulationMode, modifications]);

  // Build a lookup of modified entity IDs for visual indicators
  const modifiedEntities = useMemo(() => {
    const map = new Map<string, SimulationModification['action']>();
    for (const m of modifications) {
      map.set(`${m.entityType}-${m.entityId}`, m.action);
    }
    return map;
  }, [modifications]);

  return {
    isSimulation: simulationMode,
    modifications,
    stats,
    modifiedEntities,
  };
}
