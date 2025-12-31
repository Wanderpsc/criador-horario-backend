/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 * Painel de Gerenciamento de Backups
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  HardDrive,
  Calendar,
  User,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface Backup {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    schoolName: string;
  };
  schoolName: string;
  fileName: string;
  filePath: string;
  size: number;
  sizeFormatted: string;
  type: 'automatic' | 'manual';
  status: 'pending' | 'completed' | 'failed' | 'restored';
  createdAt: string;
  restoredAt?: string;
  restoredBy?: {
    name: string;
    email: string;
  };
  error?: string;
  metadata?: {
    loginCount?: number;
    collections?: string[];
    documentsCount?: number;
  };
}

interface Statistics {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  totalSize: number;
  totalSizeFormatted: string;
  recentBackups: Backup[];
}

const BackupManagement: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadBackups();
    loadStatistics();
  }, [filterStatus]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await api.get('/backups', { params });
      setBackups(response.data.backups);
    } catch (error: any) {
      toast.error('Erro ao carregar backups');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get('/backups/statistics');
      setStatistics(response.data.statistics);
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação irá SOBRESCREVER todos os dados atuais do sistema com os dados do backup selecionado.\n\nDeseja continuar?')) {
      return;
    }

    try {
      setActionLoading(backupId);
      await api.post(`/backups/restore/${backupId}`);
      toast.success('Backup restaurado com sucesso!');
      loadBackups();
      loadStatistics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao restaurar backup');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!confirm('Tem certeza que deseja deletar este backup? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setActionLoading(backupId);
      await api.delete(`/backups/${backupId}`);
      toast.success('Backup deletado com sucesso');
      loadBackups();
      loadStatistics();
    } catch (error: any) {
      toast.error('Erro ao deletar backup');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateManual = async () => {
    try {
      setActionLoading('manual');
      await api.post('/backups/manual');
      toast.success('Backup manual iniciado! Aguarde alguns instantes...');
      setTimeout(() => {
        loadBackups();
        loadStatistics();
      }, 5000);
    } catch (error: any) {
      toast.error('Erro ao criar backup manual');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'restored':
        return <RotateCcw className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      restored: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    const labels = {
      completed: 'Concluído',
      failed: 'Falhou',
      pending: 'Processando',
      restored: 'Restaurado',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-lg text-gray-600">Carregando backups...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-10 w-10" />
              <h1 className="text-4xl font-black">Gerenciamento de Backups</h1>
            </div>
            <p className="text-blue-100 text-lg">
              Sistema automático de proteção de dados dos clientes
            </p>
          </div>
          <button
            onClick={handleCreateManual}
            disabled={actionLoading === 'manual'}
            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
          >
            {actionLoading === 'manual' ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            Criar Backup Manual
          </button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-white" />
                <div>
                  <p className="text-white/80 text-sm">Total</p>
                  <p className="text-2xl font-black">{statistics.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-300" />
                <div>
                  <p className="text-white/80 text-sm">Concluídos</p>
                  <p className="text-2xl font-black">{statistics.completed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-300" />
                <div>
                  <p className="text-white/80 text-sm">Pendentes</p>
                  <p className="text-2xl font-black">{statistics.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-300" />
                <div>
                  <p className="text-white/80 text-sm">Falhas</p>
                  <p className="text-2xl font-black">{statistics.failed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <HardDrive className="h-8 w-8 text-purple-300" />
                <div>
                  <p className="text-white/80 text-sm">Espaço</p>
                  <p className="text-2xl font-black">{statistics.totalSizeFormatted}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-semibold">Filtrar por status:</span>
          <div className="flex gap-2">
            {['all', 'completed', 'pending', 'failed', 'restored'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todos' : status === 'completed' ? 'Concluídos' : status === 'pending' ? 'Pendentes' : status === 'failed' ? 'Falhas' : 'Restaurados'}
              </button>
            ))}
          </div>
          <button
            onClick={loadBackups}
            className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {backups.length === 0 ? (
          <div className="text-center py-12">
            <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum backup encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente / Escola
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamanho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup._id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(backup.status)}
                        {getStatusBadge(backup.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{backup.schoolName}</p>
                          <p className="text-xs text-gray-500">{backup.userId.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(backup.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <HardDrive className="h-4 w-4 text-gray-400" />
                        {backup.sizeFormatted}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        backup.type === 'automatic' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {backup.type === 'automatic' ? '🤖 Automático' : '👤 Manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {backup.status === 'completed' && (
                          <button
                            onClick={() => handleRestore(backup._id)}
                            disabled={actionLoading === backup._id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-1"
                            title="Restaurar backup"
                          >
                            {actionLoading === backup._id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Restaurar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(backup._id)}
                          disabled={actionLoading === backup._id}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-1"
                          title="Deletar backup"
                        >
                          <Trash2 className="h-4 w-4" />
                          Deletar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              ℹ️ Sistema de Backup Automático
            </h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>✅ Backups automáticos são criados a cada login do cliente</li>
              <li>✅ Mantemos os últimos 5 backups de cada cliente automaticamente</li>
              <li>✅ Você pode criar backups manuais quando necessário</li>
              <li>✅ A restauração sobrescreve TODOS os dados do sistema</li>
              <li>⚠️ Certifique-se de ter certeza antes de restaurar um backup</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManagement;
