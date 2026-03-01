import { commandRegistry } from '../CommandRegistry';
import { setFilters, resetFilters } from '../../state/graphSlice';
import type { GraphNodeType } from '../../types/graphTypes';

const VALID_TYPES: GraphNodeType[] = [
  'industry',
  'useCase',
  'skeleton',
  'variant',
  'certification',
  'deployment',
  'risk',
  'marketplace',
];

function resolveType(input: string): GraphNodeType | null {
  const lower = input.toLowerCase();
  const aliases: Record<string, GraphNodeType> = {
    industries: 'industry',
    industry: 'industry',
    usecases: 'useCase',
    usecase: 'useCase',
    uc: 'useCase',
    skeletons: 'skeleton',
    skeleton: 'skeleton',
    stack: 'skeleton',
    stacks: 'skeleton',
    variants: 'variant',
    variant: 'variant',
    agent: 'variant',
    agents: 'variant',
    certifications: 'certification',
    certification: 'certification',
    cert: 'certification',
    certs: 'certification',
    deployments: 'deployment',
    deployment: 'deployment',
    deploy: 'deployment',
    risks: 'risk',
    risk: 'risk',
    marketplace: 'marketplace',
    market: 'marketplace',
    submissions: 'marketplace',
  };
  return aliases[lower] ?? null;
}

export function registerFilterCommands() {
  commandRegistry.register(
    'show',
    'Show a node type on the graph',
    'show <nodeType>',
    (args, dispatch) => {
      if (args.length === 0) return { ok: false, message: 'Usage: show <nodeType>' };
      const type = resolveType(args[0]);
      if (!type) return { ok: false, message: `Unknown node type: "${args[0]}"` };
      dispatch(setFilters({ nodeTypes: [...VALID_TYPES] }));
      return { ok: true, message: `Showing ${type} nodes` };
    },
  );

  commandRegistry.register(
    'hide',
    'Hide a node type from the graph',
    'hide <nodeType>',
    (args, dispatch) => {
      if (args.length === 0) return { ok: false, message: 'Usage: hide <nodeType>' };
      const type = resolveType(args[0]);
      if (!type) return { ok: false, message: `Unknown node type: "${args[0]}"` };
      const remaining = VALID_TYPES.filter((t) => t !== type);
      dispatch(setFilters({ nodeTypes: remaining }));
      return { ok: true, message: `Hidden ${type} nodes` };
    },
  );

  commandRegistry.register(
    'filter',
    'Filter nodes by type or property',
    'filter <nodeType> [where ...]',
    (args, dispatch) => {
      if (args.length === 0) return { ok: false, message: 'Usage: filter <nodeType>' };

      if (args[0] === 'certified') {
        dispatch(setFilters({ certificationStatus: ['certified'] }));
        return { ok: true, message: 'Filtering: certified variants only' };
      }
      if (args[0] === 'uncertified') {
        dispatch(setFilters({ certificationStatus: ['pending', 'failed', 'expired'] }));
        return { ok: true, message: 'Filtering: uncertified variants only' };
      }

      const type = resolveType(args[0]);
      if (!type) return { ok: false, message: `Unknown node type: "${args[0]}"` };
      dispatch(setFilters({ nodeTypes: [type] }));
      return { ok: true, message: `Filtered to ${type} nodes only` };
    },
  );

  commandRegistry.register('reset', 'Reset all filters to defaults', 'reset', (_args, dispatch) => {
    dispatch(resetFilters());
    return { ok: true, message: 'Filters reset to defaults' };
  });
}
