import api from './api';

export interface SearchResult {
  id: string;
  type: 'compliance' | 'reports';
  title: string;
  description: string;
  status: string;
  createdAt: string;
  matchScore: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: string;
}

export interface SearchParams {
  q: string;
  type?: 'compliance' | 'reports' | 'all';
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const searchApi = {
  search: (params: SearchParams) => api.get<SearchResponse>('/search', { params }),
  suggestions: (q: string) =>
    api.get<{ suggestions: string[] }>('/search/suggestions', { params: { q } }),
  history: () =>
    api.get<{ history: Array<{ query: string; resultCount: number; createdAt: string }> }>(
      '/search/history',
    ),
};
