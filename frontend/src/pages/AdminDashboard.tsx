/**
 * Painel Administrativo Principal
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { 
  Building2, Users, DollarSign, Bell, MessageSquare, 
  Key, Database, ShieldCheck, TrendingUp, Mail,
  FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  CreditCard
} from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  pendingApprovals: number;
  suspendedClients: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  expiringSoon: number;
  unreadMessages: number;
  systemNotifications: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    pendingApprovals: 0,
    suspendedClients: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    expiringSoon: 0,
    unreadMessages: 0,
    systemNotifications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Acesso restrito a administradores');
      navigate('/dashboard');
      return;
    }
    loadDashboardStats();
  }, [user, navigate]);

  const loadDashboardStats = async () => {
    try {
      const response = await api.get('/admin/dashboard-stats');
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const adminCards = [
    {
      title: 'Gestão de Clientes',
      description: 'Visualizar, aprovar, bloquear e excluir escolas/empresas',
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
      path: '/schools-management',
      stat: stats.totalClients,
      statLabel: 'Total de Clientes',
      badge: stats.pendingApprovals > 0 ? stats.pendingApprovals : null,
      badgeLabel: 'Pendentes'
    },
    {
      title: 'Credenciais de Acesso',
      description: 'Gerenciar logins, senhas e permissões dos clientes',
      icon: Key,
      color: 'from-purple-500 to-purple-600',
      path: '/users-management',
      stat: stats.activeClients,
      statLabel: 'Clientes Ativos'
    },
    {
      title: 'Controle Financeiro',
      description: 'Pagamentos, faturas, cobranças e relatórios financeiros',
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      path: '/sales-management',
      stat: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`,
      statLabel: 'Receita Mensal',
      badge: stats.pendingPayments > 0 ? stats.pendingPayments : null,
      badgeLabel: 'Pendentes'
    },
    {
      title: 'Pagamentos Online',
      description: 'Transações PIX, cartão, histórico e reembolsos',
      icon: CreditCard,
      color: 'from-emerald-500 to-emerald-600',
      path: '/payments-management',
      stat: stats.pendingPayments || 0,
      statLabel: 'Pagamentos Pendentes',
      badge: stats.pendingPayments > 0 ? stats.pendingPayments : null,
      badgeLabel: 'Verificar'
    },
    {
      title: 'Licenças e Planos',
      description: 'Gerenciar planos, licenças, ativações e renovações',
      icon: ShieldCheck,
      color: 'from-orange-500 to-orange-600',
      path: '/license-management',
      stat: stats.expiringSoon,
      statLabel: 'Expirando em Breve',
      badge: stats.expiringSoon > 0 ? stats.expiringSoon : null,
      badgeLabel: 'Atenção'
    },
    {
      title: 'Backups e Dados',
      description: 'Backup automático, restauração e gestão de dados',
      icon: Database,
      color: 'from-indigo-500 to-indigo-600',
      path: '/backup-management',
      stat: 'Automático',
      statLabel: 'Status do Backup'
    },
    {
      title: 'Mensagens e Comunicação',
      description: 'Enviar avisos, notificações e mensagens aos clientes',
      icon: MessageSquare,
      color: 'from-pink-500 to-pink-600',
      path: '/live-messaging',
      stat: stats.unreadMessages,
      statLabel: 'Mensagens Não Lidas'
    },
    {
      title: 'Notificações do Sistema',
      description: 'Novos cadastros, alertas e eventos importantes',
      icon: Bell,
      color: 'from-red-500 to-red-600',
      path: '/notifications',
      stat: stats.systemNotifications,
      statLabel: 'Notificações Ativas',
      badge: stats.systemNotifications > 0 ? stats.systemNotifications : null,
      badgeLabel: 'Novas'
    },
    {
      title: 'Gestão de Vendas',
      description: 'Pipeline de vendas, leads e oportunidades',
      icon: TrendingUp,
      color: 'from-yellow-500 to-yellow-600',
      path: '/leads-management',
      stat: 'Em andamento',
      statLabel: 'Status'
    },
    {
      title: 'Planos e Precificação',
      description: 'Criar e gerenciar planos de serviço',
      icon: FileText,
      color: 'from-teal-500 to-teal-600',
      path: '/plans-management',
      stat: 'Ativos',
      statLabel: 'Planos'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 md:p-12 mb-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <ShieldCheck size={40} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                  Painel Administrativo
                </h1>
                <p className="text-blue-100 text-lg font-medium">
                  🎯 Bem-vindo, <span className="font-bold text-white">{user.name}</span>! Central de Controle Total
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-blue-100 text-xs font-medium mb-1">Clientes Online</p>
                <p className="text-2xl font-bold">{stats.activeClients}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-blue-100 text-xs font-medium mb-1">Receita Hoje</p>
                <p className="text-2xl font-bold">R$ {(stats.monthlyRevenue / 30).toFixed(0)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-blue-100 text-xs font-medium mb-1">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-blue-100 text-xs font-medium mb-1">Mensagens</p>
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview com Cards Modernos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-t-4 border-blue-500 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Building2 className="text-blue-600" size={28} />
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Clientes</p>
                <p className="text-4xl font-black text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
            {stats.pendingApprovals > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                  <Clock size={14} className="mr-1" />
                  {stats.pendingApprovals} PENDENTES
                </span>
              </div>
            )}
          </div>

          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-t-4 border-green-500 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <DollarSign className="text-green-600" size={28} />
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Receita/Mês</p>
                <p className="text-3xl font-black text-gray-900">
                  R$ {(stats.monthlyRevenue / 1000).toFixed(1)}k
                </p>
              </div>
            </div>
            {stats.pendingPayments > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-400 to-red-400 text-white">
                  <AlertTriangle size={14} className="mr-1" />
                  {stats.pendingPayments} PENDENTES
                </span>
              </div>
            )}
          </div>

          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-t-4 border-purple-500 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle className="text-purple-600" size={28} />
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Ativos</p>
                <p className="text-4xl font-black text-gray-900">{stats.activeClients}</p>
              </div>
            </div>
            {stats.suspendedClients > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-red-400 to-pink-400 text-white">
                  <XCircle size={14} className="mr-1" />
                  {stats.suspendedClients} SUSPENSOS
                </span>
              </div>
            )}
          </div>

          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-t-4 border-red-500 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="text-red-600" size={28} />
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Expirando</p>
                <p className="text-4xl font-black text-gray-900">{stats.expiringSoon}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-400 to-rose-400 text-white">
                <Clock size={14} className="mr-1" />
                PRÓXIMOS 30 DIAS
              </span>
            </div>
          </div>
        </div>

        {/* Admin Cards Grid Modernizado */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
            Módulos Administrativos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  onClick={() => navigate(card.path)}
                  className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden border border-gray-100 hover:border-transparent"
                >
                  {/* Gradient Background Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  {/* Card Content */}
                  <div className="relative z-10 p-6">
                    {/* Header com Ícone e Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`bg-gradient-to-br ${card.color} p-4 rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                        <Icon className="text-white" size={32} />
                      </div>
                      {card.badge && (
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-lg animate-pulse">
                          {card.badge} {card.badgeLabel}
                        </span>
                      )}
                    </div>
                    
                    {/* Título e Descrição */}
                    <h3 className="text-gray-900 font-black text-xl mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                      {card.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                      {card.description}
                    </p>
                    
                    {/* Estatísticas */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 group-hover:border-purple-200 transition-colors">
                      <div>
                        <p className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                          {card.stat}
                        </p>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">
                          {card.statLabel}
                        </p>
                      </div>
                      <div className="text-blue-600 group-hover:translate-x-2 group-hover:scale-125 transition-all duration-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shine Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 transform translate-x-full group-hover:-translate-x-full transition-transform duration-1000"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/schools-management')}
              className="flex items-center justify-center px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <CheckCircle className="mr-2 text-blue-600" size={20} />
              <span className="text-blue-600 font-medium">Aprovar Cadastros</span>
            </button>
            <button
              onClick={() => navigate('/sales-management')}
              className="flex items-center justify-center px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <DollarSign className="mr-2 text-green-600" size={20} />
              <span className="text-green-600 font-medium">Registrar Pagamento</span>
            </button>
            <button
              onClick={() => navigate('/live-messaging')}
              className="flex items-center justify-center px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Mail className="mr-2 text-purple-600" size={20} />
              <span className="text-purple-600 font-medium">Enviar Mensagem</span>
            </button>
            <button
              onClick={() => navigate('/backup-management')}
              className="flex items-center justify-center px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Database className="mr-2 text-indigo-600" size={20} />
              <span className="text-indigo-600 font-medium">Criar Backup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
