import api from './api';

export interface Report {
  id: string;
  userId: string;
  reportType: 'compliance_summary' | 'risk_assessment' | 'audit_trail' | 'regulatory_status';
  parameters: Record<string, unknown>;
  format: 'pdf' | 'csv';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportPayload {
  reportType: string;
  format: string;
  parameters?: Record<string, unknown>;
}

export interface ReportsListResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
}

export const reportsApi = {
  create: (data: CreateReportPayload) => api.post<Report>('/reports', data),
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<ReportsListResponse>('/reports', { params }),
  get: (id: string) => api.get<Report>(`/reports/${id}`),
  download: (filename: string) =>
    api.get(`/reports/download/${filename}`, { responseType: 'blob' }),
};
