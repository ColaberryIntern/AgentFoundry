import { useState } from 'react';
import type { AgentStackType, AgentStackCreateRequest } from '../../types/agents';

interface AgentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgentStackCreateRequest) => void;
  loading: boolean;
}

const agentTypes: { value: AgentStackType; label: string }[] = [
  { value: 'compliance_monitor', label: 'Compliance Monitor' },
  { value: 'risk_analyzer', label: 'Risk Analyzer' },
  { value: 'regulatory_tracker', label: 'Regulatory Tracker' },
  { value: 'audit_agent', label: 'Audit Agent' },
  { value: 'custom', label: 'Custom' },
];

function AgentCreateModal({ isOpen, onClose, onSubmit, loading }: AgentCreateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AgentStackType>('compliance_monitor');
  const [description, setDescription] = useState('');
  const [configJson, setConfigJson] = useState('');
  const [configError, setConfigError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let configuration: Record<string, unknown> | undefined;
    if (configJson.trim()) {
      try {
        configuration = JSON.parse(configJson);
        setConfigError('');
      } catch {
        setConfigError('Invalid JSON format');
        return;
      }
    }

    onSubmit({
      name,
      type,
      description: description || undefined,
      configuration,
    });

    // Reset form
    setName('');
    setType('compliance_monitor');
    setDescription('');
    setConfigJson('');
    setConfigError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create New Agent
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Agent Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., GDPR Compliance Monitor"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Agent Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AgentStackType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              {agentTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what this agent does..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
            />
          </div>

          {/* Configuration JSON */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Configuration (JSON)
            </label>
            <textarea
              value={configJson}
              onChange={(e) => {
                setConfigJson(e.target.value);
                setConfigError('');
              }}
              rows={4}
              placeholder='{"threshold": 0.95, "schedule": "*/5 * * * *"}'
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono resize-none ${
                configError
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {configError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{configError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AgentCreateModal;
