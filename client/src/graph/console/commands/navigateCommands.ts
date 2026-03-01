import { commandRegistry } from '../CommandRegistry';
import {
  selectNode,
  isolateSubgraph,
  popState,
  deselectAll,
  exitIsolation,
  resetFilters,
} from '../../state/graphSlice';
import type { GraphNodeType } from '../../types/graphTypes';

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
    'Return to default view (clear isolation, filters, selection)',
    'home',
    (_args, dispatch) => {
      dispatch(deselectAll());
      dispatch(exitIsolation());
      dispatch(resetFilters());
      return { ok: true, message: 'Returned to home view' };
    },
  );
}
