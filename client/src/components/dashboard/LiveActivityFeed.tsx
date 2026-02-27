import { useEffect, useRef, useState } from 'react';
import type { ActivityUpdate } from '../../types/reports';

const MAX_ITEMS = 20;

const statusBadgeColors: Record<string, string> = {
  compliant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  non_compliant: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface LiveActivityFeedProps {
  latestActivity: ActivityUpdate | null;
  isConnected: boolean;
}

function LiveActivityFeed({ latestActivity, isConnected }: LiveActivityFeedProps) {
  const [items, setItems] = useState<ActivityUpdate[]>([]);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const prevActivityRef = useRef<ActivityUpdate | null>(null);

  useEffect(() => {
    if (latestActivity && latestActivity !== prevActivityRef.current) {
      prevActivityRef.current = latestActivity;
      setNewItemId(latestActivity.id);
      setItems((prev) => {
        const next = [latestActivity, ...prev];
        return next.slice(0, MAX_ITEMS);
      });

      // Clear animation class after animation completes
      const timer = setTimeout(() => setNewItemId(null), 600);
      return () => clearTimeout(timer);
    }
  }, [latestActivity]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Live Activity Feed
        </h3>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              Live
            </span>
          )}
          {!isConnected && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-gray-400" />
              Offline
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-center py-8 text-sm">
          {isConnected ? 'Waiting for live events...' : 'Connect to see live activity'}
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-md border border-gray-100 dark:border-gray-700/50 transition-all duration-500 ${
                newItemId === item.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 animate-fade-in-down'
                  : 'bg-gray-50 dark:bg-gray-900/20'
              }`}
            >
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5 font-mono">
                {formatTimestamp(item.timestamp)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {item.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      statusBadgeColors[item.status] ||
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LiveActivityFeed;
