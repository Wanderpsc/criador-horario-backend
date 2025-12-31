/**
 * Tela de Configuração do WhatsApp Business
 * 
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 */

import React, { useState, useEffect } from 'react';
import api from '../lib/axios';

interface WhatsAppConfig {
  isEnabled: boolean;
  phoneNumberId: string;
  businessPhoneNumber: string;
  displayPhoneNumber?: string;
  apiVersion: string;
  verifiedAt?: string;
  lastTestedAt?: string;
  testStatus?: 'success' | 'failed';
  testMessage?: string;
  messagesSent: number;
  messagesFailed: number;
  lastMessageAt?: string;
  hasToken: boolean;
}

const WhatsAppSettings: React.FC = () => {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Formulário
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState('');
  const [showToken, setShowToken] = useState(false);
  
  // Estado
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/whatsapp/config');
      if (response.data.success && response.data.data) {
        const cfg = response.data.data;
        setConfig(cfg);
        setPhoneNumberId(cfg.phoneNumberId || '');
        setBusinessPhoneNumber(cfg.businessPhoneNumber || '');
      }
    } catch (error: any) {
      console.error('Erro ao carregar config:', error);
      showMessage('Erro ao carregar configuração', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessToken || !phoneNumberId || !businessPhoneNumber) {
      showMessage('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/whatsapp/config', {
        accessToken,
        phoneNumberId,
        businessPhoneNumber,
      });

      if (response.data.success) {
        showMessage('Configuração salva com sucesso!', 'success');
        await loadConfig();
        setAccessToken(''); // Limpar token por segurança
      }
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      showMessage(error.response?.data?.message || 'Erro ao salvar configuração', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await api.post('/whatsapp/test');
      
      if (response.data.success) {
        showMessage(`✅ Conexão bem-sucedida! Número: ${response.data.phoneNumber}`, 'success');
        await loadConfig();
      } else {
        showMessage(`❌ Falha: ${response.data.message}`, 'error');
      }
    } catch (error: any) {
      console.error('Erro ao testar:', error);
      showMessage(error.response?.data?.message || 'Erro ao testar conexão', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleToggle = async () => {
    try {
      const newState = !config?.isEnabled;
      const response = await api.put('/whatsapp/toggle', { enabled: newState });
      
      if (response.data.success) {
        showMessage(`WhatsApp ${newState ? 'ativado' : 'desativado'}`, 'success');
        await loadConfig();
      }
    } catch (error: any) {
      console.error('Erro ao alternar:', error);
      showMessage(error.response?.data?.message || 'Erro ao alternar estado', 'error');
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  const successRate = config && (config.messagesSent + config.messagesFailed > 0)
    ? ((config.messagesSent / (config.messagesSent + config.messagesFailed)) * 100).toFixed(1)
    : '0';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              📱 Configuração do WhatsApp Business
            </h1>
            <p className="text-gray-600 mt-1">
              Configure as credenciais da Meta Cloud API oficial
            </p>
          </div>
          
          {config?.hasToken && (
            <button
              onClick={handleToggle}
              className={`px-4 py-2 rounded font-medium transition ${
                config.isEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {config.isEnabled ? '🔴 Desativar' : '🟢 Ativar'}
            </button>
          )}
        </div>

        {/* Mensagem de status */}
        {message && (
          <div className={`mb-6 p-4 rounded ${
            messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* Status atual */}
        {config?.hasToken && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="font-semibold text-gray-700 mb-3">📊 Status Atual</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className={`font-semibold ${config.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {config.isEnabled ? '✅ Ativo' : '⭕ Inativo'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Número</div>
                <div className="font-semibold text-gray-800">
                  {config.displayPhoneNumber || config.businessPhoneNumber}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Mensagens Enviadas</div>
                <div className="font-semibold text-blue-600">{config.messagesSent}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Taxa de Sucesso</div>
                <div className="font-semibold text-green-600">{successRate}%</div>
              </div>
            </div>
            
            {config.lastTestedAt && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600">Último teste:</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={config.testStatus === 'success' ? 'text-green-600' : 'text-red-600'}>
                    {config.testStatus === 'success' ? '✅' : '❌'}
                  </span>
                  <span className="text-sm text-gray-700">{config.testMessage}</span>
                  <span className="text-xs text-gray-500">
                    ({new Date(config.lastTestedAt).toLocaleString('pt-BR')})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulário de configuração */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Importante</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Cada escola deve ter sua própria conta Meta for Developers</li>
              <li>• Configure seu número de WhatsApp Business na plataforma da Meta</li>
              <li>• Obtenha as credenciais seguindo o guia: <a href="/WHATSAPP_SETUP.md" target="_blank" className="underline">WHATSAPP_SETUP.md</a></li>
              <li>• 1.000 conversas gratuitas/mês na Meta Cloud API</li>
            </ul>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token * <span className="text-xs text-gray-500">(Token Permanente)</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={config?.hasToken ? '••••••••••••••••' : 'EAAxxxxxxxxxxxxxxxxxxxx'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showToken ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Obtenha em: Meta Business Suite → System Users → Generate Token
            </p>
          </div>

          {/* Phone Number ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number ID *
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="123456789012345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Encontre em: Painel WhatsApp → API Setup → Phone number ID
            </p>
          </div>

          {/* Business Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de WhatsApp Business * <span className="text-xs text-gray-500">(Formato: 5589981398723)</span>
            </label>
            <input
              type="text"
              value={businessPhoneNumber}
              onChange={(e) => setBusinessPhoneNumber(e.target.value)}
              placeholder="5589981398723"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Seu número no formato internacional (código país + DDD + número)
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '💾 Salvando...' : '💾 Salvar Configuração'}
            </button>
            
            {config?.hasToken && (
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? '🔄 Testando...' : '🧪 Testar Conexão'}
              </button>
            )}
          </div>
        </form>

        {/* Guia rápido */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📖 Guia Rápido</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Acesse: <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com/apps</a></li>
            <li>Crie um App → Tipo: Business</li>
            <li>Adicione o produto: WhatsApp</li>
            <li>Verifique seu número de telefone</li>
            <li>Copie: Phone Number ID e Access Token</li>
            <li>Cole aqui e clique em "Salvar"</li>
            <li>Clique em "Testar Conexão"</li>
            <li>Se tudo OK, clique em "Ativar"!</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2">
            💡 Documentação completa disponível no arquivo WHATSAPP_SETUP.md
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
