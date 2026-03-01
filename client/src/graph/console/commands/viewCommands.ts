import { commandRegistry } from '../CommandRegistry';
import { setViewMode } from '../../state/graphSlice';
import type { ViewMode } from '../../types/graphTypes';

const MODE_ALIASES: Record<string, ViewMode> = {
  strategy: 'strategy',
  strat: 'strategy',
  governance: 'governance',
  gov: 'governance',
  architecture: 'architecture',
  arch: 'architecture',
  performance: 'performance',
  perf: 'performance',
  marketplace: 'marketplace',
  market: 'marketplace',
  simulation: 'simulation',
  sim: 'simulation',
};

export function registerViewCommands() {
  commandRegistry.register(
    'mode',
    'Switch graph view mode',
    'mode <strategy|governance|architecture|performance|marketplace|simulation>',
    (args, dispatch) => {
      if (args.length === 0) {
        return {
          ok: false,
          message:
            'Usage: mode <modeName>. Available: strategy, governance, architecture, performance, marketplace, simulation',
        };
      }
      const mode = MODE_ALIASES[args[0].toLowerCase()];
      if (!mode) {
        return {
          ok: false,
          message: `Unknown mode: "${args[0]}". Available: strategy, governance, architecture, performance, marketplace, simulation`,
        };
      }
      dispatch(setViewMode(mode));
      return { ok: true, message: `Switched to ${mode} mode` };
    },
  );

  commandRegistry.register('zoom', 'Zoom control: fit, in, out', 'zoom fit | in | out', (args) => {
    if (args.length === 0) return { ok: false, message: 'Usage: zoom fit | in | out' };
    const action = args[0].toLowerCase();
    if (['fit', 'in', 'out'].includes(action)) {
      // Zoom actions are handled by the console component via ReactFlow API
      return { ok: true, message: `zoom:${action}` };
    }
    return { ok: false, message: 'Usage: zoom fit | in | out' };
  });
}
