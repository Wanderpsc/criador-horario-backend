import api from './api';

export interface Sale {
  id: string;
  schoolId: string;
  planId?: string;
  amount: number;
  paymentMethod: 'credit_card' | 'debit_card' | 'boleto' | 'pix' | 'bank_transfer' | 'other';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  saleDate: string;
  notes?: string;
  invoiceNumber?: string;
  createdBy: string;
  school?: {
    id: string;
    name: string;
    email: string;
  };
  plan?: {
    id: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSaleData {
  schoolId: string;
  planId?: string;
  amount: number;
  paymentMethod: 'credit_card' | 'debit_card' | 'boleto' | 'pix' | 'bank_transfer' | 'other';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  saleDate?: string;
  notes?: string;
  invoiceNumber?: string;
}

export interface SalesStats {
  monthlyRevenue: number;
  totalRevenue: number;
  revenueByStatus: Array<{
    paymentStatus: string;
    count: number;
    totalAmount: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    totalAmount: number;
    count: number;
  }>;
}

export const saleAPI = {
  getAll: (params?: { startDate?: string; endDate?: string; paymentStatus?: string; schoolId?: string }) => 
    api.get<{ data: Sale[] }>('/sales', { params }),
  getById: (id: string) => api.get<{ data: Sale }>(`/sales/${id}`),
  getStats: () => api.get<{ data: SalesStats }>('/sales/stats'),
  create: (data: CreateSaleData) => api.post<{ data: Sale }>('/sales', data),
  update: (id: string, data: CreateSaleData) => api.put<{ data: Sale }>(`/sales/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/sales/${id}`)
};
