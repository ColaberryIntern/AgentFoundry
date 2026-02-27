import api from './api';

export const analyticsApi = {
  trackEvent: (eventType: string, eventData?: Record<string, unknown>) =>
    api.post('/analytics/event', { eventType, eventData }),
  trackBatch: (events: Array<{ eventType: string; eventData?: Record<string, unknown> }>) =>
    api.post('/analytics/events', { events }),
};
