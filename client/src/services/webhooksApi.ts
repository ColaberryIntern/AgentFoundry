import api from './api';

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  description: string | null;
  failureCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  success: boolean;
  attempt: number;
  error: string | null;
  duration: number | null;
  createdAt: string;
}

export interface CreateWebhookPayload {
  url: string;
  events: string[];
  description?: string;
}

export interface UpdateWebhookPayload {
  url?: string;
  events?: string[];
  description?: string;
  isActive?: boolean;
}

export interface WebhooksListResponse {
  webhooks: Webhook[];
  total: number;
  page: number;
  limit: number;
}

export interface WebhookLogsResponse {
  logs: WebhookLog[];
  total: number;
  page: number;
  limit: number;
}

export interface WebhookTestResponse {
  message: string;
  log: WebhookLog;
}

export const webhooksApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<WebhooksListResponse>('/webhooks', { params }),
  get: (id: string) => api.get<Webhook>(`/webhooks/${id}`),
  create: (data: CreateWebhookPayload) => api.post<Webhook>('/webhooks', data),
  update: (id: string, data: UpdateWebhookPayload) => api.put<Webhook>(`/webhooks/${id}`, data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  getLogs: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<WebhookLogsResponse>(`/webhooks/${id}/logs`, { params }),
  test: (id: string) => api.post<WebhookTestResponse>(`/webhooks/${id}/test`),
};
