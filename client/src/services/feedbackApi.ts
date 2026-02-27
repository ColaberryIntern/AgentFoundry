import api from './api';

export interface FeedbackPayload {
  category: 'bug' | 'feature_request' | 'usability' | 'performance' | 'other';
  message: string;
  rating?: number;
  page?: string;
}

export interface Feedback {
  id: string;
  userId: string;
  category: string;
  message: string;
  rating: number | null;
  page: string | null;
  createdAt: string;
}

export const feedbackApi = {
  submit: (data: FeedbackPayload) => api.post<Feedback>('/feedback', data),
};
