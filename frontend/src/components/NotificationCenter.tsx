/**
 * Centro de Notificações
 * © 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com
 */

import { useEffect, useState } from 'react';
import { Bell, X, Check, AlertTriangle, Info, DollarSign, FileText, Zap } from 'lucide-react';
import api from '../lib/axios';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  userId: string;
  type: 'system' | 'payment' | 'license' | 'invoice' | 'update';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    loadNotifications();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const data = response.data.data || [];
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    } catch (error: any) {
      // Silenciar erros de conexão para não spammar o console
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ERR_CONNECTION_CLOSED') {
        console.error('Erro ao carregar notificações:', error);
      }
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!notificationId || notificationId === 'undefined') {
      console.error('❌ ID de notificação inválido:', notificationId);
      return;
    }
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar notificações');
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!notificationId || notificationId === 'undefined') {
      console.error('❌ ID de notificação inválido:', notificationId);
      toast.error('Erro: ID de notificação inválido');
      return;
    }
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast.success('Notificação removida');
    } catch (error) {
      toast.error('Erro ao remover notificação');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return DollarSign;
      case 'license': return AlertTriangle;
      case 'invoice': return FileText;
      case 'update': return Zap;
      default: return Info;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'from-red-500 to-pink-500';
      case 'high': return 'from-orange-500 to-yellow-500';
      case 'medium': return 'from-blue-500 to-purple-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl hover:bg-white/10 text-white transition-all group"
      >
        <Bell size={24} className="group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse border-2 border-primary-700">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 max-h-[600px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell size={20} />
                  <h3 className="font-bold text-lg">Notificações</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                >
                  ✓ Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[500px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Nenhuma notificação</p>
                  <p className="text-sm">Você está em dia! 🎉</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications
                    .filter(n => n._id) // Filtrar apenas notificações com ID válido
                    .map((notification) => {
                    const Icon = getIcon(notification.type);
                    return (
                      <div
                        key={notification._id}
                        className={`p-4 transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${getPriorityColor(notification.priority)} flex items-center justify-center`}>
                            <Icon className="text-white" size={20} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-bold text-sm text-gray-900 truncate">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {notification.message}
                            </p>

                            {/* Priority Badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-bold ${getPriorityBadge(notification.priority)}`}>
                                {notification.priority.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification._id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Check size={14} />
                                  Marcar como lida
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notification._id)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors"
                              >
                                Apagar
                              </button>
                              {notification.actionUrl && (
                                <a
                                  href={notification.actionUrl}
                                  className="text-xs text-purple-600 hover:text-purple-700 font-medium px-2 py-1 hover:bg-purple-50 rounded transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Ver detalhes →
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedNotification(notification)}
                                className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 hover:bg-gray-100 rounded transition-colors ml-auto"
                              >
                                Ler completo →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedNotification(null)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${getPriorityColor(selectedNotification.priority)} p-6 text-white`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    {(() => {
                      const Icon = getIcon(selectedNotification.type);
                      return <Icon className="text-white" size={24} />;
                    })()}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-1">
                      {selectedNotification.title}
                    </h3>
                    <p className="text-sm opacity-90">
                      {new Date(selectedNotification.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              {selectedNotification.metadata && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-sm text-gray-900 mb-2">Informações Adicionais</h4>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(selectedNotification.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center gap-3 justify-end">
                {selectedNotification.actionUrl && (
                  <a
                    href={selectedNotification.actionUrl}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Ver detalhes
                  </a>
                )}
                {!selectedNotification.read && (
                  <button
                    onClick={async () => {
                      await markAsRead(selectedNotification._id);
                      setSelectedNotification(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Check size={18} />
                    Marcar como lida
                  </button>
                )}
                <button
                  onClick={async () => {
                    await deleteNotification(selectedNotification._id);
                    setSelectedNotification(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
