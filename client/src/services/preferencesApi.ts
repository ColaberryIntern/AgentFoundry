import api from './api';

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  layoutPreferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const preferencesApi = {
  get: () => api.get<UserPreferences>('/users/preferences'),
  update: (data: { theme?: string; layoutPreferences?: Record<string, unknown> }) =>
    api.put<UserPreferences>('/users/preferences', data),
};
