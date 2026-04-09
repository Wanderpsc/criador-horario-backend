import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { Tv, ExternalLink, Calendar, AlertTriangle, Settings, Copy, Share2, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DisplayPanelConfig() {
  const [selectedNormalId, setSelectedNormalId] = useState<string>('');
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string>('');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  // Log quando isEmergencyMode mudar
  useEffect(() => {
    console.log('🔄 Estado isEmergencyMode mudou para:', isEmergencyMode);
  }, [isEmergencyMode]);

  // Buscar horários normais
  const { data: availableTimetables = [], isLoading: isLoadingNormal } = useQuery({
    queryKey: ['availableTimetables'],
    queryFn: async () => {
      try {
        const response = await api.get('/generated-timetables/all');
        return response.data.data || [];
      } catch (error) {
        console.error('Erro ao buscar horários normais:', error);
        return [];
      }
    },
  });

  // Buscar horários emergenciais
  const { data: emergencySchedules = [], isLoading: isLoadingEmergency } = useQuery({
    queryKey: ['emergency-schedules'],
    queryFn: async () => {
      try {
        const response = await api.get('/emergency-schedules');
        const schedules = response.data.data || response.data || [];
        return Array.isArray(schedules) ? schedules : [];
      } catch (error) {
        console.error('❌ Erro ao buscar horários emergenciais:', error);
        return [];
      }
    },
  });

  // Auto-selecionar primeiro horário normal
  useEffect(() => {
    if (availableTimetables.length > 0 && !selectedNormalId) {
      const first = availableTimetables[0];
      const firstId = first._id || first.id;
      setSelectedNormalId(firstId);
    }
  }, [availableTimetables, selectedNormalId]);

  // Auto-selecionar primeiro horário emergencial
  useEffect(() => {
    if (emergencySchedules.length > 0 && !selectedEmergencyId) {
      const first = emergencySchedules[0];
      const firstId = first._id || first.id;
      setSelectedEmergencyId(firstId);
    }
  }, [emergencySchedules, selectedEmergencyId]);

  // Função para abrir o painel em nova janela
  const openDisplayPanel = () => {
    if (!isEmergencyMode && !selectedNormalId) {
      toast.error('Selecione um horário normal');
      return;
    }
    if (isEmergencyMode && !selectedEmergencyId) {
      toast.error('Selecione um horário emergencial');
      return;
    }

    const params = new URLSearchParams();
    if (isEmergencyMode) {
      console.log('🚨 Abrindo painel emergencial com ID:', selectedEmergencyId);
      params.append('emergencyId', selectedEmergencyId);
      params.append('mode', 'emergency');
    } else {
      console.log('📅 Abrindo painel normal com ID:', selectedNormalId);
      params.append('timetableId', selectedNormalId);
      params.append('mode', 'normal');
    }

    const url = `/#/display-panel?${params.toString()}`;
    console.log('🔗 URL gerada:', url);
    window.open(url, '_blank', 'fullscreen=yes');
    toast.success('Painel de TV aberto em nova janela');
  };

  const getShareableUrl = (): string | null => {
    if (!isEmergencyMode && !selectedNormalId) return null;
    if (isEmergencyMode && !selectedEmergencyId) return null;

    const params = new URLSearchParams();
    if (isEmergencyMode) {
      params.append('emergencyId', selectedEmergencyId);
      params.append('mode', 'emergency');
    } else {
      params.append('timetableId', selectedNormalId);
      params.append('mode', 'normal');
    }
    return `${window.location.origin}/#/display-panel?${params.toString()}`;
  };

  const copyLink = () => {
    const url = getShareableUrl();
    if (!url) {
      toast.error('Selecione um horário primeiro');
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copiado para a área de transferência!');
    }).catch(() => {
      // Fallback para navegadores sem clipboard API
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('Link copiado!');
    });
  };

  const shareLink = () => {
    const url = getShareableUrl();
    if (!url) {
      toast.error('Selecione um horário primeiro');
      return;
    }
    const text = isEmergencyMode
      ? '🚨 Horário Emergencial - Painel de TV'
      : '📅 Horário de Aulas - Painel de TV';
    if (navigator.share) {
      navigator.share({ title: text, url }).catch(() => {});
    } else {
      // Fallback: abrir WhatsApp Web
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`;
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Tv className="text-purple-600" size={36} />
          Configuração do Painel de TV
        </h1>
        <p className="text-gray-600 mt-2">
          Configure qual horário será exibido no painel de avisos da TV
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Horário Normal */}
        <div className={`card border-2 transition-all ${
          !isEmergencyMode 
            ? 'border-yellow-500 bg-yellow-50 shadow-lg' 
            : 'border-gray-300 opacity-70'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className={`${!isEmergencyMode ? 'text-yellow-600' : 'text-gray-400'}`} size={28} />
            <h2 className="text-xl font-bold">📅 Horário Normal</h2>
          </div>

          {isLoadingNormal ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : availableTimetables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum horário normal disponível
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Selecione o horário:
              </label>
              <select
                value={selectedNormalId}
                onFocus={() => {
                  console.log('🎯 Foco no dropdown normal - ativando modo normal');
                  if (isEmergencyMode) {
                    setIsEmergencyMode(false);
                  }
                }}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  console.log('📅 Horário normal selecionado:', selectedId);
                  setSelectedNormalId(selectedId);
                  setIsEmergencyMode(false);
                  console.log('   → Modo alterado para: NORMAL');
                }}
                className={`w-full rounded-lg px-4 py-3 text-lg font-semibold transition-all cursor-pointer ${
                  !isEmergencyMode 
                    ? 'bg-white text-gray-900 border-2 border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400' 
                    : 'bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-yellow-400'
                }`}
              >
                <option value="">Selecione o horário</option>
                {availableTimetables.map((tt: any) => (
                  <option key={tt.id || tt._id} value={tt.id || tt._id}>
                    {tt.name} ({new Date(tt.createdAt).toLocaleDateString('pt-BR')})
                  </option>
                ))}
              </select>

              {selectedNormalId && !isEmergencyMode && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-sm">
                  <strong>✓ Horário selecionado:</strong> Este horário será exibido no painel de TV
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Horário Emergencial */}
        <div className={`card border-2 transition-all ${
          isEmergencyMode 
            ? 'border-red-500 bg-red-50 shadow-lg' 
            : 'border-gray-300 opacity-70'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className={`${isEmergencyMode ? 'text-red-600' : 'text-gray-400'}`} size={28} />
            <h2 className="text-xl font-bold">🚨 Horário Emergencial</h2>
          </div>

          {isLoadingEmergency ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : emergencySchedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum horário emergencial disponível
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Selecione o horário emergencial:
              </label>
              <select
                value={selectedEmergencyId}
                onFocus={() => {
                  console.log('🎯 Foco no dropdown emergencial - ativando modo emergencial');
                  if (!isEmergencyMode) {
                    setIsEmergencyMode(true);
                  }
                }}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  console.log('🔴 Horário emergencial selecionado:', selectedId);
                  setSelectedEmergencyId(selectedId);
                  setIsEmergencyMode(true);
                  console.log('   → Modo alterado para: EMERGENCIAL');
                }}
                className={`w-full rounded-lg px-4 py-3 text-lg font-semibold transition-all cursor-pointer ${
                  isEmergencyMode 
                    ? 'bg-white text-gray-900 border-2 border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400' 
                    : 'bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-red-400'
                }`}
              >
                <option value="">Selecione o horário emergencial</option>
                {emergencySchedules.map((schedule: any) => {
                  const scheduleId = schedule._id || schedule.id;
                  console.log('📝 Horário no dropdown:', schedule.name, '| id:', schedule.id, '| _id:', schedule._id);
                  return (
                    <option key={scheduleId} value={scheduleId}>
                      {schedule.name || new Date(schedule.date).toLocaleDateString('pt-BR')} - {schedule.dayOfWeek}
                    </option>
                  );
                })}
              </select>

              {selectedEmergencyId && isEmergencyMode && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-sm">
                  <strong>⚠ Modo Emergencial Ativo:</strong> Este horário será exibido no painel de TV
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botão para Abrir Painel */}
      <div className="card bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${
              isEmergencyMode ? 'bg-red-500' : 'bg-yellow-500'
            }`}>
              <Tv size={48} />
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold mb-2">
              {isEmergencyMode ? '🚨 MODO EMERGENCIAL' : '📅 MODO NORMAL'}
            </h3>
            <p className="text-purple-100">
              {isEmergencyMode 
                ? 'O painel exibirá o horário emergencial selecionado'
                : 'O painel exibirá o horário normal selecionado'
              }
            </p>
          </div>

          <button
            onClick={openDisplayPanel}
            disabled={(!isEmergencyMode && !selectedNormalId) || (isEmergencyMode && !selectedEmergencyId)}
            className="btn bg-white text-purple-600 hover:bg-gray-100 font-bold text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
          >
            <ExternalLink size={24} />
            Abrir Painel de TV em Tela Cheia
          </button>

          {/* Botões de Compartilhamento */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={copyLink}
              disabled={(!isEmergencyMode && !selectedNormalId) || (isEmergencyMode && !selectedEmergencyId)}
              className="btn bg-purple-500 bg-opacity-30 hover:bg-opacity-50 text-white font-semibold px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 border border-purple-300 border-opacity-40"
            >
              <Copy size={18} />
              Copiar Link
            </button>
            <button
              onClick={shareLink}
              disabled={(!isEmergencyMode && !selectedNormalId) || (isEmergencyMode && !selectedEmergencyId)}
              className="btn bg-green-500 bg-opacity-30 hover:bg-opacity-50 text-white font-semibold px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 border border-green-300 border-opacity-40"
            >
              <Share2 size={18} />
              Compartilhar
            </button>
          </div>

          {getShareableUrl() && (
            <div className="bg-white bg-opacity-10 rounded-lg px-4 py-2 max-w-xl mx-auto">
              <p className="text-xs text-purple-200 mb-1">Link público do painel:</p>
              <p className="text-sm text-white font-mono break-all select-all cursor-pointer" onClick={copyLink}>
                {getShareableUrl()}
              </p>
            </div>
          )}

          <p className="text-sm text-purple-200">
            💡 O painel será aberto em uma nova janela em modo tela cheia, ideal para TVs e monitores
          </p>
        </div>
      </div>

      {/* Card de Instruções */}
      <div className="card bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Settings className="text-blue-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">Como usar:</h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
              <li>Selecione um horário normal OU um horário emergencial</li>
              <li>Clique em "Abrir Painel de TV em Tela Cheia" para visualizar</li>
              <li>Use <strong>"Copiar Link"</strong> para copiar o endereço e enviar para professores</li>
              <li>Use <strong>"Compartilhar"</strong> para enviar via WhatsApp ou outros apps</li>
              <li>Os professores abrem o link no celular/computador — <strong>não precisa de login</strong></li>
              <li>O painel atualiza automaticamente a cada 60 segundos</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
