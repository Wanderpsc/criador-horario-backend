import api from './api';

export interface Sale {
  id: string;
  _id?: string;
  schoolId: string;
  planId?: string;
  amount: number;
  paymentMethod: 'credit_card' | 'debit_card' | 'boleto' | 'pix' | 'bank_transfer' | 'other';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  saleDate: string;
  notes?: string;
  invoiceNumber?: string;
  createdBy?: string;
  school?: {
    id: string;
    name: string;
    email: string;
  };
  plan?: {
    id: string;
    name: string;
    monthlyPrice?: number;
    yearlyPrice?: number;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  // Campos do backend Payment
  schoolName?: string;
  schoolEmail?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  createdAt?: string;
  updatedAt?: string;
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
    api.get<{ data: Sale[] }>('/payments/admin/all', { params }),
  getById: (id: string) => api.get<{ data: Sale }>(`/payments/${id}`),
  getStats: () => api.get<{ data: SalesStats }>('/admin/dashboard-stats'),
  create: (data: CreateSaleData) => api.post<{ data: Sale }>('/payments', data),
  update: (id: string, data: CreateSaleData) => api.put<{ data: Sale }>(`/payments/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/payments/${id}`)
};
