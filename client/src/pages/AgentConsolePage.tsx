import { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchAgents,
  createAgent,
  deployAgent,
  pauseAgent,
  resumeAgent,
  stopAgent,
  deleteAgent,
  clearAgentsError,
  clearSelectedAgent,
} from '../store/agentsSlice';
import type {
  AgentStack,
  AgentStackCreateRequest,
  AgentStackStatus,
  AgentStackType,
} from '../types/agents';
import AgentCard from '../components/agents/AgentCard';
import AgentCreateModal from '../components/agents/AgentCreateModal';
import AgentDetailPanel from '../components/agents/AgentDetailPanel';

function AgentConsolePage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { agents, loading, error, total } = useAppSelector((state) => state.agents);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentStack | null>(null);
  const [statusFilter, setStatusFilter] = useState<AgentStackStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<AgentStackType | ''>('');

  const loadAgents = useCallback(() => {
    const params: Record<string, string | number> = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;
    dispatch(fetchAgents(params));
  }, [dispatch, statusFilter, typeFilter]);

  useEffect(() => {
    if (user?.role === 'it_admin') {
      loadAgents();
    }
  }, [user, loadAgents]);

  // Access control: IT Admin only
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'it_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <svg
          className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Access Denied
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          The Agent Management Console is only available to IT Administrators. Please contact your
          administrator if you need access.
        </p>
      </div>
    );
  }

  const handleCreate = async (data: AgentStackCreateRequest) => {
    const result = await dispatch(createAgent(data));
    if (createAgent.fulfilled.match(result)) {
      setCreateModalOpen(false);
    }
  };

  const handleDeploy = (id: string) => {
    dispatch(deployAgent(id));
  };

  const handlePause = (id: string) => {
    dispatch(pauseAgent(id));
  };

  const handleResume = (id: string) => {
    dispatch(resumeAgent(id));
  };

  const handleStop = (id: string) => {
    dispatch(stopAgent(id));
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteAgent(id));
    if (selectedAgent?.id === id) {
      setSelectedAgent(null);
    }
  };

  const handleSelect = (agent: AgentStack) => {
    setSelectedAgent(agent);
  };

  const handleCloseDetail = () => {
    setSelectedAgent(null);
    dispatch(clearSelectedAgent());
  };

  // Keep selected agent data in sync with Redux store
  const currentSelectedAgent = selectedAgent
    ? agents.find((a) => a.id === selectedAgent.id) || selectedAgent
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              to="/dashboard"
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <svg
              className="w-3.5 h-3.5 inline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li className="text-gray-900 dark:text-gray-100 font-medium">Agent Management Console</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Agent Management Console
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Deploy, manage, and monitor AI agent stacks ({total} agents)
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AgentStackStatus | '')}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="deploying">Deploying</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="stopped">Stopped</option>
          <option value="error">Error</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AgentStackType | '')}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Types</option>
          <option value="compliance_monitor">Compliance Monitor</option>
          <option value="risk_analyzer">Risk Analyzer</option>
          <option value="regulatory_tracker">Regulatory Tracker</option>
          <option value="audit_agent">Audit Agent</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => dispatch(clearAgentsError())}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-6">
        {/* Agent list */}
        <div className={`flex-1 ${currentSelectedAgent ? 'hidden lg:block lg:w-1/2' : 'w-full'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No agents found. Create your first agent to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onSelect={handleSelect}
                  onDeploy={handleDeploy}
                  onPause={handlePause}
                  onResume={handleResume}
                  onStop={handleStop}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {currentSelectedAgent && (
          <div className="w-full lg:w-1/2">
            <AgentDetailPanel
              agent={currentSelectedAgent}
              onClose={handleCloseDetail}
              onDeploy={handleDeploy}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
            />
          </div>
        )}
      </div>

      {/* Create modal */}
      <AgentCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreate}
        loading={loading}
      />
    </div>
  );
}

export default AgentConsolePage;
