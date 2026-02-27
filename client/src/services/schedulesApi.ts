import api from './api';
import type {
  ScheduledReport,
  CreateSchedulePayload,
  UpdateSchedulePayload,
  SchedulesListResponse,
} from '../types/reports';

export const schedulesApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<SchedulesListResponse>('/reports/schedules', { params }),
  get: (id: string) => api.get<ScheduledReport>(`/reports/schedules/${id}`),
  create: (data: CreateSchedulePayload) => api.post<ScheduledReport>('/reports/schedules', data),
  update: (id: string, data: UpdateSchedulePayload) =>
    api.put<ScheduledReport>(`/reports/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/reports/schedules/${id}`),
};
