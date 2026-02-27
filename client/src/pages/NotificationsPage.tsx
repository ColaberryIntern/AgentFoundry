import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchNotifications,
  readNotification,
  readAllNotifications,
  fetchUnreadCount,
} from '../store/notificationsSlice';
import { sanitize } from '../utils/sanitize';
import { useAnalytics } from '../hooks/useAnalytics';

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  compliance_alert: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'Alert',
  },
  report_ready: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'Report',
  },
  system: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'System',
  },
  role_change: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    label: 'Role',
  },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationsPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { notifications, total, unreadCount, isLoading, error } = useAppSelector(
    (state) => state.notifications,
  );
  const { trackPageView } = useAnalytics();

  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    trackPageView('notifications');
  }, [trackPageView]);

  const loadNotifications = useCallback(() => {
    dispatch(fetchNotifications({ page, limit }));
  }, [dispatch, page]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      dispatch(fetchUnreadCount());
    }
  }, [user, loadNotifications, dispatch]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleMarkAsRead = (id: string) => {
    dispatch(readNotification(id));
  };

  const handleMarkAllAsRead = () => {
    dispatch(readAllNotifications());
  };

  const totalPages = Math.ceil(total / limit);

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-800 dark:text-red-400 font-medium">Failed to load notifications</p>
          <p className="text-red-600 dark:text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={loadNotifications}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 border border-primary-300 dark:border-primary-700 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-12 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="text-gray-400 dark:text-gray-500 font-medium">No notifications yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            You will see compliance alerts, report updates, and system messages here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const typeStyle = TYPE_STYLES[notification.type] || TYPE_STYLES.system;
            return (
              <div
                key={notification.id}
                onClick={() => {
                  if (!notification.isRead) handleMarkAsRead(notification.id);
                }}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4 transition-colors ${
                  !notification.isRead
                    ? 'border-l-4 border-l-primary-500 bg-primary-50/50 dark:bg-primary-900/10 cursor-pointer'
                    : ''
                }`}
              >
                <div
                  className={`flex-shrink-0 mt-0.5 px-2 py-1 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}
                >
                  {typeStyle.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-sm font-medium ${
                        notification.isRead
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {sanitize(notification.title)}
                    </h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {sanitize(notification.message)}
                  </p>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                    className="flex-shrink-0 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium whitespace-nowrap"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
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
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
