import api from './api';
import type {
  ReportTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TemplatesListResponse,
} from '../types/reports';

export const templatesApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<TemplatesListResponse>('/reports/templates', { params }),
  get: (id: string) => api.get<ReportTemplate>(`/reports/templates/${id}`),
  create: (data: CreateTemplatePayload) => api.post<ReportTemplate>('/reports/templates', data),
  update: (id: string, data: UpdateTemplatePayload) =>
    api.put<ReportTemplate>(`/reports/templates/${id}`, data),
  delete: (id: string) => api.delete(`/reports/templates/${id}`),
};
