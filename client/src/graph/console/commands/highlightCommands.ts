import { commandRegistry } from '../CommandRegistry';
import { setFilters } from '../../state/graphSlice';

export function registerHighlightCommands() {
  commandRegistry.register(
    'highlight',
    'Highlight nodes matching a condition',
    'highlight <condition>',
    (args, dispatch) => {
      if (args.length === 0) {
        return {
          ok: false,
          message: 'Usage: highlight risks | uncertified | expired | certified | deployments',
        };
      }
      const condition = args.join(' ').toLowerCase();

      switch (condition) {
        case 'risks':
        case 'risk':
          dispatch(setFilters({ nodeTypes: ['risk'] }));
          return { ok: true, message: 'Highlighting risk nodes' };

        case 'uncertified':
          dispatch(setFilters({ certificationStatus: ['pending', 'failed', 'expired'] }));
          return { ok: true, message: 'Highlighting uncertified variants' };

        case 'certified':
          dispatch(setFilters({ certificationStatus: ['certified'] }));
          return { ok: true, message: 'Highlighting certified variants' };

        case 'expired':
          dispatch(setFilters({ nodeTypes: ['certification'] }));
          return { ok: true, message: 'Highlighting certifications (check for expired)' };

        case 'deployments':
        case 'deployed':
          dispatch(setFilters({ nodeTypes: ['deployment'] }));
          return { ok: true, message: 'Highlighting deployments' };

        case 'marketplace':
        case 'submissions':
          dispatch(setFilters({ nodeTypes: ['marketplace'] }));
          return { ok: true, message: 'Highlighting marketplace submissions' };

        default:
          return { ok: false, message: `Unknown condition: "${condition}"` };
      }
    },
  );
}
