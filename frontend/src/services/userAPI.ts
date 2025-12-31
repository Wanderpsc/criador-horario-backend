import api from './api';

export interface User {
  id: string;
  schoolId?: string;
  email: string;
  name: string;
  role: 'admin' | 'school';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  school?: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    licenseKey?: string;
    licenseExpiry?: string;
    createdAt: string;
  };
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  schoolUsers: number;
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
}

export const userAPI = {
  getAll: () => api.get<{ data: User[] }>('/admin/users'),
  getById: (id: string) => api.get<{ data: User }>(`/admin/users/${id}`),
  getStats: () => api.get<{ data: UserStats }>('/admin/users/stats'),
  update: (id: string, data: { name?: string; email?: string; isActive?: boolean }) => 
    api.put<{ data: User }>(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/admin/users/${id}`)
};
