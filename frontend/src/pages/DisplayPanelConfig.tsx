import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Tv, ExternalLink, Calendar, AlertTriangle, Settings, Copy, Share2, MessageSquare, Music, Image, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

// ── helpers playlist ──────────────────────────────────────────────────────────
const DEFAULT_PLAYLIST = [
  { id: 'jfKfPfyJRdk', title: 'Lo-Fi Relaxante', emoji: '🎵' },
  { id: 'CLeZyIID9Bo', title: 'Gospel Instrumental', emoji: '🙏' },
  { id: '4To2KEJ1y7c', title: 'Música Clássica', emoji: '🎼' },
  { id: 'DWcJFNfaw9c', title: 'Piano Instrumental', emoji: '🎹' },
  { id: 'kgx4WGK0oNU', title: 'Músicas Ambiente', emoji: '🌿' },
  { id: 'BHACKCNDMW8', title: 'Para Estudar', emoji: '📚' },
];

function ytIdFromUrl(input: string): string {
  input = input.trim();
  // já é ID curto (11 chars, sem /)
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  // URL longa: v=XXXXXXXXXXX
  const m1 = input.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m1) return m1[1];
  // URL curta youtu.be/XXXXXXXXXXX
  const m2 = input.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m2) return m2[1];
  // embed URL
  const m3 = input.match(/embed\/([A-Za-z0-9_-]{11})/);
  if (m3) return m3[1];
  return input; // devolve como está (pode ser inválido)
}

function loadPlaylist() {
  try {
    const s = localStorage.getItem('dp_playlist');
    if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; }
  } catch {}
  return DEFAULT_PLAYLIST;
}

export default function DisplayPanelConfig() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const schoolId = user?.schoolId || (user?.role === 'school' ? user?.id : '') || '';

  const [selectedNormalId, setSelectedNormalId] = useState<string>('');
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string>('');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [tickerMessage, setTickerMessage] = useState<string>('');
  const [tickerActive, setTickerActive] = useState<boolean>(true);

  // ── Playlist e imagens de refeição ───────────────────────────────────────
  type PlaylistTrack = { id: string; title: string; emoji: string };
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>(loadPlaylist);
  const [mealLancheImg, setMealLancheImg] = useState(() => localStorage.getItem('dp_meal_lanche_img') || '');
  const [mealAlmocoImg, setMealAlmocoImg] = useState(() => localStorage.getItem('dp_meal_almoco_img') || '');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackEmoji, setNewTrackEmoji] = useState('🎵');

  const saveMediaSettings = () => {
    try {
      localStorage.setItem('dp_playlist', JSON.stringify(playlist));
      localStorage.setItem('dp_meal_lanche_img', mealLancheImg.trim());
      localStorage.setItem('dp_meal_almoco_img', mealAlmocoImg.trim());
      // Disparar evento storage para o DisplayPanel (mesma aba) recarregar
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'dp_playlist', newValue: JSON.stringify(playlist),
      }));
      toast.success('✅ Configurações de mídia salvas!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    }
  };

  const addTrack = () => {
    const id = ytIdFromUrl(newTrackUrl);
    if (!id) { toast.error('Informe um ID ou URL do YouTube.'); return; }
    const title = newTrackTitle.trim() || 'Sem título';
    setPlaylist(p => [...p, { id, title, emoji: newTrackEmoji || '🎵' }]);
    setNewTrackUrl(''); setNewTrackTitle(''); setNewTrackEmoji('🎵');
  };

  const removeTrack = (idx: number) => setPlaylist(p => p.filter((_, i) => i !== idx));
  const resetPlaylist = () => { setPlaylist(DEFAULT_PLAYLIST); toast('Playlist restaurada ao padrão.'); };

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

  // Buscar letreiro atual
  const { data: tickerData } = useQuery({
    queryKey: ['panel-ticker', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const res = await api.get(`/panel-ticker/${schoolId}`);
      return res.data?.data || null;
    },
    enabled: !!schoolId,
  });

  useEffect(() => {
    if (tickerData) {
      setTickerMessage(tickerData.message || '');
      setTickerActive(tickerData.active !== false);
    }
  }, [tickerData]);

  // Salvar letreiro
  const saveTickerMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/panel-ticker/${schoolId}`, { message: tickerMessage, active: tickerActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-ticker', schoolId] });
      toast.success('Letreiro salvo com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar letreiro'),
  });

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

      {/* Card: Letreiro do Painel */}
      {schoolId && (
        <div className="card border-2 border-yellow-400 bg-yellow-50">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-yellow-600" size={28} />
            <h2 className="text-xl font-bold text-yellow-800">📢 Letreiro do Painel</h2>
          </div>
          <p className="text-sm text-yellow-700 mb-4">
            Este texto rola como letreiro na faixa inferior do painel de TV. Deixe em branco para ocultar.
          </p>
          <textarea
            value={tickerMessage}
            onChange={(e) => setTickerMessage(e.target.value)}
            placeholder="Ex: Reunião de pais às 19h no auditório — Amanhã não haverá aulas no turno vespertino..."
            maxLength={500}
            rows={3}
            className="w-full rounded-lg border-2 border-yellow-300 bg-white px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
          />
          <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tickerActive}
                onChange={(e) => setTickerActive(e.target.checked)}
                className="w-4 h-4 accent-yellow-600"
              />
              <span className="text-sm font-medium text-yellow-800">Letreiro ativo</span>
            </label>
            <button
              onClick={() => saveTickerMutation.mutate()}
              disabled={saveTickerMutation.isPending || !schoolId}
              className="btn bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-6 py-2 disabled:opacity-50"
            >
              {saveTickerMutation.isPending ? 'Salvando…' : '💾 Salvar Letreiro'}
            </button>
          </div>
          {tickerMessage.trim() && tickerActive && (
            <div className="mt-4 overflow-hidden rounded-lg" style={{ background: '#1e293b', height: '34px', display: 'flex', alignItems: 'center' }}>
              <style>{`
                @keyframes ticker-preview {
                  0%   { transform: translateX(100%); }
                  100% { transform: translateX(-100%); }
                }
                .ticker-preview-text {
                  display: inline-block;
                  white-space: nowrap;
                  animation: ticker-preview 18s linear infinite;
                  font-size: 0.82rem;
                  font-weight: 600;
                  color: #fde68a;
                }
              `}</style>
              <span className="ticker-preview-text">📢 &nbsp; {tickerMessage} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </div>
          )}
        </div>
      )}

      {/* ── Card: Música e Imagens do Intervalo ─────────────────────────────── */}
      <div className="card border-2 border-purple-400 bg-purple-50 space-y-6">
        <div className="flex items-center gap-3">
          <Music className="text-purple-600" size={28} />
          <h2 className="text-xl font-bold text-purple-800">🎵 Música e Imagens do Intervalo</h2>
        </div>
        <p className="text-sm text-purple-700">
          Configure a playlist de vídeos do YouTube exibida durante os intervalos (lanche/almoço), e as imagens mostradas no card de refeição.
        </p>

        {/* Imagens de refeição */}
        <div className="bg-white rounded-xl border border-purple-200 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Image size={18} className="text-purple-500" />
            <h3 className="font-semibold text-purple-800">Imagens das Refeições</h3>
          </div>
          <p className="text-xs text-gray-500">Cole a URL de uma imagem (JPG, PNG, GIF) para substituir o emoji padrão no card de lanche ou almoço.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-blue-700">☕ Lanche — URL da imagem</label>
              <input
                type="url"
                value={mealLancheImg}
                onChange={e => setMealLancheImg(e.target.value)}
                placeholder="https://exemplo.com/lanche.jpg"
                className="input w-full text-sm"
              />
              {mealLancheImg && (
                <img src={mealLancheImg} alt="Preview lanche" className="mt-2 rounded-lg h-24 object-cover w-full border border-blue-200"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-amber-700">🍽️ Almoço — URL da imagem</label>
              <input
                type="url"
                value={mealAlmocoImg}
                onChange={e => setMealAlmocoImg(e.target.value)}
                placeholder="https://exemplo.com/almoco.jpg"
                className="input w-full text-sm"
              />
              {mealAlmocoImg && (
                <img src={mealAlmocoImg} alt="Preview almoço" className="mt-2 rounded-lg h-24 object-cover w-full border border-amber-200"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400">💡 Dica: use Google Drive (link público), Imgur ou qualquer URL de imagem direta.</p>
        </div>

        {/* Playlist */}
        <div className="bg-white rounded-xl border border-purple-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music size={18} className="text-purple-500" />
              <h3 className="font-semibold text-purple-800">Playlist de Vídeos (YouTube)</h3>
            </div>
            <button onClick={resetPlaylist} className="text-xs text-gray-400 hover:text-red-500 underline">Restaurar padrão</button>
          </div>
          <p className="text-xs text-gray-500">Informe o ID ou URL completa do vídeo do YouTube. Ex: <code className="bg-gray-100 px-1 rounded">jfKfPfyJRdk</code> ou <code className="bg-gray-100 px-1 rounded">https://youtu.be/jfKfPfyJRdk</code></p>

          {/* Lista atual */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {playlist.map((track, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                <span className="text-lg shrink-0">{track.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-gray-800">{track.title}</div>
                  <div className="text-xs text-gray-400 font-mono truncate">{track.id}</div>
                </div>
                <a
                  href={`https://youtu.be/${track.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline shrink-0"
                >▶</a>
                <button onClick={() => removeTrack(idx)} className="text-gray-300 hover:text-red-500 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {playlist.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum vídeo na playlist. Adicione abaixo.</p>
            )}
          </div>

          {/* Adicionar novo */}
          <div className="border-t border-purple-100 pt-3 space-y-2">
            <p className="text-xs font-semibold text-purple-700">Adicionar novo vídeo:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newTrackUrl}
                onChange={e => setNewTrackUrl(e.target.value)}
                placeholder="ID ou URL do YouTube"
                className="input text-sm sm:col-span-2"
              />
              <input
                type="text"
                value={newTrackTitle}
                onChange={e => setNewTrackTitle(e.target.value)}
                placeholder="Título (opcional)"
                className="input text-sm"
              />
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newTrackEmoji}
                onChange={e => setNewTrackEmoji(e.target.value)}
                placeholder="Emoji"
                maxLength={4}
                className="input text-sm w-20 text-center"
              />
              <button onClick={addTrack} disabled={!newTrackUrl.trim()} className="btn btn-primary flex items-center gap-1 text-sm">
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <button
          onClick={saveMediaSettings}
          className="btn bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 flex items-center gap-2 w-full justify-center text-base"
        >
          <Save size={18} /> Salvar Música e Imagens
        </button>
        <p className="text-xs text-purple-600 text-center">
          As configurações são salvas localmente neste dispositivo. O Painel de TV neste mesmo navegador usará as novas configurações imediatamente.
        </p>
      </div>
    </div>
  );
}
