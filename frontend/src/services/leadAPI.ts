import api from './api';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'new' | 'contacted' | 'negotiating' | 'won' | 'lost';
  notes?: string;
  source?: string;
  estimatedValue?: number;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status?: 'new' | 'contacted' | 'negotiating' | 'won' | 'lost';
  notes?: string;
  source?: string;
  estimatedValue?: number;
}

export interface LeadStats {
  status: string;
  count: number;
  totalValue: number;
}

export const leadAPI = {
  getAll: (status?: string) => {
    const params = status ? { status } : {};
    return api.get<{ data: Lead[] }>('/leads', { params });
  },
  getById: (id: string) => api.get<{ data: Lead }>(`/leads/${id}`),
  getStats: () => api.get<{ data: LeadStats[] }>('/leads/stats'),
  create: (data: CreateLeadData) => api.post<{ data: Lead }>('/leads', data),
  update: (id: string, data: CreateLeadData) => api.put<{ data: Lead }>(`/leads/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/leads/${id}`)
};
