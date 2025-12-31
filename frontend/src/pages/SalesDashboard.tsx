import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Users, ShoppingCart, Calendar } from 'lucide-react';
import { saleAPI, SalesStats } from '../services/saleAPI';
import { leadAPI, LeadStats } from '../services/leadAPI';

export default function SalesDashboard() {
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesRes, leadsRes] = await Promise.all([
        saleAPI.getStats(),
        leadAPI.getStats()
      ]);
      setSalesStats(salesRes.data.data);
      setLeadStats(leadsRes.data.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      negotiating: 'bg-purple-100 text-purple-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      failed: 'Falhou',
      refunded: 'Reembolsado'
    };
    return labels[status] || status;
  };

  const getLeadStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Novo',
      contacted: 'Contatado',
      negotiating: 'Negociando',
      won: 'Ganho',
      lost: 'Perdido'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando estatísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Vendas</h1>
        <p className="mt-1 text-sm text-gray-600">
          Acompanhe suas métricas de vendas e leads
        </p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Receita Mensal</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(salesStats?.monthlyRevenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(salesStats?.totalRevenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Leads</p>
              <p className="text-2xl font-bold text-gray-900">
                {leadStats.reduce((sum, stat) => sum + Number(stat.count), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Vendas Pagas</p>
              <p className="text-2xl font-bold text-gray-900">
                {salesStats?.revenueByStatus.find(s => s.paymentStatus === 'paid')?.count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita por Status de Pagamento */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Receita por Status de Pagamento
            </h3>
            <div className="space-y-3">
              {salesStats?.revenueByStatus.map((stat) => (
                <div key={stat.paymentStatus} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(stat.paymentStatus)}`}>
                      {getPaymentStatusLabel(stat.paymentStatus)}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">
                      {stat.count} {stat.count === 1 ? 'venda' : 'vendas'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(Number(stat.totalAmount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leads por Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Leads por Status
            </h3>
            <div className="space-y-3">
              {leadStats.map((stat) => (
                <div key={stat.status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(stat.status)}`}>
                      {getLeadStatusLabel(stat.status)}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">
                      {stat.count} {stat.count === 1 ? 'lead' : 'leads'}
                    </span>
                  </div>
                  {stat.totalValue > 0 && (
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(Number(stat.totalValue))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Receita por Mês */}
      {salesStats && salesStats.revenueByMonth.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Receita dos Últimos 6 Meses
            </h3>
            <div className="space-y-3">
              {salesStats.revenueByMonth.map((stat) => (
                <div key={stat.month} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 w-20">
                      {new Date(stat.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </span>
                    <div className="ml-4 flex-1">
                      <div className="bg-blue-100 rounded-full h-6 relative" style={{ width: '100%', maxWidth: '400px' }}>
                        <div 
                          className="bg-blue-600 rounded-full h-6 flex items-center justify-end pr-2"
                          style={{ 
                            width: `${(Number(stat.totalAmount) / Math.max(...salesStats.revenueByMonth.map(s => Number(s.totalAmount)))) * 100}%`,
                            minWidth: '60px'
                          }}
                        >
                          <span className="text-xs font-medium text-white">
                            {stat.count} {stat.count === 1 ? 'venda' : 'vendas'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 ml-4">
                    {formatCurrency(Number(stat.totalAmount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-sm text-gray-500 py-4">
        © 2025 Wander Pires Silva Coelho (wanderpsc@gmail.com)
      </div>
    </div>
  );
}
