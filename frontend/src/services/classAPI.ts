import api from './api';

export interface Class {
  id: string;
  schoolId: string;
  gradeId: string;
  name: string;
  shift: 'morning' | 'afternoon' | 'evening' | 'full';
  capacity?: number;
  subjectIds?: string[];
  subjectWeeklyHours?: { [subjectId: string]: number };
  subjects?: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  grade?: {
    id: string;
    name: string;
    level: string;
  };
}

export const classAPI = {
  getAll: () => api.get<{ data: Class[] }>('/classes'),
  getById: (id: string) => api.get<{ data: Class }>(`/classes/${id}`),
  create: (data: { gradeId: string; name: string; shift: string; capacity?: number }) =>
    api.post<{ data: Class }>('/classes', data),
  update: (id: string, data: Partial<Class>) =>
    api.put<{ data: Class }>(`/classes/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/classes/${id}`)
};
