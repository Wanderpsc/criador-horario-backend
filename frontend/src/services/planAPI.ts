import api from './api';

export interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxSchools: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanData {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxSchools: number;
  features: string[];
  isActive?: boolean;
}

export const planAPI = {
  getAll: () => api.get<{ data: Plan[] }>('/plans'),
  getActive: () => api.get<{ data: Plan[] }>('/plans/active'),
  getById: (id: string) => api.get<{ data: Plan }>(`/plans/${id}`),
  create: (data: CreatePlanData) => api.post<{ data: Plan }>('/plans', data),
  update: (id: string, data: CreatePlanData) => api.put<{ data: Plan }>(`/plans/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/plans/${id}`)
};
