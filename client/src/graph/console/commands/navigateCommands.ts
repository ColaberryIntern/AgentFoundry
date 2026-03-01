import { commandRegistry } from '../CommandRegistry';
import {
  selectNode,
  isolateSubgraph,
  popState,
  deselectAll,
  exitIsolation,
  resetFilters,
  setAltitude,
  descendAltitude,
  ascendAltitude,
  pushState,
} from '../../state/graphSlice';
import type { GraphNodeType } from '../../types/graphTypes';
import {
  ALTITUDE_ORDER,
  ALTITUDE_LABELS,
  EMPTY_ALTITUDE_CONTEXT,
} from '../../altitude/altitudeTypes';
import type { AltitudeLevel } from '../../altitude/altitudeTypes';

export function registerNavigateCommands() {
  commandRegistry.register(
    'focus',
    'Focus on a specific entity by ID or name',
    'focus <entityId | name>',
    (args, dispatch) => {
      if (args.length === 0) return { ok: false, message: 'Usage: focus <entityId>' };
      const target = args.join(' ');

      // Try to find a matching node ID pattern
      const prefixes: Array<{ prefix: string; type: GraphNodeType }> = [
        { prefix: 'industry-', type: 'industry' },
        { prefix: 'usecase-', type: 'useCase' },
        { prefix: 'skeleton-', type: 'skeleton' },
        { prefix: 'variant-', type: 'variant' },
        { prefix: 'cert-', type: 'certification' },
        { prefix: 'deploy-', type: 'deployment' },
        { prefix: 'risk-', type: 'risk' },
        { prefix: 'market-', type: 'marketplace' },
      ];

      for (const { prefix, type } of prefixes) {
        if (target.startsWith(prefix)) {
          dispatch(selectNode({ nodeId: target, nodeType: type }));
          dispatch(isolateSubgraph(target));
          return { ok: true, message: `Focused on ${type}: ${target}` };
        }
      }

      // Try as industry code
      if (/^\d{2,6}$/.test(target)) {
        dispatch(selectNode({ nodeId: `industry-${target}`, nodeType: 'industry' }));
        dispatch(isolateSubgraph(`industry-${target}`));
        return { ok: true, message: `Focused on industry ${target}` };
      }

      return {
        ok: false,
        message: `Could not resolve "${target}". Use full node ID (e.g., industry-51).`,
      };
    },
  );

  commandRegistry.register('back', 'Go back to previous graph state', 'back', (_args, dispatch) => {
    dispatch(popState());
    return { ok: true, message: 'Returned to previous state' };
  });

  commandRegistry.register(
    'select',
    'Select nodes: select all <nodeType>',
    'select all <nodeType>',
    (args, dispatch) => {
      if (args.length === 0) {
        dispatch(deselectAll());
        return { ok: true, message: 'Selection cleared' };
      }
      if (args[0] === 'none') {
        dispatch(deselectAll());
        return { ok: true, message: 'Selection cleared' };
      }
      return { ok: true, message: `Select: use click/shift-click on the graph` };
    },
  );

  commandRegistry.register(
    'home',
    'Return to GLOBAL altitude (clear isolation, filters, selection)',
    'home',
    (_args, dispatch) => {
      dispatch(deselectAll());
      dispatch(exitIsolation());
      dispatch(resetFilters());
      dispatch(
        setAltitude({
          level: 'GLOBAL',
          context: { ...EMPTY_ALTITUDE_CONTEXT },
        }),
      );
      return { ok: true, message: 'Returned to GLOBAL altitude' };
    },
  );

  // --- Altitude Navigation Commands ---

  commandRegistry.register(
    'altitude',
    'Jump to a specific altitude level',
    'altitude <global|industry|use_case|stack|agent>',
    (args, dispatch) => {
      if (args.length === 0) {
        const levels = ALTITUDE_ORDER.map(
          (l) => `  ${l.toLowerCase()} — ${ALTITUDE_LABELS[l]}`,
        ).join('\n');
        return {
          ok: true,
          message: `Available altitudes:\n${levels}\nUsage: altitude <level>`,
        };
      }

      const input = args[0].toUpperCase().replace('-', '_') as AltitudeLevel;
      if (!ALTITUDE_ORDER.includes(input)) {
        return {
          ok: false,
          message: `Unknown altitude "${args[0]}". Valid: ${ALTITUDE_ORDER.map((l) => l.toLowerCase()).join(', ')}`,
        };
      }

      dispatch(pushState({ viewport: { x: 0, y: 0, zoom: 1 }, label: `Jump to ${input}` }));
      dispatch(
        setAltitude({
          level: input,
          context: { ...EMPTY_ALTITUDE_CONTEXT },
        }),
      );
      return { ok: true, message: `Jumped to ${ALTITUDE_LABELS[input]}` };
    },
  );

  commandRegistry.register(
    'descend',
    'Descend into a cluster by entity ID',
    'descend <entityId>',
    (args, dispatch) => {
      if (args.length === 0) {
        return { ok: false, message: 'Usage: descend <entityId> (e.g., descend 51)' };
      }

      const targetId = args.join(' ');

      // Guess the target type from the ID pattern
      let targetType: GraphNodeType = 'industryCluster';
      if (/^\d{2,6}$/.test(targetId)) {
        targetType = 'industryCluster';
      } else if (targetId.startsWith('usecase-') || targetId.startsWith('uc-')) {
        targetType = 'useCaseCluster';
      } else if (targetId.startsWith('skeleton-') || targetId.startsWith('sk-')) {
        targetType = 'stackCluster';
      } else if (targetId.startsWith('variant-') || targetId.startsWith('v-')) {
        targetType = 'variant';
      }

      dispatch(pushState({ viewport: { x: 0, y: 0, zoom: 1 }, label: `Descend into ${targetId}` }));
      dispatch(descendAltitude({ targetId, targetType }));
      return { ok: true, message: `Descending into ${targetId}` };
    },
  );

  commandRegistry.register('ascend', 'Ascend one altitude level', 'ascend', (_args, dispatch) => {
    dispatch(pushState({ viewport: { x: 0, y: 0, zoom: 1 }, label: 'Ascend' }));
    dispatch(ascendAltitude());
    return { ok: true, message: 'Ascending one altitude level' };
  });
}
