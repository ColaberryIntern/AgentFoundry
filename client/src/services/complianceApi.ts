import api from './api';
import type {
  CalendarEventsResponse,
  CalendarEventResponse,
  CalendarEventCreateInput,
  CalendarEventUpdateInput,
  CalendarListParams,
  UpcomingDeadlinesResponse,
  MarketSignalsResponse,
  TaxonomyClassificationResponse,
} from '../types/compliance';

export const complianceApi = {
  // Calendar CRUD
  listCalendarEvents: (params: CalendarListParams) =>
    api.get<CalendarEventsResponse>('/compliance/calendar', { params }),

  getCalendarEvent: (id: string) => api.get<CalendarEventResponse>(`/compliance/calendar/${id}`),

  createCalendarEvent: (data: CalendarEventCreateInput) =>
    api.post<CalendarEventResponse>('/compliance/calendar', data),

  updateCalendarEvent: (id: string, data: CalendarEventUpdateInput) =>
    api.put<CalendarEventResponse>(`/compliance/calendar/${id}`, data),

  deleteCalendarEvent: (id: string) =>
    api.delete<{ message: string }>(`/compliance/calendar/${id}`),

  // Upcoming deadlines
  getUpcomingDeadlines: (userId?: string) =>
    api.get<UpcomingDeadlinesResponse>('/compliance/calendar/upcoming', {
      params: userId ? { userId } : {},
    }),

  // Market signals analysis
  analyzeMarketSignals: (industry: string, history: number[] = []) =>
    api.post<MarketSignalsResponse>('/inference/market-signals', {
      industry,
      history,
    }),

  // Taxonomy classification
  classifyRegulations: (regulations: string[]) =>
    api.post<TaxonomyClassificationResponse>('/inference/classify-regulations', {
      regulations,
    }),
};
