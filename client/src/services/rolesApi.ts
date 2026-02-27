import api from './api';
import type { User } from './authApi';

export interface Role {
  name: string;
  permissions: string[];
}

export interface UserWithPermissions {
  userId: number;
  role: string;
  permissions: string[];
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export const rolesApi = {
  listRoles: () => api.get<{ roles: Role[] }>('/roles'),

  listUsers: (page = 1, limit = 20) =>
    api.get<PaginatedUsers>('/roles/users', { params: { page, limit } }),

  getUserPermissions: (userId: number) => api.get<UserWithPermissions>(`/roles/users/${userId}`),

  assignRole: (userId: number, role: string) =>
    api.put<{ user: User; message: string }>(`/roles/users/${userId}`, { role }),
};
