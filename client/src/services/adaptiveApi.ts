import api from './api';
import type { UserInteraction, AdaptivePreferences, NLSearchResult } from '../types/adaptive';

export const adaptiveApi = {
  trackInteraction: (interaction: UserInteraction) => api.post('/interactions', interaction),

  trackInteractionsBatch: (interactions: UserInteraction[]) =>
    api.post('/interactions/batch', { interactions }),

  getInteractionSummary: (userId: string) =>
    api.get<{ summary: Record<string, unknown> }>(`/interactions/summary/${userId}`),

  getAdaptivePreferences: (userId: string) =>
    api.get<{ preferences: AdaptivePreferences }>(`/adaptive/preferences/${userId}`),

  naturalLanguageSearch: (query: string) => api.post<NLSearchResult>('/search/natural', { query }),
};
