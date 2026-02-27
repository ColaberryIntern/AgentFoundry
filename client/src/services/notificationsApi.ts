import api from './api';

export interface Notification {
  id: string;
  userId: string;
  type: 'compliance_alert' | 'report_ready' | 'system' | 'role_change';
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<NotificationsListResponse>('/notifications', { params }),
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put<{ updated: number }>('/notifications/read-all'),
};
