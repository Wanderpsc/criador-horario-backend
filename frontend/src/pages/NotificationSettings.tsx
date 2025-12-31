import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { Bell, MessageSquare, Clock, Save, RefreshCw, Smartphone, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface NotificationConfig {
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  messageTemplate: string;
  sendToWhatsApp: boolean;
  sendToSMS: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  whatsappEnabled: boolean;
}

interface Notification {
  _id: string;
  type: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduledFor?: string;
  sentAt?: string;
  errorMessage?: string;
  metadata?: {
    className?: string;
    subjectName?: string;
  };
  createdAt: string;
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm<NotificationConfig>({
    defaultValues: {
      reminderEnabled: true,
      reminderMinutesBefore: 15,
      sendToWhatsApp: true,
      sendToSMS: false,
      whatsappEnabled: false,
    },
  });

  const reminderEnabled = watch('reminderEnabled');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/config');
      reset(response.data.data);
    } catch (error: any) {
      toast.error('Erro ao carregar configurações');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const onSubmit = async (data: NotificationConfig) => {
    try {
      setSaving(true);
      await api.put('/notifications/config', data);
      toast.success('✅ Configurações salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReminders = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/notifications/generate-reminders');
      const count = response.data.data.count;
      
      if (count > 0) {
        toast.success(`✅ ${count} lembretes gerados com sucesso!`);
      } else {
        toast('ℹ️ Nenhum lembrete gerado. Verifique se há horários cadastrados e professores com telefone.');
      }
      
      await loadNotifications();
    } catch (error: any) {
      toast.error('Erro ao gerar lembretes');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const testPhone = prompt('Digite o número de telefone para teste (com DDD):');
      if (!testPhone) return;

      await api.post('/notifications', {
        type: 'general_announcement',
        recipientType: 'teacher',
        recipientPhone: testPhone,
        recipientName: 'Teste',
        message: 'Esta é uma mensagem de teste do Sistema de Horários. Se você recebeu esta mensagem, o sistema está funcionando corretamente!',
        status: 'pending',
        scheduledFor: new Date(),
      });

      toast.success('✅ Notificação de teste criada! (Envio em modo simulação)');
    } catch (error) {
      toast.error('Erro ao criar notificação de teste');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">Enviada</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">Pendente</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">Falhou</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">Cancelada</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="text-primary-600" />
            Notificações e Lembretes
          </h1>
          <p className="text-gray-600 mt-2">
            Configure lembretes automáticos para professores
          </p>
        </div>
        <button
          onClick={() => {
            setShowNotifications(!showNotifications);
            if (!showNotifications) loadNotifications();
          }}
          className="btn-secondary"
        >
          <MessageSquare size={20} />
          {showNotifications ? 'Ocultar' : 'Ver'} Histórico
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Configuração */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
            {/* Ativar Lembretes */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  {...register('reminderEnabled')}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Ativar Lembretes Automáticos</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enviar lembretes para professores antes das aulas começarem
                  </p>
                </div>
              </div>
            </div>

            {/* Antecedência */}
            <div className={!reminderEnabled ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-medium mb-2">
                <Clock className="inline mr-2" size={18} />
                Enviar com Antecedência (minutos)
              </label>
              <input
                type="number"
                {...register('reminderMinutesBefore', { min: 5, max: 60 })}
                className="input"
                placeholder="15"
              />
              <p className="text-sm text-gray-500 mt-1">
                Recomendado: 10 a 15 minutos antes da aula
              </p>
            </div>

            {/* Template de Mensagem */}
            <div className={!reminderEnabled ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-medium mb-2">
                <MessageSquare className="inline mr-2" size={18} />
                Template da Mensagem
              </label>
              <textarea
                {...register('messageTemplate')}
                rows={4}
                className="input"
                placeholder="Olá {{teacherName}}! Sua aula de {{subjectName}} na turma {{className}} começa em {{minutes}} minutos."
              />
              <p className="text-sm text-gray-500 mt-1">
                Variáveis disponíveis: {'{{teacherName}}'}, {'{{subjectName}}'}, {'{{className}}'}, {'{{minutes}}'}, {'{{startTime}}'}, {'{{period}}'}
              </p>
            </div>

            {/* Métodos de Envio */}
            <div className={!reminderEnabled ? 'opacity-50 pointer-events-none' : ''}>
              <h3 className="font-bold mb-3">Métodos de Envio</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('sendToWhatsApp')}
                    className="w-5 h-5"
                  />
                  <Smartphone size={20} className="text-green-600" />
                  <div>
                    <span className="font-semibold">WhatsApp</span>
                    <p className="text-sm text-gray-500">Enviar via WhatsApp Business API</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('sendToSMS')}
                    className="w-5 h-5"
                  />
                  <MessageSquare size={20} className="text-blue-600" />
                  <div>
                    <span className="font-semibold">SMS</span>
                    <p className="text-sm text-gray-500">Enviar via SMS (Twilio)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Configuração Twilio (Opcional) */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <h3 className="font-bold mb-2">⚙️ Configuração Twilio (Opcional)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Para envio real de mensagens, configure suas credenciais Twilio
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  {...register('twilioAccountSid')}
                  placeholder="Account SID"
                  className="input text-sm"
                />
                <input
                  type="password"
                  {...register('twilioAuthToken')}
                  placeholder="Auth Token"
                  className="input text-sm"
                />
                <input
                  type="text"
                  {...register('twilioPhoneNumber')}
                  placeholder="Número Twilio (ex: +5511999999999)"
                  className="input text-sm"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1"
              >
                <Save size={20} />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>

        {/* Ações Rápidas */}
        <div className="space-y-4">
          {/* Gerar Lembretes */}
          <div className="card">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <RefreshCw size={20} />
              Ações Rápidas
            </h3>
            
            <button
              onClick={handleGenerateReminders}
              disabled={generating}
              className="btn-primary w-full mb-3"
            >
              <Bell size={20} />
              {generating ? 'Gerando...' : 'Gerar Lembretes'}
            </button>

            <button
              onClick={handleTestNotification}
              className="btn-secondary w-full"
            >
              <Send size={20} />
              Enviar Teste
            </button>

            <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
              <p className="font-semibold mb-1">ℹ️ Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Lembretes são gerados baseados no horário atual</li>
                <li>Professores devem ter telefone cadastrado</li>
                <li>Envio é automático no horário agendado</li>
                <li>Modo atual: <strong>Simulação</strong></li>
              </ul>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="card">
            <h3 className="font-bold text-lg mb-3">📊 Estatísticas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total enviadas:</span>
                <span className="font-semibold">{notifications.filter(n => n.status === 'sent').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pendentes:</span>
                <span className="font-semibold">{notifications.filter(n => n.status === 'pending').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Falharam:</span>
                <span className="font-semibold text-red-600">{notifications.filter(n => n.status === 'failed').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Notificações */}
      {showNotifications && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Histórico de Notificações</h2>
          
          {notifications.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhuma notificação registrada ainda
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinatário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensagem</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <tr key={notification._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(notification.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-semibold">{notification.recipientName}</div>
                          {notification.metadata?.subjectName && (
                            <div className="text-xs text-gray-500">
                              {notification.metadata.subjectName} - {notification.metadata.className}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {notification.recipientPhone}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md truncate text-sm">
                          {notification.message}
                        </div>
                        {notification.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">
                            {notification.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {notification.sentAt
                          ? new Date(notification.sentAt).toLocaleString('pt-BR')
                          : new Date(notification.createdAt).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
