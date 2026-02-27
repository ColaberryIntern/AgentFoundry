import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { optimizeAgent, clearOptimization } from '../../store/agentsSlice';

interface AgentOptimizePanelProps {
  agentId: string;
}

function AgentOptimizePanel({ agentId }: AgentOptimizePanelProps) {
  const dispatch = useAppDispatch();
  const { optimization, optimizationLoading } = useAppSelector((state) => state.agents);

  const handleOptimize = () => {
    dispatch(optimizeAgent({ id: agentId }));
  };

  const handleClear = () => {
    dispatch(clearOptimization());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Optimization Recommendations
        </h3>
        <div className="flex items-center gap-2">
          {optimization && (
            <button
              onClick={handleClear}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleOptimize}
            disabled={optimizationLoading}
            className="px-3 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {optimizationLoading ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                Analyzing...
              </span>
            ) : (
              'Run Optimization'
            )}
          </button>
        </div>
      </div>

      {optimization && optimization.agentId === agentId && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
          {optimization.optimization.recommendations.length > 0 ? (
            <ul className="space-y-2">
              {optimization.optimization.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <svg
                    className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No optimization recommendations at this time. The agent is performing well.
            </p>
          )}

          {optimization.optimization.optimizedConfig && (
            <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-700">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Suggested Configuration
              </h4>
              <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                {JSON.stringify(optimization.optimization.optimizedConfig, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {!optimization && !optimizationLoading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click "Run Optimization" to get AI-powered recommendations for this agent using Genetic
          Algorithm analysis.
        </p>
      )}
    </div>
  );
}

export default AgentOptimizePanel;
