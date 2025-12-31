import api from './api';

export interface Grade {
  id: string;
  schoolId: string;
  name: string;
  level: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const gradeAPI = {
  getAll: () => api.get<{ data: Grade[] }>('/grades'),
  getById: (id: string) => api.get<{ data: Grade }>(`/grades/${id}`),
  create: (data: { name: string; level: string; order?: number }) =>
    api.post<{ data: Grade }>('/grades', data),
  update: (id: string, data: Partial<Grade>) =>
    api.put<{ data: Grade }>(`/grades/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/grades/${id}`)
};
