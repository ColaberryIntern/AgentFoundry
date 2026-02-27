import api from './api';

export interface User {
  id: number;
  email: string;
  role: 'c_suite' | 'compliance_officer' | 'it_admin';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role?: 'c_suite' | 'compliance_officer' | 'it_admin';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterPayload) => api.post<AuthResponse>('/users/register', data),

  login: (data: LoginPayload) => api.post<AuthResponse>('/users/login', data),

  refreshToken: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>('/users/refresh-token', {
      refreshToken,
    }),

  getProfile: () => api.get<{ user: User }>('/users/profile'),
};
