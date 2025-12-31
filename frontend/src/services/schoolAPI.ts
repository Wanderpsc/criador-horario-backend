import api from './api';

export interface School {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  logo?: string;
  licenseKey?: string;
  licenseExpiry?: Date;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const schoolAPI = {
  getAll: () => api.get<{ data: School[] }>('/schools'),
  getById: (id: string) => api.get<{ data: School }>(`/schools/${id}`)
};
