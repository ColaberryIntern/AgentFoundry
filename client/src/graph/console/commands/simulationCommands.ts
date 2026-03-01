import { commandRegistry } from '../CommandRegistry';
import { enterSimulation, exitSimulation, pushState } from '../../state/graphSlice';

export function registerSimulationCommands() {
  commandRegistry.register(
    'simulate',
    'Enter or exit simulation mode',
    'simulate enter | exit',
    (args, dispatch) => {
      if (args.length === 0) {
        return { ok: false, message: 'Usage: simulate enter | exit' };
      }
      const action = args[0].toLowerCase();
      if (action === 'enter' || action === 'start') {
        dispatch(pushState({ viewport: { x: 0, y: 0, zoom: 1 }, label: 'Pre-simulation' }));
        dispatch(enterSimulation());
        return { ok: true, message: 'Entered simulation mode. Changes are sandboxed.' };
      }
      if (action === 'exit' || action === 'stop' || action === 'discard') {
        dispatch(exitSimulation());
        return { ok: true, message: 'Exited simulation mode. All changes discarded.' };
      }
      return { ok: false, message: 'Usage: simulate enter | exit' };
    },
  );
}
