import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  fetchWebhookLogs,
  testWebhook,
  clearWebhooksError,
} from '../store/webhooksSlice';
import type { Webhook, WebhookLog } from '../services/webhooksApi';
import { sanitize } from '../utils/sanitize';
import { useAnalytics } from '../hooks/useAnalytics';

const WEBHOOK_EVENTS = [
  { value: 'compliance.check.completed', label: 'Compliance Check Completed' },
  { value: 'compliance.status.changed', label: 'Compliance Status Changed' },
  { value: 'report.generated', label: 'Report Generated' },
  { value: 'regulation.updated', label: 'Regulation Updated' },
  { value: 'agent.deployed', label: 'Agent Deployed' },
  { value: 'agent.error', label: 'Agent Error' },
] as const;

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + '...';
}

function formatEventLabel(event: string): string {
  return event
    .split('.')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/* ---------- Sub-components ---------- */

function EventBadge({ event }: { event: string }) {
  const colorMap: Record<string, string> = {
    'compliance.check.completed':
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'compliance.status.changed':
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    'report.generated': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'regulation.updated': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'agent.deployed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'agent.error': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const color = colorMap[event] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {formatEventLabel(event)}
    </span>
  );
}

function StatusIndicator({ webhook }: { webhook: Webhook }) {
  if (!webhook.isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Inactive
      </span>
    );
  }
  if (webhook.failureCount > 5) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
        <span className="w-2 h-2 rounded-full bg-yellow-500" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      Active
    </span>
  );
}

/* ---------- Create Form ---------- */

function CreateWebhookForm({
  onSubmit,
  isLoading,
  error,
}: {
  onSubmit: (data: { url: string; events: string[]; description?: string }) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || selectedEvents.length === 0) return;
    onSubmit({
      url: url.trim(),
      events: selectedEvents,
      description: description.trim() || undefined,
    });
    setUrl('');
    setDescription('');
    setSelectedEvents([]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Create New Webhook
        </h2>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <form
          onSubmit={handleSubmit}
          className="px-6 pb-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4"
        >
          <div>
            <label
              htmlFor="webhook-url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              URL <span className="text-red-500">*</span>
            </label>
            <input
              id="webhook-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label
              htmlFor="webhook-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <input
              id="webhook-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Events <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {WEBHOOK_EVENTS.map((evt) => (
                <label
                  key={evt.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(evt.value)}
                    onChange={() => toggleEvent(evt.value)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{evt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || !url.trim() || selectedEvents.length === 0}
              className="px-5 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Webhook'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ---------- Edit Modal ---------- */

function EditWebhookModal({
  webhook,
  onSave,
  onCancel,
  isLoading,
}: {
  webhook: Webhook;
  onSave: (data: { url: string; events: string[]; description: string; isActive: boolean }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [url, setUrl] = useState(webhook.url);
  const [description, setDescription] = useState(webhook.description || '');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(webhook.events);
  const [isActive, setIsActive] = useState(webhook.isActive);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || selectedEvents.length === 0) return;
    onSave({ url: url.trim(), events: selectedEvents, description: description.trim(), isActive });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Webhook</h3>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Events <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((evt) => (
                <label
                  key={evt.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(evt.value)}
                    onChange={() => toggleEvent(evt.value)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{evt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim() || selectedEvents.length === 0}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Delete Confirm ---------- */

function DeleteConfirmDialog({
  webhookUrl,
  onConfirm,
  onCancel,
  isLoading,
}: {
  webhookUrl: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Delete Webhook
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Are you sure you want to delete this webhook?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 break-all font-mono bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
          {webhookUrl}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Logs Section ---------- */

function WebhookLogsSection({
  logs,
  logsTotal,
  logsPage,
  setLogsPage,
  isLoading,
}: {
  logs: WebhookLog[];
  logsTotal: number;
  logsPage: number;
  setLogsPage: (page: number) => void;
  isLoading: boolean;
}) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const logsLimit = 10;
  const logsTotalPages = Math.ceil(logsTotal / logsLimit);

  if (isLoading && logs.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        Loading logs...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-6 text-center text-gray-400 dark:text-gray-500 text-sm">
        No delivery logs yet
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Event
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Success
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Attempt
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                  {formatEventLabel(log.eventType)}
                </td>
                <td className="px-4 py-2 text-sm">
                  {log.responseStatus !== null ? (
                    <span
                      className={`font-mono text-xs ${
                        log.responseStatus >= 200 && log.responseStatus < 300
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {log.responseStatus}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">--</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {log.success ? (
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  #{log.attempt}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  {log.duration !== null ? `${log.duration}ms` : '--'}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  {formatRelativeTime(log.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                  >
                    {expandedLogId === log.id ? 'Hide' : 'Show'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded log detail */}
      {expandedLogId &&
        (() => {
          const log = logs.find((l) => l.id === expandedLogId);
          if (!log) return null;
          return (
            <div className="mx-4 mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Payload
                  </h4>
                  <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-48 text-gray-800 dark:text-gray-200">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Response
                  </h4>
                  <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-48 text-gray-800 dark:text-gray-200">
                    {log.responseBody ? sanitize(log.responseBody) : 'No response body'}
                  </pre>
                  {log.error && (
                    <>
                      <h4 className="text-xs font-semibold text-red-500 uppercase mt-2 mb-1">
                        Error
                      </h4>
                      <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 overflow-x-auto max-h-24 text-red-700 dark:text-red-300">
                        {sanitize(log.error)}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Logs pagination */}
      {logsTotalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {(logsPage - 1) * logsLimit + 1} to {Math.min(logsPage * logsLimit, logsTotal)}{' '}
            of {logsTotal} logs
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
              disabled={logsPage === 1}
              className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            <button
              onClick={() => setLogsPage(Math.min(logsTotalPages, logsPage + 1))}
              disabled={logsPage === logsTotalPages}
              className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Toast Notification ---------- */

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}
      >
        {type === 'success' ? (
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
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
    </div>
  );
}

/* ---------- Main Page ---------- */

function WebhooksPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { webhooks, total, logs, logsTotal, isLoading, error } = useAppSelector(
    (state) => state.webhooks,
  );
  const { trackPageView } = useAnalytics();

  const [page, setPage] = useState(1);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deletingWebhook, setDeletingWebhook] = useState<Webhook | null>(null);
  const [viewingLogsId, setViewingLogsId] = useState<string | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const limit = 10;

  useEffect(() => {
    trackPageView('webhooks');
  }, [trackPageView]);

  const loadWebhooks = useCallback(() => {
    dispatch(fetchWebhooks({ page, limit }));
  }, [dispatch, page]);

  useEffect(() => {
    if (user) {
      loadWebhooks();
    }
  }, [user, loadWebhooks]);

  useEffect(() => {
    if (viewingLogsId) {
      dispatch(fetchWebhookLogs({ id: viewingLogsId, params: { page: logsPage, limit: 10 } }));
    }
  }, [dispatch, viewingLogsId, logsPage]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleCreate = async (data: { url: string; events: string[]; description?: string }) => {
    dispatch(clearWebhooksError());
    const result = await dispatch(createWebhook(data));
    if (createWebhook.fulfilled.match(result)) {
      setToast({ message: 'Webhook created successfully', type: 'success' });
    }
  };

  const handleEdit = async (data: {
    url: string;
    events: string[];
    description: string;
    isActive: boolean;
  }) => {
    if (!editingWebhook) return;
    dispatch(clearWebhooksError());
    const result = await dispatch(
      updateWebhook({
        id: editingWebhook.id,
        data: {
          url: data.url,
          events: data.events,
          description: data.description || undefined,
          isActive: data.isActive,
        },
      }),
    );
    if (updateWebhook.fulfilled.match(result)) {
      setEditingWebhook(null);
      setToast({ message: 'Webhook updated successfully', type: 'success' });
    }
  };

  const handleDelete = async () => {
    if (!deletingWebhook) return;
    dispatch(clearWebhooksError());
    const result = await dispatch(deleteWebhook(deletingWebhook.id));
    if (deleteWebhook.fulfilled.match(result)) {
      setDeletingWebhook(null);
      if (viewingLogsId === deletingWebhook.id) {
        setViewingLogsId(null);
      }
      setToast({ message: 'Webhook deleted', type: 'success' });
    }
  };

  const handleTest = async (webhook: Webhook) => {
    dispatch(clearWebhooksError());
    const result = await dispatch(testWebhook(webhook.id));
    if (testWebhook.fulfilled.match(result)) {
      setToast({ message: 'Test webhook delivered successfully', type: 'success' });
      // If we're viewing logs for this webhook, auto-expand
      if (viewingLogsId === webhook.id) {
        dispatch(fetchWebhookLogs({ id: webhook.id, params: { page: logsPage, limit: 10 } }));
      }
    } else {
      setToast({ message: 'Test webhook delivery failed', type: 'error' });
    }
  };

  const handleViewLogs = (webhookId: string) => {
    if (viewingLogsId === webhookId) {
      setViewingLogsId(null);
    } else {
      setViewingLogsId(webhookId);
      setLogsPage(1);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage webhook endpoints to receive real-time event notifications
        </p>
      </div>

      {/* Create Form */}
      <CreateWebhookForm onSubmit={handleCreate} isLoading={isLoading} error={error} />

      {/* Webhooks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Webhooks</h2>
        </div>

        {isLoading && webhooks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 dark:text-gray-500">Loading webhooks...</p>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 dark:text-gray-500">No webhooks configured yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Create one above to get started
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Failures
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Triggered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {webhooks.map((webhook) => (
                    <tr key={webhook.id}>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-900 dark:text-gray-100 font-mono"
                          title={webhook.url}
                        >
                          {truncateUrl(webhook.url)}
                        </div>
                        {webhook.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {webhook.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {webhook.events.map((evt) => (
                            <EventBadge key={evt} event={evt} />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusIndicator webhook={webhook} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {webhook.failureCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatRelativeTime(webhook.lastTriggeredAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingWebhook(webhook)}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleTest(webhook)}
                            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium"
                          >
                            Test
                          </button>
                          <button
                            onClick={() => handleViewLogs(webhook.id)}
                            className={`text-xs font-medium ${
                              viewingLogsId === webhook.id
                                ? 'text-indigo-700 dark:text-indigo-300'
                                : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300'
                            }`}
                          >
                            {viewingLogsId === webhook.id ? 'Hide Logs' : 'View Logs'}
                          </button>
                          <button
                            onClick={() => setDeletingWebhook(webhook)}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate"
                        title={webhook.url}
                      >
                        {webhook.url}
                      </p>
                      {webhook.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {webhook.description}
                        </p>
                      )}
                    </div>
                    <StatusIndicator webhook={webhook} />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((evt) => (
                      <EventBadge key={evt} event={evt} />
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Failures: {webhook.failureCount}</span>
                    <span>Last: {formatRelativeTime(webhook.lastTriggeredAt)}</span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => setEditingWebhook(webhook)}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleTest(webhook)}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleViewLogs(webhook.id)}
                      className={`text-xs font-medium ${
                        viewingLogsId === webhook.id
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300'
                      }`}
                    >
                      {viewingLogsId === webhook.id ? 'Hide Logs' : 'View Logs'}
                    </button>
                    <button
                      onClick={() => setDeletingWebhook(webhook)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Logs section - rendered below the table/cards for the selected webhook */}
            {viewingLogsId && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/30">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Delivery Logs for{' '}
                    <span className="font-mono text-gray-900 dark:text-gray-100">
                      {truncateUrl(webhooks.find((w) => w.id === viewingLogsId)?.url || '', 40)}
                    </span>
                  </h3>
                </div>
                <WebhookLogsSection
                  logs={logs}
                  logsTotal={logsTotal}
                  logsPage={logsPage}
                  setLogsPage={setLogsPage}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                  webhooks
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingWebhook && (
        <EditWebhookModal
          webhook={editingWebhook}
          onSave={handleEdit}
          onCancel={() => setEditingWebhook(null)}
          isLoading={isLoading}
        />
      )}

      {/* Delete Confirmation */}
      {deletingWebhook && (
        <DeleteConfirmDialog
          webhookUrl={deletingWebhook.url}
          onConfirm={handleDelete}
          onCancel={() => setDeletingWebhook(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default WebhooksPage;
