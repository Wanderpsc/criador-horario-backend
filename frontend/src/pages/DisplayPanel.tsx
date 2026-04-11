import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import publicApi from '../lib/publicApi';
import { Clock, Wifi, WifiOff, Grid3x3, List, BookOpen, MapPin, User, Calendar } from 'lucide-react';
import AnalogClock from '../components/AnalogClock';

interface TimetableSlot {
  id: string;
  day: string;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName?: string;
  subjectColor?: string;
  teacherId: string;
  teacherName?: string;
  classId: string;
  className?: string;
  gradeName?: string;
}

interface DisplayPanelProps {
  scheduleId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // em segundos
}

type SlotStatus = 'completed' | 'ongoing' | 'upcoming' | 'scheduled';
type ViewMode = 'grid' | 'cards' | 'airport' | 'display' | 'alltable';

export default function DisplayPanel({ 

  autoRefresh = true, 
  refreshInterval = 10 
}: DisplayPanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('alltable'); // Começar com tabela transposta de todas as turmas
  const [lastAlertTime, setLastAlertTime] = useState<string>('');
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('Segunda'); // Dia selecionado para visualização
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0); // Para navegação manual
  const [isEmergencyMode, setIsEmergencyMode] = useState(false); // Modo emergencial
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string>(''); // ID do horário emergencial selecionado
  const [allClassesList, setAllClassesList] = useState<{ className: string; gradeName?: string }[]>([]); // Lista completa de turmas
  const [scheduleBreaks, setScheduleBreaks] = useState<{ label: string; startTime: string; endTime: string }[]>([]); // Intervalos configurados no Schedule
  const [autoChangePeriod, setAutoChangePeriod] = useState(true); // Controle de mudança automática de período
  const [lastPeriod, setLastPeriod] = useState<number | null>(null); // Rastrear último período para detectar mudança
  const [alarmPlayed, setAlarmPlayed] = useState<boolean>(false); // Controlar se o alarme de aviso já foi tocado
  const [overrideDateTime, setOverrideDateTime] = useState<string>(''); // Data/hora simulada para teste
  const [showSimulator, setShowSimulator] = useState(false); // Toggle do painel de simulação
  const [showSaturdayDialog, setShowSaturdayDialog] = useState(false); // Dialog configuração do sábado
  const [saturdayIsLetivo, setSaturdayIsLetivo] = useState<boolean | null>(null); // null = não verificado
  const [saturdayRefDay, setSaturdayRefDay] = useState<string>('Segunda'); // Dia de referência no sábado
  const [manualEdits, setManualEdits] = useState<{ [key: string]: { subjectName: string; teacherName: string } }>({});
  const [manualSaved, setManualSaved] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null); // chave: `${period}|||${classKey}` (somente admin, modo AUTO)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Detectar se é administrador (usuário logado) ou visualizador público (link compartilhado)
  const isAdmin = useMemo(() => {
    try {
      const stored = localStorage.getItem('auth-storage');
      if (!stored) return false;
      const { state } = JSON.parse(stored);
      return !!(state?.token && state?.user);
    } catch { return false; }
  }, []);

  // LER PARÂMETROS DA URL (configuração vinda de DisplayPanelConfig)
  useEffect(() => {
    // HashRouter coloca a query string depois de #/caminho?params
    // Ex: /#/display-panel?timetableId=xyz → window.location.hash = '#/display-panel?timetableId=xyz'
    const hashPart = window.location.hash; // '#/display-panel?...'
    const hashQuery = hashPart.includes('?') ? hashPart.split('?')[1] : '';
    // Fallback para query string normal (caso aberto sem hash)
    const rawQuery = hashQuery || window.location.search.replace(/^\?/, '');
    const params = new URLSearchParams(rawQuery);
    const mode = params.get('mode');
    const timetableId = params.get('timetableId');
    const emergencyId = params.get('emergencyId');

    console.log('🔗 Parâmetros da URL detectados:');
    console.log('   hash:', hashPart);
    console.log('   rawQuery:', rawQuery);
    console.log('   mode:', mode);
    console.log('   timetableId:', timetableId);
    console.log('   emergencyId:', emergencyId);

    if (mode === 'emergency' && emergencyId) {
      console.log('🚨 Ativando MODO EMERGENCIAL via URL');
      setIsEmergencyMode(true);
      setSelectedEmergencyId(emergencyId);
    } else if (mode === 'normal' && timetableId) {
      console.log('📅 Ativando MODO NORMAL via URL');
      setIsEmergencyMode(false);
      setSelectedTimetableId(timetableId);
    }
  }, []); // Executar apenas uma vez ao montar

  // Log do modo de visualização
  useEffect(() => {
    console.log('🎨 Modo de visualização:', viewMode);
  }, [viewMode]);

  // Criar elemento de áudio para alertas e sino de mudança de período
  useEffect(() => {
    try {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0PLPgDQGHG7A7+OZSA0PVKzn77BfHA==');
      
      console.log('🔊 Sistema de áudio inicializado');
    } catch (error) {
      console.error('Erro ao inicializar áudio:', error);
    }
  }, []);

  // Função para tocar alarme de aviso (5 segundos antes)
  const playAlarmSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const createTone = (frequency: number, startTime: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Som de alarme urgente (bips rápidos alternados)
      const now = audioContext.currentTime;
      const highFreq = 1200; // Tom agudo
      const lowFreq = 800;   // Tom grave
      
      // Sequência rápida de bips alternados (8 bips em 2 segundos)
      for (let i = 0; i < 8; i++) {
        const freq = i % 2 === 0 ? highFreq : lowFreq;
        const startTime = now + (i * 0.25);
        createTone(freq, startTime, 0.2, 0.4, 'square');
      }
      
      console.log('⚠️ Alarme de aviso tocado! (5 segundos antes)');
      
      setTimeout(() => {
        audioContext.close();
      }, 2500);
      
    } catch (err) {
      console.error('❌ Erro ao tocar alarme:', err);
    }
  };

  // Função para tocar som de sino usando Web Audio API
  const playBellSound = () => {
    try {
      // Criar contexto de áudio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Função para criar um tom
      const createTone = (frequency: number, startTime: number, duration: number, volume: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configurar oscilador (tom de sino)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        // Envelope de volume (ataque rápido, decay suave)
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Som de sino escolar (3 bips)
      const now = audioContext.currentTime;
      const baseFreq = 880; // A5 (nota aguda)
      
      // Primeiro bip
      createTone(baseFreq, now, 0.15, 0.3);
      // Segundo bip
      createTone(baseFreq, now + 0.2, 0.15, 0.3);
      // Terceiro bip
      createTone(baseFreq, now + 0.4, 0.25, 0.4);
      
      console.log('🔔 Som de sino tocado!');
      
      // Limpar contexto após uso
      setTimeout(() => {
        audioContext.close();
      }, 1000);
      
    } catch (err) {
      console.error('❌ Erro ao tocar sino:', err);
      // Fallback: tentar alerta do navegador
      try {
        const beep = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
        beep.play();
      } catch (e) {
        console.log('Fallback de áudio também falhou');
      }
    }
  };

  // Buscar lista de horários disponíveis (via rota pública por ID)
  const { data: availableTimetables = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['availableTimetables', selectedTimetableId],
    queryFn: async () => {
      if (!selectedTimetableId) return [];
      const response = await publicApi.get(`/public/timetable/${selectedTimetableId}`);
      return response.data.data || [];
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    staleTime: 0,
    retry: 18,
    retryDelay: () => 5000,
    enabled: !!selectedTimetableId,
  });

  // Buscar horários emergenciais (via rota pública por ID)
  const { data: emergencySchedules = [], isLoading: isLoadingEmergency } = useQuery({
    queryKey: ['emergency-schedules', selectedEmergencyId],
    queryFn: async () => {
      if (!selectedEmergencyId) return [];
      try {
        const response = await publicApi.get(`/public/emergency-schedule/${selectedEmergencyId}`);
        return response.data.data || [];
      } catch (error) {
        console.error('Erro ao buscar horários emergenciais:', error);
        return [];
      }
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    enabled: !!selectedEmergencyId,
  });
  
  // LOG DE MONITORAMENTO DO ESTADO EMERGENCIAL
  useEffect(() => {
    console.log('');
    console.log('🔴🔴🔴 ESTADO ATUAL isEmergencyMode:', isEmergencyMode, '🔴🔴🔴');
    console.log('');
  }, [isEmergencyMode]);

  // Log para debug: ver estrutura dos horários
  useEffect(() => {
    if (availableTimetables.length > 0) {
      console.log('📋 Estrutura do primeiro horário:');
      console.log('   Campos:', Object.keys(availableTimetables[0]));
      console.log('   Objeto completo:', availableTimetables[0]);
    }
  }, [availableTimetables]);

  // Selecionar automaticamente o primeiro horário quando carregar
  useEffect(() => {
    if (availableTimetables.length > 0 && !selectedTimetableId) {
      const first = availableTimetables[0];
      const firstId = first._id || first.id;
      console.log('🎯 Auto-selecionando horário:', first.name, '| ID:', firstId);
      setSelectedTimetableId(firstId);
    }
  }, [availableTimetables, selectedTimetableId]);

  // Auto-selecionar primeiro horário emergencial quando ativar modo emergencial
  useEffect(() => {
    console.log('📌 useEffect [Auto-seleção Emergencial] disparado:');
    console.log('   isEmergencyMode:', isEmergencyMode);
    console.log('   emergencySchedules.length:', emergencySchedules.length);
    console.log('   selectedEmergencyId:', selectedEmergencyId);
    
    if (isEmergencyMode && emergencySchedules.length > 0) {
      const first = emergencySchedules[0];
      const firstId = first._id || first.id;
      
      console.log('🚨 Auto-selecionando horário emergencial...');
      console.log('   Objeto:', first);
      console.log('   _id:', first._id);
      console.log('   id:', first.id);
      console.log('   ID final escolhido:', firstId);
      console.log('   Data:', first.date ? new Date(first.date).toLocaleDateString('pt-BR') : 'sem data');
      
      if (!selectedEmergencyId || selectedEmergencyId !== firstId) {
        console.log('   ✅ SETANDO selectedEmergencyId para:', firstId);
        setSelectedEmergencyId(firstId);
      } else {
        console.log('   ⏭️ Já está selecionado:', selectedEmergencyId);
      }
    } else if (!isEmergencyMode && selectedEmergencyId) {
      console.log('   🔄 Modo normal ativado, limpando selectedEmergencyId');
      setSelectedEmergencyId('');
    }
  }, [isEmergencyMode, emergencySchedules]);

  // Selecionar automaticamente o dia atual na primeira carga
  useEffect(() => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const effectiveTime = overrideDateTime ? new Date(overrideDateTime) : new Date();
    const today = days[effectiveTime.getDay()];
    if (['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].includes(today)) {
      setSelectedDay(today);
    }
  }, [overrideDateTime]);

  // Verificação de sábado letivo: pergunta ao usuário ao abrir o painel num sábado
  useEffect(() => {
    const effectiveDate = overrideDateTime ? new Date(overrideDateTime) : new Date();
    if (effectiveDate.getDay() !== 6) return; // Não é sábado
    const dateStr = effectiveDate.toISOString().substring(0, 10);
    const storageKey = `saturday-panel-config-${dateStr}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setSaturdayIsLetivo(config.isLetivo);
        if (config.isLetivo && config.refDay) {
          setSaturdayRefDay(config.refDay);
          setSelectedDay(config.refDay);
        }
      } catch {
        setShowSaturdayDialog(true);
      }
    } else {
      // Primeira abertura do painel neste sábado: mostrar dialog
      setShowSaturdayDialog(true);
    }
  }, [overrideDateTime]);

  // Atualizar relógio a cada segundo (ou fixar na data/hora simulada)
  useEffect(() => {
    if (overrideDateTime) {
      // Modo simulação: fixar no horário escolhido
      setCurrentTime(new Date(overrideDateTime));
      return;
    }
    // Modo real: atualizar a cada segundo
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [overrideDateTime]);

  // Alternar entre modos a cada 60 segundos (ou manter em grade)
  useEffect(() => {
    // Comentado: manter sempre em grade
    // const viewTimer = setInterval(() => {
    //   setViewMode(prev => prev === 'grid' ? 'cards' : 'grid');
    // }, 60000); // 60 segundos
    
    // return () => clearInterval(viewTimer);
  }, []);

  // Keep-alive: pinga o backend a cada 4 minutos para o Render nunca entrar em sleep
  useEffect(() => {
    const ping = () => {
      publicApi.get('/health').catch(() => {/* ignora erro no keep-alive */});
    };
    ping(); // pinga imediatamente ao montar para acordar o Render desde o inicio
    const keepAlive = setInterval(ping, 4 * 60 * 1000); // 4 minutos
    return () => clearInterval(keepAlive);
  }, []);

  // Buscar horários gerados (com suporte a modo emergencial)
  const { data: timetables = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ['displayPanel', selectedTimetableId, isEmergencyMode, selectedEmergencyId],
    queryFn: async () => {
      if (!selectedTimetableId && !isEmergencyMode) {
        console.log('⏸️ Query pausada: nenhum horário selecionado');
        return [];
      }
      
      console.log('═══════════════════════════════════════════════');
      console.log('🔍 Modo:', isEmergencyMode ? '🚨 EMERGENCIAL' : '📅 Normal');
      console.log('🆔 selectedTimetableId:', selectedTimetableId);
      console.log('🆔 selectedEmergencyId:', selectedEmergencyId);
      console.log('═══════════════════════════════════════════════');
      
      try {
        // Modo Emergencial: buscar do emergency-schedules
        if (isEmergencyMode) {
          if (!selectedEmergencyId) {
            console.log('⏸️ Aguardando seleção de horário emergencial');
            return [];
          }

          const response = await publicApi.get(`/public/emergency-schedule/${selectedEmergencyId}`);
          const allSchedules = response.data.data;
          
          if (!allSchedules || allSchedules.length === 0) {
            console.log('⚠️ Nenhum horário emergencial encontrado');
            setIsConnected(true);
            return [];
          }
          
          // Buscar o horário emergencial selecionado
          const selectedSchedule = allSchedules.find((s: any) => 
            (s._id === selectedEmergencyId || s.id === selectedEmergencyId)
          );

          if (!selectedSchedule) {
            console.error('❌ Horário emergencial não encontrado!');
            console.log('   Buscando ID:', selectedEmergencyId);
            console.log('   IDs disponíveis:', allSchedules.map((s: any) => s._id || s.id));
            setIsConnected(true);
            return [];
          }

          console.log('🚨 Horário emergencial selecionado:', new Date(selectedSchedule.date).toLocaleDateString('pt-BR'));
          console.log('🚨 Estrutura completa do horário emergencial:', selectedSchedule);
          console.log('🚨 Número de emergencySlots:', selectedSchedule.emergencySlots?.length || 0);
          console.log('🚨 scheduleId (horário base):', selectedSchedule.scheduleId);
          
          const allSlots: TimetableSlot[] = [];
          const emergencySlots = selectedSchedule.emergencySlots || [];
          
          if (emergencySlots.length > 0) {
            console.log('🚨 Primeiro emergencySlot:', emergencySlots[0]);
            console.log('🚨 Campos do slot:', Object.keys(emergencySlots[0]));
            console.log('🚨 Total de slots emergenciais:', emergencySlots.length);
          } else {
            console.error('❌ NENHUM emergencySlot encontrado! Array está vazio.');
            console.log('❌ Isso significa que o horário emergencial não tem dados!');
          }
          
          // PASSO 1: Buscar TODAS as turmas do horário base (versão otimizada)
          console.log('🔍 Buscando turmas do horário base:', selectedSchedule.scheduleId);
          const emergencyClasses: { className: string; gradeName?: string }[] = [];
          const classIdsSet = new Set<string>();
          
          try {
            // Buscar horário base SEM popular (mais rápido) - apenas para pegar os classIds
            const allTimetablesResponse = await publicApi.get(`/public/timetable/${selectedSchedule.scheduleId}`);
            const allTimetables = allTimetablesResponse.data?.data || allTimetablesResponse.data;
            const baseSchedule = allTimetables.find((t: any) => 
              (t._id === selectedSchedule.scheduleId || t.id === selectedSchedule.scheduleId)
            );
            
            if (baseSchedule) {
              const timetableData = baseSchedule.data || baseSchedule.timetable || {};
              const classIds = Object.keys(timetableData);
              console.log('📚 Horário base encontrado com', classIds.length, 'turmas');
              
              // Buscar dados das turmas em paralelo (mais rápido)
              const classPromises = classIds.map(classId => 
                publicApi.get(`/public/class/${classId}`)
                  .then(response => {
                    const classData = response.data.data;
                    return {
                      classId,
                      className: classData.name || `Turma ${classId.substring(0, 8)}`,
                      gradeName: classData.gradeName
                    };
                  })
                  .catch(error => {
                    console.warn(`⚠️ Erro ao buscar turma ${classId}:`, error.message);
                    return {
                      classId,
                      className: `Turma ${classId.substring(0, 8)}`,
                      gradeName: undefined
                    };
                  })
              );
              
              const classesData = await Promise.all(classPromises);
              classesData.forEach(classData => {
                classIdsSet.add(classData.classId);
                emergencyClasses.push({
                  className: classData.className,
                  gradeName: classData.gradeName
                });
                console.log(`🟢 Turma: ${classData.className} (${classData.gradeName || 'sem série'})`);
              });
            }
          } catch (error: any) {
            console.error('⚠️ Erro ao buscar horário base:', error.message);
            console.log('⚠️ Continuando apenas com turmas dos slots emergenciais...');
          }
          
          // PASSO 2: Processar os slots emergenciais
          emergencySlots.forEach((slot: any) => {
            allSlots.push({
              id: `${slot.classId}-${slot.day}-${slot.period}`,
              day: slot.day,
              period: slot.period,
              startTime: slot.startTime,
              endTime: slot.endTime,
              subjectId: slot.subjectId,
              subjectName: slot.subjectName,
              subjectColor: slot.subjectColor,
              teacherId: slot.teacherId,
              teacherName: slot.teacherName,
              classId: slot.classId,
              className: slot.className,
              gradeName: slot.gradeName,
            });
            
            // Adicionar turma se ainda não foi adicionada (fallback se não estava no base)
            if (slot.classId && !classIdsSet.has(slot.classId)) {
              classIdsSet.add(slot.classId);
              emergencyClasses.push({
                className: slot.className,
                gradeName: slot.gradeName
              });
              console.log(`🔵 Turma adicional: ${slot.className} (${slot.gradeName})`);
            }
          });
          
          console.log(`✅ ${allSlots.length} slots emergenciais processados`);
          console.log(`📋 ${emergencyClasses.length} turmas TOTAIS:`, emergencyClasses.map(c => c.className));
          console.log('═══════════════════════════════════════════════');
          console.log('🚨 RETORNANDO SLOTS EMERGENCIAIS:', allSlots.length);
          console.log('═══════════════════════════════════════════════');
          setAllClassesList(emergencyClasses);
          setIsConnected(true);
          return allSlots;
        }
        
        // Modo Normal
        console.log('🔍 Buscando horário ID:', selectedTimetableId);
        
        const response = await publicApi.get(`/public/timetable/${selectedTimetableId}`);
        const allTimetables = response.data.data;
        console.log('📚 Total de horários disponíveis:', allTimetables.length);
        
        const selectedTimetable = allTimetables.find((t: any) => 
          (t._id === selectedTimetableId || t.id === selectedTimetableId)
        );
        
        if (!selectedTimetable) {
          console.error('❌ Horário não encontrado!');
          console.log('   Buscando ID:', selectedTimetableId);
          console.log('   IDs disponíveis:', allTimetables.map((t: any) => t._id || t.id));
          setIsConnected(true);
          return [];
        }
        
        console.log('📦 Horário selecionado:', selectedTimetable.name);
        console.log('📦 Chaves do horário:', Object.keys(selectedTimetable));
        
        const allSlots: TimetableSlot[] = [];
        const timetableData = selectedTimetable.data || selectedTimetable.timetable || {};
        // periodTimes: mapa period -> {startTime, endTime} vindo do Schedule (backend)
        const periodTimes: Record<number, { startTime: string; endTime: string }> = selectedTimetable.periodTimes || {};
        console.log('⏰ periodTimes do Schedule:', periodTimes);
        
        console.log('📦 Dados do horário:', Object.keys(timetableData).length, 'turmas');
        console.log('📦 Chaves:', Object.keys(timetableData));
        
        // Usar Map para garantir unicidade por classId
        const classesMap = new Map<string, { className: string; gradeName?: string }>();
        
        // Primeiro, extrair TODAS as turmas (mesmo as sem slots)
        Object.entries(timetableData).forEach(([classId, slots]: [string, any]) => {
          if (Array.isArray(slots)) {
            if (slots.length > 0) {
              // Extrair info da turma do primeiro slot (só adiciona se não existir)
              if (!classesMap.has(classId)) {
                const firstSlot = slots[0];
                classesMap.set(classId, {
                  className: firstSlot.className || classId,
                  gradeName: firstSlot.gradeName
                });
              }
              
              // Processar todos os slots — garantir startTime/endTime via periodTimes
              slots.forEach((slot: any) => {
                const pt = periodTimes[Number(slot.period)];
                allSlots.push({
                  ...slot,
                  startTime: slot.startTime || pt?.startTime || '',
                  endTime:   slot.endTime   || pt?.endTime   || '',
                  id: `${classId}-${slot.day}-${slot.period}`,
                  classId,
                });
              });
            } else {
              // Array vazio - turma existe mas não tem slots neste horário
              console.warn(`⚠️ Turma ${classId} não tem slots`);
            }
          }
        });
        
        // Buscar dados das turmas sem slots
        const missingClassIds = Object.keys(timetableData).filter(classId => !classesMap.has(classId));
        
        // Buscar dados das turmas faltantes
        if (missingClassIds.length > 0) {
          console.log(`🔍 Buscando dados de ${missingClassIds.length} turmas sem slots:`, missingClassIds);
          
          for (const classId of missingClassIds) {
            try {
              const response = await publicApi.get(`/public/class/${classId}`);
              const classData = response.data.data;
              classesMap.set(classId, {
                className: classData.name || classId,
                gradeName: classData.gradeName
              });
              console.log(`✅ Turma encontrada: ${classData.name} (${classData.gradeName || 'sem série'})`);
            } catch (error: any) {
              console.error(`❌ Erro ao buscar turma ${classId}:`, error.message);
              // Fallback: usar o classId como nome da turma
              classesMap.set(classId, {
                className: `Turma ${classId.substring(0, 8)}`,
                gradeName: undefined
              });
            }
          }
        }
        
        // Converter Map para array e remover duplicações por classId (mais confiável que nome)
        console.log(`📊 Total de turmas no classesMap: ${classesMap.size}`);
        const allClasses = Array.from(classesMap.values());
        
        // Ordenar por série e nome para melhor visualização
        allClasses.sort((a, b) => {
          const gradeA = a.gradeName || '';
          const gradeB = b.gradeName || '';
          if (gradeA !== gradeB) return gradeA.localeCompare(gradeB);
          return a.className.localeCompare(b.className);
        });
        
        console.log(`✅ ${allSlots.length} slots processados`);
        console.log(`📋 ${allClasses.length} turmas únicas encontradas:`, allClasses.map(c => `${c.className} (${c.gradeName || 'sem série'})`));
        console.log('═══════════════════════════════════════════════');
        console.log('📅 RETORNANDO SLOTS NORMAIS:', allSlots.length);
        console.log('═══════════════════════════════════════════════');
        setAllClassesList(allClasses);
        setScheduleBreaks(selectedTimetable.breaks || []);
        setIsConnected(true);
        return allSlots;
      } catch (error: any) {
        console.error('Erro ao buscar horários:', error.message);
        setIsConnected(false);
        throw error;
      }
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    staleTime: 0,
    retry: 18,                         // até ~90s de cold-start (18 × 5s)
    retryDelay: () => 5000,            // tenta a cada 5s sem back-off exponencial
    enabled: (!!selectedTimetableId && !isEmergencyMode) || (isEmergencyMode && !!selectedEmergencyId),
  });

  // Verificar alertas e tocar som
  useEffect(() => {
    if (!timetables.length) return;

    const todaySlots = timetables.filter(slot => slot.day === getCurrentDay());
    
    todaySlots.forEach(slot => {
      const status = getSlotStatus(slot);
      const alertKey = `${slot.id}-${slot.startTime}`;
      
      // Alerta 5 minutos antes da aula
      if (status === 'upcoming') {
        const now = currentTime;
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const startTime = new Date(now);
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);
        
        // Tocar alerta em 5, 3 e 1 minuto antes
        if ((diffMinutes === 5 || diffMinutes === 3 || diffMinutes === 1) && lastAlertTime !== alertKey) {
          playAlert();
          setLastAlertTime(alertKey);
          console.log(`🔔 Alerta: ${slot.subjectName} em ${diffMinutes} minuto(s)!`);
        }
      }
      
      // Alerta quando a aula começa
      if (status === 'ongoing' && lastAlertTime !== `${alertKey}-start`) {
        playAlert();
        setLastAlertTime(`${alertKey}-start`);
        console.log(`🟢 Iniciando: ${slot.subjectName} - ${slot.className}`);
      }
    });
  }, [currentTime, timetables]);

  // Log de debug para verificar dados carregados
  useEffect(() => {
    console.log('═══════════════════════════════════════════════');
    console.log('📊 DADOS CARREGADOS NO DISPLAY PANEL:');
    console.log('   Modo:', isEmergencyMode ? '🚨 EMERGENCIAL' : '📅 NORMAL');
    console.log('   Total de slots:', timetables.length);
    console.log('   IsLoading:', isLoading);
    console.log('   IsError:', isError);
    if (timetables.length > 0) {
      console.log('   Primeiro slot:', timetables[0]);
      console.log('   Dias com slots:', [...new Set(timetables.map(s => s.day))]);
      console.log('   Períodos:', [...new Set(timetables.map(s => s.period))].sort((a,b) => a-b));
    }
    console.log('═══════════════════════════════════════════════');
  }, [timetables, isEmergencyMode, isLoading, isError]);

  // Função para tocar alerta sonoro
  const playAlert = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Erro ao tocar som:', err));
    }
  };

  // Salvar configuração do sábado e aplicar ao painel
  const handleSaturdayConfirm = (isLetivo: boolean, refDay: string) => {
    const effectiveDate = overrideDateTime ? new Date(overrideDateTime) : new Date();
    const dateStr = effectiveDate.toISOString().substring(0, 10);
    localStorage.setItem(`saturday-panel-config-${dateStr}`, JSON.stringify({ isLetivo, refDay }));
    setSaturdayIsLetivo(isLetivo);
    setSaturdayRefDay(refDay);
    if (isLetivo) setSelectedDay(refDay);
    setShowSaturdayDialog(false);
  };

  // Obter dia da semana atual (memoizado)
  const currentDay = useMemo(() => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[currentTime.getDay()];
  }, [currentTime]);

  const getCurrentDay = (): string => currentDay;

  // Determinar status do slot
  const getSlotStatus = (slot: TimetableSlot): SlotStatus => {
    // Se não é o dia atual, é agendado
    if (slot.day !== currentDay) {
      return 'scheduled';
    }

    // Validar se tem horários
    if (!slot.startTime || !slot.endTime) {
      return 'scheduled';
    }

    const now = currentTime;
    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    const [endHour, endMinute] = slot.endTime.split(':').map(Number);

    const startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);

    if (now < startTime) {
      // Aula ainda não começou
      const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);
      return diffMinutes <= 30 ? 'upcoming' : 'scheduled';
    } else if (now >= startTime && now <= endTime) {
      // Aula em andamento
      return 'ongoing';
    } else {
      // Aula já terminou
      return 'completed';
    }
  };

  // Obter cor baseada no status
  const getStatusColor = (status: SlotStatus): string => {
    switch (status) {
      case 'ongoing':
        return 'bg-green-600 text-white border-green-700';
      case 'upcoming':
        return 'bg-yellow-500 text-black border-yellow-600';
      case 'completed':
        return 'bg-gray-400 text-gray-700 border-gray-500';
      case 'scheduled':
        return 'bg-blue-500 text-white border-blue-600';
      default:
        return 'bg-gray-300 text-gray-600 border-gray-400';
    }
  };

  // Filtrar e ordenar slots do dia atual
  const todaySlots = timetables
    .filter(slot => slot.day === currentDay)
    .filter(slot => slot.startTime && slot.endTime) // Validar horários
    .sort((a, b) => {
      const aTime = a.startTime.split(':').map(Number);
      const bTime = b.startTime.split(':').map(Number);
      return aTime[0] * 60 + aTime[1] - (bTime[0] * 60 + bTime[1]);
    });

  // Agrupar por status
  const ongoingSlots = todaySlots.filter(s => getSlotStatus(s) === 'ongoing');
  const upcomingSlots = todaySlots.filter(s => getSlotStatus(s) === 'upcoming');
  const scheduledSlots = todaySlots.filter(s => getSlotStatus(s) === 'scheduled');

  // Dias da semana (deve estar antes do useMemo)
  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Preparar dados para grade de horários (TODOS OS DIAS) - Memoizado para performance
  const { allClasses, allPeriods, fullWeekGrid, classGradeMap } = useMemo(() => {
    // Derivar todas as turmas de TODOS os slots (todos os dias), com fallback de allClassesList
    const fromSlots: { className: string; gradeName?: string }[] = Array.from(
      new Map(
        timetables
          .filter(s => s.className)
          .map(s => [`${s.className}|||${s.gradeName || ''}`, { className: s.className as string, gradeName: s.gradeName }])
      ).values()
    ).sort((a, b) => {
      const ga = a.gradeName || ''; const gb = b.gradeName || '';
      return ga !== gb ? ga.localeCompare(gb) : (a.className || '').localeCompare(b.className || '');
    });
    // Mesclar: priorizar allClassesList (mais completo por buscar turmas sem slots), completar com slots
    const mergedMap = new Map<string, { className: string; gradeName?: string }>();
    (allClassesList.length > 0 ? allClassesList : fromSlots).forEach(c => {
      if (c.className) mergedMap.set(`${c.className}|||${c.gradeName || ''}`, { className: c.className, gradeName: c.gradeName });
    });
    fromSlots.forEach(c => {
      const key = `${c.className}|||${c.gradeName || ''}`;
      if (!mergedMap.has(key)) mergedMap.set(key, { className: c.className, gradeName: c.gradeName });
    });
    const classes = Array.from(mergedMap.values()).sort((a, b) => {
      const ga = a.gradeName || ''; const gb = b.gradeName || '';
      return ga !== gb ? ga.localeCompare(gb) : a.className.localeCompare(b.className);
    });
    
    console.log(`🎯 allClasses array:`, classes);
    console.log(`🎯 Quantidade de classes: ${classes.length}`);
    classes.forEach((c, i) => console.log(`  ${i+1}. ${c.className} (${c.gradeName || 'sem série'})`));
    
    const periods = [...new Set(timetables.map(s => s.period))].sort((a, b) => a - b);
    
    // Criar mapa de turma -> série
    const gradeMap: { [className: string]: string } = {};
    
    // Primeiro, pegar do allClassesList
    allClassesList.forEach(item => {
      if (item.className && item.gradeName) {
        gradeMap[item.className] = item.gradeName;
        console.log(`📝 GradeMap[${item.className}] = ${item.gradeName}`);
      }
    });
    
    // Depois, complementar com dados dos slots
    timetables.forEach(slot => {
      if (slot.className && slot.gradeName && !gradeMap[slot.className]) {
        gradeMap[slot.className] = slot.gradeName;
        console.log(`📝 GradeMap[${slot.className}] = ${slot.gradeName} (do slot)`);
      }
    });
    
    console.log(`📋 Total de turmas encontradas: ${classes.length}`, classes);
    console.log(`🗺️ ClassGradeMap completo:`, gradeMap);
    
    // Criar matriz de horários [dia][período][chave única da turma]
    // Usar className+gradeName como chave para evitar sobrescrita
    const grid: { [day: string]: { [period: number]: { [classKey: string]: TimetableSlot } } } = {};
    weekDays.forEach(day => {
      grid[day] = {};
    });
    
    timetables.forEach(slot => {
      const day = slot.day || '';
      const period = slot.period || 0;
      const className = slot.className || '';
      const gradeName = slot.gradeName || '';
      // Criar chave única combinando nome e série
      const classKey = `${className}|||${gradeName}`;
      
      if (grid[day]) {
        if (!grid[day][period]) {
          grid[day][period] = {};
        }
        grid[day][period][classKey] = slot;
      }
    });
    
    if (timetables.length > 0) {
      console.log(`✅ Grid criada com ${timetables.length} slots`);
      const daysWithSlots = Object.entries(grid)
        .filter(([_, periods]) => Object.keys(periods).length > 0)
        .map(([day, periods]) => `${day}(${Object.keys(periods).length})`);
      if (daysWithSlots.length > 0) {
        console.log(`📊 Períodos:`, daysWithSlots.join(', '));
      }
    }
    
    return { allClasses: classes, allPeriods: periods, fullWeekGrid: grid, classGradeMap: gradeMap };
  }, [timetables, allClassesList]);

  // Listas únicas de disciplinas e professores para selects do modo manual
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, string>();
    timetables.forEach(s => { if (s.subjectId && s.subjectName) map.set(s.subjectId, s.subjectName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [timetables]);

  const uniqueTeachers = useMemo(() => {
    const map = new Map<string, string>();
    timetables.forEach(s => { if (s.teacherId && s.teacherName) map.set(s.teacherId, s.teacherName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [timetables]);

  // Auto-selecionar primeiro dia disponível se o dia atual não tem aulas
  useEffect(() => {
    // Verificar se o dia selecionado tem aulas
    const hasSlotsInSelectedDay = Object.keys(fullWeekGrid[selectedDay] || {}).length > 0;
    
    if (!hasSlotsInSelectedDay && timetables.length > 0) {
      // Procurar primeiro dia com aulas
      const daysWithSlots = weekDays.filter(day => Object.keys(fullWeekGrid[day] || {}).length > 0);
      
      if (daysWithSlots.length > 0 && daysWithSlots[0] !== selectedDay) {
        console.log(`📅 Dia "${selectedDay}" sem aulas. Mudando automaticamente para "${daysWithSlots[0]}"`);
        console.log(`   Dias disponíveis: ${daysWithSlots.join(', ')}`);
        setSelectedDay(daysWithSlots[0]);
      }
    }
  }, [selectedDay, fullWeekGrid, timetables, weekDays]);

  // Detectar mudança de período e tocar sino
  useEffect(() => {
    // Só executar se tiver horários carregados
    if (timetables.length === 0) return;

    // Pegar o período atual do grid
    const { allPeriods, fullWeekGrid } = (() => {
      const periods = [...new Set(timetables.map(s => s.period))].sort((a, b) => a - b);
      const grid: { [day: string]: { [period: number]: any } } = {};
      weekDays.forEach(day => {
        grid[day] = {};
      });
      timetables.forEach(slot => {
        const day = slot.day || '';
        const period = slot.period || 0;
        if (!grid[day][period]) grid[day][period] = {};
      });
      return { allPeriods: periods, fullWeekGrid: grid };
    })();

    // Determinar período atual
    let detectedPeriod: number | null = null;
    let timeUntilPeriodEnd: number | null = null; // Segundos até o fim do período

    if (autoChangePeriod) {
      // Modo AUTO: detectar baseado no horário
      const now = currentTime;
      for (const period of allPeriods) {
        const periodSlots = fullWeekGrid[selectedDay]?.[period] || {};
        const firstSlot = timetables.find(s => s.period === period && s.day === selectedDay);
        
        if (firstSlot && firstSlot.startTime && firstSlot.endTime) {
          const [startHour, startMinute] = firstSlot.startTime.split(':').map(Number);
          const [endHour, endMinute] = firstSlot.endTime.split(':').map(Number);
          const startTime = new Date(now);
          startTime.setHours(startHour, startMinute, 0, 0);
          const endTime = new Date(now);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);
          if ((now >= startTime && now <= endTime) || (diffMinutes > 0 && diffMinutes <= 30)) {
            detectedPeriod = period;
            // Calcular segundos até o fim do período
            timeUntilPeriodEnd = Math.floor((endTime.getTime() - now.getTime()) / 1000);
            break;
          }
        }
      }
    } else {
      // Modo MANUAL: usar o índice atual
      detectedPeriod = allPeriods[currentPeriodIndex] || null;
    }

    // Tocar alarme 5 segundos antes da mudança (apenas em modo AUTO)
    if (autoChangePeriod && timeUntilPeriodEnd !== null && timeUntilPeriodEnd > 0 && timeUntilPeriodEnd <= 5 && !alarmPlayed) {
      console.log(`⚠️ ALARME: Faltam ${timeUntilPeriodEnd} segundos para mudança de período!`);
      playAlarmSound();
      setAlarmPlayed(true);
    }

    // Resetar flag do alarme quando mudar de período ou quando estiver longe do fim
    if (timeUntilPeriodEnd === null || timeUntilPeriodEnd > 5) {
      if (alarmPlayed) {
        setAlarmPlayed(false);
      }
    }

    // Verificar se houve mudança de período
    if (detectedPeriod !== null && lastPeriod !== null && detectedPeriod !== lastPeriod) {
      console.log(`🔔 MUDANÇA DE PERÍODO: ${lastPeriod}º → ${detectedPeriod}º`);
      playBellSound();
      // Resetar flag do alarme ao mudar de período
      setAlarmPlayed(false);
    }

    // Atualizar último período
    if (detectedPeriod !== null && detectedPeriod !== lastPeriod) {
      setLastPeriod(detectedPeriod);
    }
  }, [currentTime, autoChangePeriod, currentPeriodIndex, selectedDay, timetables, weekDays]);

  if (isLoading || (isError && isFetching)) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-white text-3xl font-bold mb-2">Carregando painel...</h1>
          <p className="text-yellow-400 text-lg mb-1">Aguardando o servidor acordar</p>
          <p className="text-gray-400 text-sm">Isso pode levar até 60 segundos na primeira abertura do dia</p>
        </div>
      </div>
    );
  }

  if (isError && !isFetching) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <WifiOff size={64} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-3xl font-bold mb-2 text-red-300">Sem Conexão com o Servidor</h1>
          <p className="text-gray-300 mb-6 max-w-md">
            O servidor pode estar reiniciando. Verifique sua conexão à internet e tente novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl rounded-xl shadow-lg transition-all hover:scale-105"
          >
            🔄 Tentar Novamente
          </button>
          <p className="text-gray-500 text-sm mt-4">A página irá recarregar automaticamente em 20 segundos</p>
          {(() => { setTimeout(() => window.location.reload(), 30000); return null; })()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-6">
      {/* Header */}
      <header className="mb-6 border-b-4 border-yellow-500 pb-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h1 className={`text-4xl font-bold mb-2 ${isEmergencyMode ? 'text-red-500 animate-pulse' : ''}`}>
              {isEmergencyMode ? '🚨 Emergencial - GRADE DE HORÁRIOS' : '📚 Normal - GRADE DE HORÁRIOS'}
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-xl text-yellow-400">
                {currentDay.toUpperCase()}, {currentTime.toLocaleDateString('pt-BR', { 
                  day: 'numeric', 
                  month: 'long'
                }).toUpperCase()}
              </p>
              {!isEmergencyMode && (
                <div className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-lg">
                  {autoChangePeriod 
                    ? '⏰ Período muda automaticamente com o horário' 
                    : '🔒 Período fixo - Use as setas para navegar'}
                </div>
              )}
            </div>
            
            {/* Seletor de Horário */}
            <div className="mt-3 flex gap-4 items-end">
              {/* Horários Normais */}
              {!isEmergencyMode && availableTimetables.length > 0 && (
                <div className="flex-1">
                  <label className="block text-sm text-gray-300 mb-1">Horário:</label>
                  <select
                    value={selectedTimetableId}
                    onChange={(e) => setSelectedTimetableId(e.target.value)}
                    className="w-full bg-gray-800 text-white border-2 border-yellow-500 rounded-lg px-4 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {availableTimetables.map((tt: any) => (
                      <option key={tt._id || tt.id} value={tt._id}>
                        {tt.name} ({new Date(tt.createdAt).toLocaleDateString('pt-BR')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Horários Emergenciais */}
              {isEmergencyMode && emergencySchedules.length > 0 && (
                <div className="flex-1">
                  <label className="block text-sm text-red-300 mb-1">🚨 Horário Emergencial:</label>
                  <select
                    value={selectedEmergencyId}
                    onChange={(e) => setSelectedEmergencyId(e.target.value)}
                    className="w-full bg-red-900 text-white border-2 border-red-400 rounded-lg px-4 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    {emergencySchedules.map((schedule: any) => (
                      <option key={schedule._id || schedule.id} value={schedule._id}>
                        {new Date(schedule.date).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {schedule.reason || 'Sem motivo'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Toggle Modo Emergencial */}
              <button
                onClick={() => {
                  alert('🔴 BOTÃO CLICADO! Modo atual: ' + (isEmergencyMode ? 'EMERGENCIAL' : 'NORMAL'));
                  
                  console.log('');
                  console.log('╔════════════════════════════════════════════════════╗');
                  console.log('║  🖱️ BOTÃO CLICADO! MUDANDO MODO...                 ║');
                  console.log('╚════════════════════════════════════════════════════╝');
                  console.log('');
                  
                  const newMode = !isEmergencyMode;
                  
                  console.log('🔄 Estado ANTES:');
                  console.log('   isEmergencyMode:', isEmergencyMode);
                  console.log('   selectedTimetableId:', selectedTimetableId);
                  console.log('   selectedEmergencyId:', selectedEmergencyId);
                  console.log('');
                  
                  console.log('🔄 NOVO MODO:', newMode ? '🚨 EMERGENCIAL' : '📅 NORMAL');
                  console.log('   Horários emergenciais disponíveis:', emergencySchedules.length);
                  
                  if (newMode && emergencySchedules.length > 0) {
                    console.log('   📋 Primeiro horário emergencial:');
                    console.log('      _id:', emergencySchedules[0]._id);
                    console.log('      id:', emergencySchedules[0].id);
                    console.log('      date:', emergencySchedules[0].date);
                    console.log('      emergencySlots:', emergencySchedules[0].emergencySlots?.length || 0, 'slots');
                  }
                  
                  setIsEmergencyMode(newMode);
                  
                  console.log('');
                  console.log('✅ setIsEmergencyMode(' + newMode + ') chamado!');
                  console.log('   Aguardando useEffect e query refetch...');
                  console.log('════════════════════════════════════════════════════');
                  console.log('');
                }}
                className={`px-6 py-2 rounded-lg font-bold text-lg transition-all whitespace-nowrap ${
                  isEmergencyMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-400 animate-pulse' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {isEmergencyMode ? '🚨 EMERGENCIAL' : '📅 Normal'}
              </button>
              
              {/* Toggle Mudança Automática de Período — apenas para o administrador */}
              {isAdmin && (
              <button
                onClick={() => setAutoChangePeriod(!autoChangePeriod)}
                className={`px-6 py-2 rounded-lg font-bold text-lg transition-all whitespace-nowrap ${
                  autoChangePeriod 
                    ? 'bg-green-600 hover:bg-green-700 text-white ring-4 ring-green-400' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title={autoChangePeriod ? 'Período muda automaticamente com o horário' : 'Período fixo (use as setas para mudar)'}
              >
                {autoChangePeriod ? '⏰ AUTO' : '🔒 MANUAL'}
              </button>
              )}
              
              {/* Botão de Teste de Som */}
              <button
                onClick={() => {
                  playBellSound();
                  console.log('🔊 Teste de som acionado pelo usuário');
                }}
                className="hidden px-6 py-2 rounded-lg font-bold text-lg transition-all whitespace-nowrap bg-purple-600 hover:bg-purple-700 text-white ring-2 ring-purple-400 hover:ring-4"
                title="Testar som do sino"
              >
                🔔 TESTAR SOM
              </button>

              {/* Botão de reconfiguração do Sábado — visível apenas em sábados */}
              {saturdayIsLetivo !== null && (
                <button
                  onClick={() => {
                    setSaturdayIsLetivo(null);
                    setSaturdayRefDay('Segunda');
                    setShowSaturdayDialog(true);
                  }}
                  className="px-6 py-2 rounded-lg font-bold text-lg transition-all whitespace-nowrap bg-yellow-600 hover:bg-yellow-500 text-white ring-2 ring-yellow-400"
                  title="Reconfigurar sábado letivo"
                >
                  📅 Sábado: {saturdayIsLetivo ? saturdayRefDay : 'Não letivo'}
                </button>
              )}
            </div>


          </div>
          
          <div className="text-right flex items-center gap-6">
            {/* Relógio Analógico */}
            <div className="flex flex-col items-center">
              <AnalogClock size={180} showNumbers={true} />
            </div>
            
            {/* Informações de Status */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center justify-end gap-2">
                {isConnected ? (
                  <>
                    <Wifi className="text-green-400" size={20} />
                    <span className="text-sm text-green-400">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="text-red-400" size={20} />
                    <span className="text-sm text-red-400">Offline</span>
                  </>
                )}
                <button
                  onClick={() => {
                    const modes: ViewMode[] = ['alltable', 'display', 'airport', 'grid', 'cards'];
                    const currentIndex = modes.indexOf(viewMode);
                    const nextIndex = (currentIndex + 1) % modes.length;
                    setViewMode(modes[nextIndex]);
                  }}
                  className="ml-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  title={`Modo: ${viewMode === 'alltable' ? 'Todas Turmas' : viewMode === 'display' ? 'Display' : viewMode === 'grid' ? 'Grade' : viewMode === 'airport' ? 'Aeroporto' : 'Cards'}`}
                >
                  {viewMode === 'alltable' ? <Grid3x3 size={20} /> : viewMode === 'grid' ? <Grid3x3 size={20} /> : viewMode === 'cards' ? <List size={20} /> : <MapPin size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Loading */}
      {isLoadingAvailable && (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-2xl text-gray-300">Carregando horários...</p>
        </div>
      )}

      {/* Mensagem se não houver horários gerados */}
      {!isLoadingAvailable && availableTimetables.length === 0 && (
        <div className="text-center py-20">
          <BookOpen size={80} className="mx-auto mb-4 text-yellow-500" />
          <h2 className="text-4xl font-bold text-white mb-4">
            Nenhum Horário Gerado
          </h2>
          <p className="text-2xl text-gray-300 mb-2">
            Por favor, gere os horários escolares no sistema antes de usar o painel.
          </p>
          <p className="text-xl text-gray-400">
            Acesse: Menu → Horários → Gerar Horários
          </p>
        </div>
      )}

      {/* VISUALIZAÇÃO EM GRADE (Principal) */}
      {!isLoadingAvailable && availableTimetables.length > 0 && viewMode === 'grid' && (
        <>
          {/* Abas de Dias da Semana */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {weekDays.map(day => {
              const daySlots = fullWeekGrid[day] || {};
              const hasSlots = Object.keys(daySlots).length > 0;
              const isToday = day === currentDay;
              const isSelected = day === selectedDay;
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  disabled={!hasSlots}
                  className={`px-6 py-3 rounded-lg font-bold text-lg transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-yellow-500 text-gray-900 shadow-lg scale-105'
                      : hasSlots
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  } ${isToday && !isSelected ? 'ring-2 ring-yellow-400' : ''}`}
                >
                  {day}
                  {isToday && <span className="ml-2">📍</span>}
                  {!hasSlots && <span className="ml-2 text-xs">(sem aulas)</span>}
                </button>
              );
            })}
          </div>

          {/* Grade do Dia Selecionado */}
          {Object.keys(fullWeekGrid[selectedDay] || {}).length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={80} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-4xl font-bold text-white mb-4">
                Sem Aulas em {selectedDay}
              </h2>
              <p className="text-xl text-gray-400 mt-4">
                Este horário não possui aulas programadas para {selectedDay}.
              </p>
              <p className="text-lg text-yellow-400 mt-4">
                💡 Selecione outro dia nos botões acima para ver os horários disponíveis.
              </p>
            </div>
          ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
            <thead>
              <tr className="bg-blue-700">
                <th className="border-2 border-gray-600 p-3 text-left font-bold text-lg sticky left-0 bg-blue-700 z-10">
                  HORÁRIO
                </th>
                {allClasses.map((classObj, classIndex) => {
                  const className = classObj.className;
                  const gradeName = classObj.gradeName;
                  const firstSlotForClass = Object.values(fullWeekGrid[selectedDay] || {}).flatMap(periodSlots => Object.values(periodSlots)).find((slot: any) => slot.className === className && slot.gradeName === gradeName);
                  return (
                    <th key={`class-header-${classIndex}-${className}`} className="border-2 border-gray-600 p-3 text-center font-bold min-w-[200px]">
                      <div className="text-lg">{className}</div>
                      {(gradeName || firstSlotForClass?.gradeName) && (
                        <div className="text-sm text-yellow-300 font-normal mt-1">{gradeName || firstSlotForClass.gradeName}</div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allPeriods.map(period => {
                const periodSlots = fullWeekGrid[selectedDay][period] || {};
                const firstSlot = Object.values(periodSlots)[0];
                const timeRange = firstSlot ? `${firstSlot.startTime} - ${firstSlot.endTime}` : '';
                
                return (
                  <tr key={period} className="hover:bg-gray-700 transition-colors">
                    <td className="border-2 border-gray-600 p-3 font-bold text-center bg-gray-750 sticky left-0 z-10">
                      <div className="text-lg">{period}º</div>
                      <div className="text-sm text-gray-400">{timeRange}</div>
                    </td>
                    {allClasses.map((classObj, classIndex) => {
                      const className = classObj.className;
                      const gradeName = classObj.gradeName;
                      const classKey = `${className}|||${gradeName || ''}`;
                      const slot = periodSlots[classKey];
                      const classInfo = allClassesList.find(c => c.className === className);
                      if (!slot) {
                        return (
                          <td key={`grid-empty-${period}-${classIndex}-${className}`} className="border-2 border-gray-600 p-3 bg-gray-800 text-center">
                            <div className="text-sm text-gray-500">LIVRE</div>
                          </td>
                        );
                      }
                      
                      const status = getSlotStatus(slot);
                      const statusColor = getStatusColor(status);
                      
                      return (
                        <td 
                          key={`grid-slot-${period}-${classIndex}-${className}`} 
                          className={`border-2 border-gray-600 p-3 ${statusColor} transition-all duration-300`}
                          style={{ 
                            backgroundColor: slot.subjectColor ? `${slot.subjectColor}dd` : undefined,
                            animation: status === 'ongoing' ? 'pulse 2s infinite' : undefined
                          }}
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-lg truncate" title={slot.subjectName}>
                              {slot.subjectName}
                            </div>
                            <div className="text-sm opacity-90 truncate" title={slot.teacherName}>
                              👨‍🏫 {slot.teacherName}
                            </div>
                            {status === 'ongoing' && (
                              <div className="text-xs font-bold bg-black bg-opacity-30 rounded px-2 py-1 inline-block">
                                🔴 EM ANDAMENTO
                              </div>
                            )}
                            {status === 'upcoming' && (
                              <div className="text-xs font-bold bg-black bg-opacity-30 rounded px-2 py-1 inline-block">
                                ⚠️ PRÓXIMA AULA
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          )}
        </>
      )}

          {/* PAINEL PRINCIPAL - Turmas como colunas, período atual como linha */}
      {viewMode === 'alltable' && timetables.length > 0 && (
        <>
          <div className="overflow-x-auto">
          {Object.keys(fullWeekGrid[selectedDay] || {}).length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={80} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-4xl font-bold text-white mb-4">Sem Aulas em {selectedDay}</h2>
              <p className="text-xl text-gray-400 mt-4">💡 Nenhuma aula cadastrada para hoje.</p>
            </div>
          ) : (() => {
            // Detectar período ativo (em andamento) ou próximo
            // Usa timetables.find() para garantir que o slot tenha startTime/endTime
            const now = currentTime;
            let activePeriod: number | null = null;
            let isOngoing = false;

            for (const period of allPeriods) {
              const slot = timetables.find(s => s.period === period && s.day === selectedDay && s.startTime && s.endTime);
              if (slot) {
                const [sh, sm] = slot.startTime.split(':').map(Number);
                const [eh, em] = slot.endTime.split(':').map(Number);
                const start = new Date(now); start.setHours(sh, sm, 0, 0);
                const end   = new Date(now); end.setHours(eh,   em, 59, 999);
                if (now >= start && now <= end) { activePeriod = period; isOngoing = true; break; }
              }
            }
            if (activePeriod === null) {
              for (const period of allPeriods) {
                const slot = timetables.find(s => s.period === period && s.day === selectedDay && s.startTime);
                if (slot) {
                  const [sh, sm] = slot.startTime.split(':').map(Number);
                  const start = new Date(now); start.setHours(sh, sm, 0, 0);
                  if (now < start) { activePeriod = period; break; }
                }
              }
            }

            // ── MODO MANUAL NÃO SALVO: grade completa editável ──────────────
            if (!autoChangePeriod && !manualSaved) {
              const COL_W_ED = 205;
              const totalW_ED = 160 + allClasses.length * COL_W_ED;
              return (
                <>
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <h2 className="text-2xl font-bold text-yellow-400">✏️ Editar Horário Manual</h2>
                    <button
                      onClick={() => setManualSaved(true)}
                      className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-black text-lg rounded-xl shadow-lg transition-all hover:scale-105"
                    >
                      💾 SALVAR E EXIBIR
                    </button>
                  </div>
                  <table className="border-collapse w-full" style={{ tableLayout: 'fixed', minWidth: `${totalW_ED}px` }}>
                    <colgroup>
                      <col style={{ width: '160px' }} />
                      {allClasses.map((_, i) => <col key={i} />)}
                    </colgroup>
                    <thead>
                      <tr style={{ height: '76px' }}>
                        <th className="border-2 border-gray-600 bg-gray-900 text-yellow-400 text-center font-black align-middle text-lg">
                          PERÍODO
                        </th>
                        {allClasses.map((classInfo, i) => (
                          <th key={i} className="border-2 border-gray-600 bg-blue-900 text-center align-middle px-2">
                            <div className="font-black text-white text-base leading-tight">{classInfo.className}</div>
                            {classInfo.gradeName && (
                              <div className="text-yellow-300 font-semibold mt-0.5 text-xs">{classInfo.gradeName}</div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allPeriods.map(period => {
                        const firstSlot = Object.values(fullWeekGrid[selectedDay][period] || {})[0] as any;
                        const isActive = period === activePeriod;
                        return (
                          <tr key={period} style={{ height: '120px' }}>
                            <td className={`border-2 text-center align-middle font-black ${
                              isActive ? 'border-yellow-400 bg-yellow-900 text-yellow-200' : 'border-gray-600 bg-gray-900 text-gray-200'
                            }`}>
                              <div className="text-2xl">{period}º</div>
                              <div className="text-xs font-mono text-gray-400 mt-1">{firstSlot?.startTime}–{firstSlot?.endTime}</div>
                              {isActive && <div className="text-xs text-yellow-300 animate-pulse mt-1">⏰ AGORA</div>}
                            </td>
                            {allClasses.map((classInfo, ci) => {
                              const classKey = `${classInfo.className}|||${classInfo.gradeName || ''}`;
                              const editKey = `${period}|||${classKey}`;
                              const originalSlot = (fullWeekGrid[selectedDay][period] || {} as any)[classKey];
                              const editedValue = manualEdits[editKey];
                              const currentSubject = editedValue?.subjectName ?? originalSlot?.subjectName ?? '';
                              const currentTeacher = editedValue?.teacherName ?? originalSlot?.teacherName ?? '';
                              return (
                                <td key={ci} className={`border-2 p-2 align-middle ${
                                  isActive ? 'border-yellow-500 bg-yellow-950' : 'border-gray-700 bg-gray-800'
                                }`}>
                                  <div className="flex flex-col gap-1.5">
                                    <select
                                      value={currentSubject}
                                      onChange={(e) => setManualEdits(prev => ({
                                        ...prev,
                                        [editKey]: { subjectName: e.target.value, teacherName: currentTeacher }
                                      }))}
                                      className="w-full bg-gray-700 text-white border border-gray-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    >
                                      <option value="">— Disciplina —</option>
                                      {uniqueSubjects.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={currentTeacher}
                                      onChange={(e) => setManualEdits(prev => ({
                                        ...prev,
                                        [editKey]: { subjectName: currentSubject, teacherName: e.target.value }
                                      }))}
                                      className="w-full bg-gray-700 text-white border border-gray-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                      <option value="">— Professor —</option>
                                      {uniqueTeachers.map(t => (
                                        <option key={t.id} value={t.name}>{t.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              );
            }

            // ── FORA DO HORÁRIO ESCOLAR / INTERVALO ─────────────────────────
            if (activePeriod === null) {
              // Detectar se estamos num intervalo configurado no Schedule (breaks)
              const nowB = currentTime;
              const nowMin = nowB.getHours() * 60 + nowB.getMinutes();
              const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

              let activeBreak: { label: string; startTime: string; endTime: string } | null = null;
              if (scheduleBreaks.length > 0) {
                activeBreak = scheduleBreaks.find(br => br.startTime && br.endTime &&
                  nowMin >= toMin(br.startTime) && nowMin < toMin(br.endTime)) || null;
              }

              // Fallback heurístico caso não haja breaks cadastrados
              let nextStart: Date | null = null;
              for (const p of allPeriods) {
                const sl = timetables.find(s => s.period === p && s.day === selectedDay && s.startTime);
                if (sl) {
                  const [sh, sm] = sl.startTime.split(':').map(Number);
                  const st = new Date(nowB); st.setHours(sh, sm, 0, 0);
                  if (st > nowB && (!nextStart || st < nextStart)) nextStart = st;
                }
              }

              const retornoStr = activeBreak?.endTime
                || (nextStart ? `${String(nextStart.getHours()).padStart(2,'0')}:${String(nextStart.getMinutes()).padStart(2,'0')}` : '');

              // Se não há breaks cadastrados, tentar heurística de gap
              if (!activeBreak && scheduleBreaks.length === 0) {
                let lastEnd: Date | null = null;
                for (const p of allPeriods) {
                  const sl = timetables.find(s => s.period === p && s.day === selectedDay && s.endTime);
                  if (sl) {
                    const [eh, em] = sl.endTime.split(':').map(Number);
                    const end = new Date(nowB); end.setHours(eh, em, 59, 999);
                    if (end < nowB && (!lastEnd || end > lastEnd)) lastEnd = end;
                  }
                }
                const isBreakHeuristic = !!(lastEnd && nextStart);
                if (isBreakHeuristic) {
                  const gapMin = (nextStart!.getTime() - lastEnd!.getTime()) / 60000;
                  const hourNow = nowB.getHours();
                  activeBreak = {
                    label: (gapMin >= 25 && hourNow >= 10 && hourNow <= 14) ? 'Almoço' : 'Lanche',
                    startTime: `${String(lastEnd!.getHours()).padStart(2,'0')}:${String(lastEnd!.getMinutes()).padStart(2,'0')}`,
                    endTime: retornoStr,
                  };
                }
              }

              if (activeBreak) {
                const isAlmoco = activeBreak.label === 'Almoço';
                const emoji = activeBreak.label === 'Almoço' ? '🍽️' : activeBreak.label === 'Lanche Tarde' ? '🍎' : '☕';
                const titulo = activeBreak.label === 'Almoço' ? 'HORÁRIO DE ALMOÇO' : activeBreak.label.toUpperCase();
                return (
                  <div className="flex flex-col items-center justify-center py-10 gap-8">
                    <div className={`text-center px-8 py-10 rounded-3xl border-4 shadow-2xl w-full mx-auto ${
                      isAlmoco ? 'bg-amber-950 border-amber-500' : 'bg-blue-950 border-blue-400'
                    }`}>
                      <div className="text-8xl mb-4 select-none">{emoji}</div>
                      <h2 className={`text-5xl font-black mb-3 ${isAlmoco ? 'text-amber-400' : 'text-blue-300'}`}>
                        {titulo}
                      </h2>
                      <p className="text-2xl text-gray-300 mb-2">
                        {selectedDay.toUpperCase()} — {currentTime.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                      </p>
                      {retornoStr && (
                        <p className={`text-xl font-bold ${isAlmoco ? 'text-amber-300' : 'text-blue-300'}`}>
                          ⏰ Aulas retornam às {retornoStr}
                        </p>
                      )}
                    </div>

                    {/* Música ambiente */}
                    <div className="w-full mx-auto">
                      <p className="text-center text-gray-400 text-lg mb-4 font-semibold tracking-wide">🎵 Música Ambiente</p>
                      <div className="flex gap-6 justify-center flex-wrap">
                        <button
                          onClick={() => window.open('https://www.youtube.com/results?search_query=musica+gospel+instrumental+suave', '_blank')}
                          className="flex flex-col items-center gap-2 px-10 py-6 bg-yellow-700 hover:bg-yellow-600 text-white rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-lg"
                        >
                          <span className="text-4xl">🙏</span>
                          Gospel Instrumental
                        </button>
                        <button
                          onClick={() => window.open('https://www.youtube.com/results?search_query=musica+instrumental+internacional+relaxante+classica', '_blank')}
                          className="flex flex-col items-center gap-2 px-10 py-6 bg-indigo-700 hover:bg-indigo-600 text-white rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-lg"
                        >
                          <span className="text-4xl">🎼</span>
                          Internacional
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="text-center py-24">
                  <Clock size={80} className="mx-auto mb-4 text-gray-500" />
                  <h2 className="text-4xl font-bold text-white mb-3">Fora do Horário Escolar</h2>
                  <p className="text-xl text-gray-400">
                    {selectedDay.toUpperCase()} — {currentTime.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              );
            }

            // ── AUTO ou MANUAL SALVO: linha única com período atual ──────────
            const periodSlots = fullWeekGrid[selectedDay][activePeriod] || {};
            const firstSlotInPeriod = Object.values(periodSlots)[0] as any;
            const COL_W = 160;
            const totalW = 180 + allClasses.length * COL_W;

            return (
              <>
                {isAdmin && !autoChangePeriod && manualSaved && (
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <div className="text-green-400 font-bold text-lg">✅ Horário manual salvo — mudando automaticamente por período</div>
                    <button
                      onClick={() => setManualSaved(false)}
                      className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg"
                    >
                      ✏️ EDITAR
                    </button>
                  </div>
                )}
                <table className="border-collapse w-full" style={{ tableLayout: 'fixed', minWidth: `${totalW}px` }}>
                  <colgroup>
                    <col style={{ width: '180px' }} />
                    {allClasses.map((_, i) => (
                      <col key={i} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr style={{ height: '90px' }}>
                      <th className="border-2 border-gray-600 bg-gray-900 text-yellow-400 text-center font-black align-middle" style={{ fontSize: '1.1rem' }}>
                        TURMAS
                      </th>
                      {allClasses.map((classInfo, i) => (
                        <th key={i} className="border-2 border-gray-600 bg-blue-900 text-center align-middle px-1" style={{ height: '90px' }}>
                          <div className="font-black text-white leading-tight" style={{ fontSize: '1.2rem' }}>{classInfo.className}</div>
                          {classInfo.gradeName && (
                            <div className="text-yellow-300 font-semibold mt-1" style={{ fontSize: '0.82rem' }}>{classInfo.gradeName}</div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ height: '180px' }}>
                      <td className={`border-2 text-center align-middle px-2 font-black ${
                        isOngoing ? 'border-green-400 bg-green-900 text-green-300' : 'border-yellow-500 bg-yellow-950 text-yellow-300'
                      }`} style={{ height: '180px' }}>
                        <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>{activePeriod}º</div>
                        <div className="font-mono font-bold mt-1" style={{ fontSize: '1rem' }}>{firstSlotInPeriod?.startTime}</div>
                        <div className="text-gray-400 font-mono" style={{ fontSize: '0.85rem' }}>até {firstSlotInPeriod?.endTime}</div>
                        <div className={`mt-2 rounded px-1 py-0.5 font-bold ${
                          isOngoing ? 'bg-green-500 text-white animate-pulse' : 'bg-yellow-500 text-black'
                        }`} style={{ fontSize: '0.78rem' }}>
                          {isOngoing ? '● EM ANDAMENTO' : '⏳ PRÓXIMO'}
                        </div>
                      </td>
                      {allClasses.map((classInfo, i) => {
                        const classKey = `${classInfo.className}|||${classInfo.gradeName || ''}`;
                        const editKey = `${activePeriod}|||${classKey}`;
                        const originalSlot = (periodSlots as any)[classKey];
                        const editedValue = manualSaved ? manualEdits[editKey] : undefined;
                        const subjectName = editedValue?.subjectName || originalSlot?.subjectName;
                        const teacherName = editedValue?.teacherName || originalSlot?.teacherName;

                        if (!subjectName && !teacherName) {
                          return (
                            <td key={i} className="border-2 border-gray-700 bg-gray-900 text-center align-middle" style={{ height: '180px' }}>
                              <div className="text-gray-500 font-bold" style={{ fontSize: '1rem' }}>HORÁRIO</div>
                              <div className="text-gray-500 font-bold" style={{ fontSize: '1rem' }}>VAGO</div>
                            </td>
                          );
                        }

                        const slotForStatus = originalSlot || { day: selectedDay, startTime: firstSlotInPeriod?.startTime, endTime: firstSlotInPeriod?.endTime };
                        const status = getSlotStatus(slotForStatus);

                        // ── Modo edição inline (somente admin) ──────────────────────────
                        if (isAdmin && editingCell === editKey) {
                          const curSubj = manualEdits[editKey]?.subjectName || subjectName || '';
                          const curTeacher = manualEdits[editKey]?.teacherName || teacherName || '';
                          return (
                            <td key={i} className="border-2 border-blue-400 bg-blue-950 text-center align-middle px-1" style={{ height: '180px' }}>
                              <div className="flex flex-col gap-1 p-1">
                                <select
                                  value={curSubj}
                                  onChange={e => setManualEdits(prev => ({ ...prev, [editKey]: { subjectName: e.target.value, teacherName: prev[editKey]?.teacherName ?? curTeacher } }))}
                                  className="bg-gray-800 text-white rounded border border-gray-600 p-1 w-full"
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  <option value="">— Disciplina —</option>
                                  {uniqueSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                                <select
                                  value={curTeacher}
                                  onChange={e => setManualEdits(prev => ({ ...prev, [editKey]: { subjectName: prev[editKey]?.subjectName ?? curSubj, teacherName: e.target.value } }))}
                                  className="bg-gray-800 text-white rounded border border-gray-600 p-1 w-full"
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  <option value="">— Professor —</option>
                                  {uniqueTeachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                                <div className="flex gap-1 justify-center mt-1">
                                  <button
                                    onClick={() => setEditingCell(null)}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded font-bold"
                                    style={{ fontSize: '0.8rem' }}
                                  >✓ OK</button>
                                  <button
                                    onClick={() => {
                                      setManualEdits(prev => { const n = { ...prev }; delete n[editKey]; return n; });
                                      setEditingCell(null);
                                    }}
                                    className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded font-bold"
                                    style={{ fontSize: '0.8rem' }}
                                  >✗</button>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={i}
                            onClick={isAdmin ? () => setEditingCell(editKey) : undefined}
                            className={`border-2 text-center align-middle px-2 transition-all duration-300 ${
                              status === 'ongoing' ? 'border-green-500' : status === 'upcoming' ? 'border-yellow-500' : 'border-gray-600'
                            } ${isAdmin ? 'cursor-pointer hover:border-blue-400' : ''}`}
                            style={{
                              height: '180px',
                              backgroundColor: originalSlot?.subjectColor
                                ? `${originalSlot.subjectColor}${isOngoing ? 'cc' : '55'}`
                                : isOngoing ? '#14532d' : '#1e3a5f',
                            }}>
                            <div className="font-black text-white leading-tight" style={{ fontSize: '1.1rem' }} title={subjectName}>
                              {subjectName}
                            </div>
                            <div className="text-gray-200 mt-2" style={{ fontSize: '0.85rem' }} title={teacherName}>
                              👨‍🏫 {teacherName}
                            </div>
                            {status === 'ongoing' && (
                              <div className="mt-2 text-green-400 font-bold animate-pulse" style={{ fontSize: '0.75rem' }}>● EM ANDAMENTO</div>
                            )}
                            {isAdmin && (
                              <div className="mt-1 text-blue-400 opacity-60" style={{ fontSize: '0.7rem' }}>✏️ editar</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </>
            );
          })()}
          </div>
        </>
      )}

      {/* MODO DISPLAY/LETREIRO - Mostra apenas período atual em tela cheia */}
      {!isLoadingAvailable && availableTimetables.length > 0 && viewMode === 'display' && (
        <div className="space-y-4">
          {Object.keys(fullWeekGrid[selectedDay] || {}).length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={80} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-4xl font-bold text-white mb-4">
                Sem Aulas em {selectedDay}
              </h2>
              <p className="text-xl text-gray-400 mt-4">
                💡 Selecione outro dia acima para ver os horários disponíveis.
              </p>
            </div>
          ) : (() => {
            // Encontrar o período atual ou próximo
            const now = currentTime;
            let currentPeriod = allPeriods[currentPeriodIndex];
            
            // Auto-detectar período atual baseado no horário (SOMENTE SE ATIVADO)
            if (autoChangePeriod) {
              for (const period of allPeriods) {
                const periodSlots = fullWeekGrid[selectedDay][period] || {};
                const firstSlot = Object.values(periodSlots)[0];
                if (firstSlot && firstSlot.startTime && firstSlot.endTime) {
                  const [startHour, startMinute] = firstSlot.startTime.split(':').map(Number);
                  const [endHour, endMinute] = firstSlot.endTime.split(':').map(Number);
                  const startTime = new Date(now);
                  startTime.setHours(startHour, startMinute, 0, 0);
                  const endTime = new Date(now);
                  endTime.setHours(endHour, endMinute, 0, 0);
                  
                  // Se está neste período ou próximo (30 min antes)
                  const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);
                  if ((now >= startTime && now <= endTime) || (diffMinutes > 0 && diffMinutes <= 30)) {
                    currentPeriod = period;
                    break;
                  }
                }
              }
            }
            
            const periodSlots = fullWeekGrid[selectedDay][currentPeriod] || {};
            const firstSlot = Object.values(periodSlots)[0];
            if (!firstSlot) return null;

            return (
              <>
                {/* Cabeçalho Gigante */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 rounded-2xl p-6 border-4 border-yellow-500 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="bg-yellow-500 text-gray-900 font-black text-6xl px-8 py-4 rounded-xl shadow-lg">
                        {currentPeriod}º
                      </div>
                      <div>
                        <div className="text-5xl font-mono font-black text-white mb-2">
                          {firstSlot.startTime} - {firstSlot.endTime}
                        </div>
                        <div className="text-2xl text-yellow-400 font-bold flex items-center gap-3">
                          {selectedDay.toUpperCase()} • {allClasses.length} TURMA(S)
                          {autoChangePeriod ? (
                            <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full animate-pulse">
                              ⏰ AUTO
                            </span>
                          ) : (
                            <span className="bg-gray-600 text-white text-sm px-3 py-1 rounded-full">
                              🔒 MANUAL
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Navegação Manual */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setCurrentPeriodIndex(Math.max(0, allPeriods.indexOf(currentPeriod) - 1));
                          playBellSound();
                        }}
                        disabled={allPeriods.indexOf(currentPeriod) === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold text-2xl px-6 py-3 rounded-lg transition-all"
                      >
                        ◀ Anterior
                      </button>
                      <button
                        onClick={() => {
                          setCurrentPeriodIndex(Math.min(allPeriods.length - 1, allPeriods.indexOf(currentPeriod) + 1));
                          playBellSound();
                        }}
                        disabled={allPeriods.indexOf(currentPeriod) === allPeriods.length - 1}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold text-2xl px-6 py-3 rounded-lg transition-all"
                      >
                        Próximo ▶
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid de Cards GIGANTES */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3">
                  {allClasses.map((classObj, classIndex) => {
                    const className = classObj.className;
                    const gradeName = classObj.gradeName;
                    const classKey = `${className}|||${gradeName || ''}`;
                    const slot = periodSlots[classKey];
                    // Buscar série diretamente no allClassesList
                    const classInfo = allClassesList.find(c => c.className === className);
                    if (!slot) {
                      return (
                        <div key={`display-empty-${currentPeriod}-${classIndex}-${className}`} className="bg-gray-700 rounded-xl p-4 border-4 border-gray-600 opacity-30 min-h-[160px]">
                          <div className="text-center space-y-2">
                            <div className="font-black text-2xl text-gray-400">{className}</div>
                            {gradeName && (
                              <div className="font-bold text-lg text-yellow-300">{gradeName}</div>
                            )}
                            <div className="text-lg text-gray-500 mt-2">LIVRE</div>
                          </div>
                        </div>
                      );
                    }

                    const status = getSlotStatus(slot);
                    const isActive = status === 'ongoing' || status === 'upcoming';

                    return (
                      <div 
                        key={`display-slot-${currentPeriod}-${classIndex}-${className}`} 
                        className={`rounded-xl p-4 border-4 min-h-[160px] transition-all duration-300 ${
                          status === 'ongoing' 
                            ? 'border-green-500 bg-green-900 ring-4 ring-green-400 animate-pulse shadow-2xl scale-105' 
                            : status === 'upcoming'
                            ? 'border-yellow-500 bg-yellow-900 ring-4 ring-yellow-400 shadow-xl scale-105'
                            : 'border-blue-500 bg-blue-900 hover:scale-105'
                        }`}
                        style={{ 
                          backgroundColor: isActive ? undefined : (slot.subjectColor ? `${slot.subjectColor}30` : undefined)
                        }}
                      >
                        <div className="text-center space-y-2 h-full flex flex-col justify-between">
                          {/* Turma e Série */}
                          <div className="bg-black bg-opacity-50 rounded-lg py-1 px-2">
                            <div className="font-black text-3xl text-white leading-tight">
                              {className}
                            </div>
                            {slot.gradeName && (
                              <div className="font-bold text-lg text-yellow-300 mt-1">
                                {slot.gradeName}
                              </div>
                            )}
                          </div>
                          
                          {/* Disciplina */}
                          <div 
                            className="font-black text-lg px-2 py-1 rounded-lg text-white shadow-lg truncate"
                            style={{ backgroundColor: slot.subjectColor || '#3B82F6' }}
                            title={slot.subjectName}
                          >
                            {slot.subjectName}
                          </div>

                          {/* Professor */}
                          <div className="text-base text-gray-100 font-semibold flex items-center justify-center gap-1 bg-black bg-opacity-30 rounded-lg py-1">
                            <User size={16} />
                            <span className="truncate" title={slot.teacherName}>{slot.teacherName}</span>
                          </div>

                          {/* Status */}
                          {status === 'ongoing' && (
                            <div className="text-base font-black bg-green-500 text-white rounded-lg py-1 shadow-lg animate-bounce">
                              🔴 AGORA
                            </div>
                          )}
                          {status === 'upcoming' && (
                            <div className="text-base font-black bg-yellow-500 text-black rounded-lg py-1 shadow-lg animate-bounce">
                              ⚠️ PRÓXIMA
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* VISUALIZAÇÃO ESTILO AEROPORTO - Painel de Letreiro */}
      {!isLoadingAvailable && availableTimetables.length > 0 && viewMode === 'airport' && (
        <div className="space-y-2">
          {/* Título do Modo - Mais compacto */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg p-2 border-2 border-yellow-500">
            <h2 className="text-3xl font-bold text-center text-yellow-400 tracking-wider">
              ✈️ {selectedDay.toUpperCase()} - HORÁRIOS
            </h2>
          </div>

          {/* Grid de Aulas Estilo Aeroporto */}
          {Object.keys(fullWeekGrid[selectedDay] || {}).length === 0 ? (
            <div className="text-center py-10">
              <BookOpen size={60} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-3xl font-bold text-white mb-2">
                Sem Aulas em {selectedDay}
              </h2>
              <p className="text-lg text-yellow-400 mt-3">
                💡 Selecione outro dia acima para ver os horários.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
              {allPeriods.map(period => {
                const periodSlots = fullWeekGrid[selectedDay][period] || {};
                const firstSlot = Object.values(periodSlots)[0];
                if (!firstSlot) return null;

                return (
                  <div key={period} className="bg-gray-800 rounded-lg border-2 border-gray-600 overflow-hidden">
                    {/* Cabeçalho do Período - Compacto */}
                    <div className="bg-gradient-to-r from-blue-800 to-blue-900 px-4 py-2 border-b-2 border-yellow-500 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-500 text-gray-900 font-bold text-xl px-3 py-1 rounded">
                          {period}º
                        </div>
                        <div className="text-xl font-mono font-bold text-white">
                          {firstSlot.startTime} - {firstSlot.endTime}
                        </div>
                      </div>
                      <div className="text-lg text-yellow-400 font-semibold">
                        {Object.keys(periodSlots).length} turma(s)
                      </div>
                    </div>

                    {/* Cards das Turmas - Grid Denso */}
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-2">
                      {allClasses.map((classObj, classIndex) => {
                        const className = classObj.className;
                        const gradeName = classObj.gradeName;
                        const classKey = `${className}|||${gradeName || ''}`;
                        const slot = periodSlots[classKey];
                        const classInfo = allClassesList.find(c => c.className === className);
                        if (!slot) {
                          return (
                            <div key={`airport-empty-${classIndex}-${className}`} className="bg-gray-700 rounded p-2 border border-gray-600 opacity-40">
                              <div className="text-center">
                                <div className="font-bold text-sm text-gray-400 truncate">{className}</div>
                                <div className="text-xs text-gray-500">LIVRE</div>
                              </div>
                            </div>
                          );
                        }

                        const status = getSlotStatus(slot);
                        const statusColor = status === 'ongoing' ? 'border-green-400 bg-green-900 ring-2 ring-green-500' :
                                          status === 'upcoming' ? 'border-yellow-400 bg-yellow-900 ring-2 ring-yellow-500' :
                                          status === 'completed' ? 'border-gray-500 bg-gray-700' :
                                          'border-blue-500 bg-blue-900';

                        return (
                          <div 
                            key={`airport-slot-${classIndex}-${className}`} 
                            className={`rounded p-2 border-2 ${statusColor} transition-all duration-200 hover:scale-105 hover:z-10 relative`}
                            style={{ 
                              backgroundColor: slot.subjectColor ? `${slot.subjectColor}25` : undefined,
                              minHeight: '85px'
                            }}
                          >
                            <div className="text-center space-y-1">
                              {/* Turma - Destaque */}
                              <div className="font-black text-base text-white bg-black bg-opacity-40 rounded px-1 truncate">
                                {className}
                              </div>
                              
                              {/* Disciplina - Compacta */}
                              <div 
                                className="font-bold text-xs px-1 py-0.5 rounded text-white truncate"
                                style={{ backgroundColor: slot.subjectColor || '#3B82F6' }}
                                title={slot.subjectName}
                              >
                                {slot.subjectName}
                              </div>

                              {/* Professor - Compacto */}
                              <div className="text-xs text-gray-200 flex items-center justify-center gap-1 truncate" title={slot.teacherName}>
                                <User size={10} />
                                <span className="truncate text-xs">{slot.teacherName?.split(' ')[0]}</span>
                              </div>

                              {/* Status Badge - Mais visível */}
                              {status === 'ongoing' && (
                                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                  <span className="text-xs">●</span>
                                </div>
                              )}
                              {status === 'upcoming' && (
                                <div className="absolute -top-1 -right-1 bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                  <span className="text-xs">!</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISUALIZAÇÃO EM CARDS (Alternativa) */}
      {!isLoadingAvailable && availableTimetables.length > 0 && viewMode === 'cards' && (
        <>
          {/* Aulas em Andamento */}
          {ongoingSlots.length > 0 && (
            <section className="mb-8">
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                AULAS EM ANDAMENTO
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ongoingSlots.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} status="ongoing" />
                ))}
              </div>
            </section>
          )}

          {/* Próximas Aulas */}
          {upcomingSlots.length > 0 && (
            <section className="mb-8">
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                <Clock className="text-yellow-400" />
                PRÓXIMAS AULAS (30 min)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingSlots.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} status="upcoming" />
                ))}
              </div>
            </section>
          )}

          {/* Demais Aulas do Dia */}
          {scheduledSlots.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                <BookOpen className="text-blue-400" />
                AULAS AGENDADAS HOJE
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {scheduledSlots.slice(0, 8).map((slot) => (
                  <SlotCard key={slot.id} slot={slot} status="scheduled" compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Créditos do desenvolvedor — exibido quando não há aulas no dia */}
      {timetables.length > 0 && todaySlots.length === 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-gray-800 bg-opacity-60 backdrop-blur-sm border border-gray-700 rounded-xl px-6 py-3 text-center shadow-lg">
            <p className="text-gray-400 text-xs tracking-wide">
              Desenvolvido por{' '}
              <span className="text-gray-300 font-semibold">Wander Pires Silva Coelho</span>
              <span className="mx-2 text-gray-600">·</span>
              <span className="text-blue-400">wanderpsc@gmail.com</span>
              <span className="mx-2 text-gray-600">·</span>
              <span className="text-gray-500">© 2025</span>
            </p>
          </div>
        </div>
      )}

      {/* ===== MODAL: Configuração do Sábado ===== */}
      {showSaturdayDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-85 backdrop-blur-sm">
          <div className="bg-gray-900 border-4 border-yellow-500 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">📅</div>
              <h2 className="text-3xl font-black text-yellow-400 mb-1">É SÁBADO!</h2>
              <p className="text-gray-300 text-lg">Este sábado é <strong className="text-white">letivo</strong>?</p>
            </div>

            {/* Botões Letivo / Não Letivo */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSaturdayIsLetivo(true)}
                className={`flex-1 py-4 rounded-xl font-black text-xl transition-all ${
                  saturdayIsLetivo === true
                    ? 'bg-green-600 text-white ring-4 ring-green-400 scale-105 shadow-xl'
                    : 'bg-gray-700 text-gray-300 hover:bg-green-700 hover:text-white'
                }`}
              >
                ✅ SIM, É LETIVO
              </button>
              <button
                onClick={() => setSaturdayIsLetivo(false)}
                className={`flex-1 py-4 rounded-xl font-black text-xl transition-all ${
                  saturdayIsLetivo === false
                    ? 'bg-red-600 text-white ring-4 ring-red-400 scale-105 shadow-xl'
                    : 'bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white'
                }`}
              >
                ❌ NÃO É LETIVO
              </button>
            </div>

            {/* Seletor de dia de referência — apenas se letivo */}
            {saturdayIsLetivo === true && (
              <div className="mb-6">
                <p className="text-gray-300 text-lg mb-3 text-center font-semibold">
                  📆 Qual dia da semana este sábado segue?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const).map(day => (
                    <button
                      key={day}
                      onClick={() => setSaturdayRefDay(day)}
                      className={`py-3 rounded-xl font-bold text-lg transition-all ${
                        saturdayRefDay === day
                          ? 'bg-yellow-500 text-gray-900 ring-4 ring-yellow-300 scale-105 shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-center text-yellow-400 text-sm mt-3">
                  O painel exibirá o horário de <strong>{saturdayRefDay}</strong>
                </p>
              </div>
            )}

            {/* Botão Confirmar */}
            {saturdayIsLetivo !== null && (
              <button
                onClick={() => handleSaturdayConfirm(saturdayIsLetivo!, saturdayRefDay)}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-black text-2xl rounded-xl shadow-lg transition-all hover:scale-105 mt-2"
              >
                CONFIRMAR
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== OVERLAY: Sábado Não Letivo ===== */}
      {saturdayIsLetivo === false && !showSaturdayDialog && (
        <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-gray-950 bg-opacity-97">
          <div className="text-9xl mb-6 select-none">🏖️</div>
          <h1 className="text-6xl font-black text-white mb-4 tracking-wide">SÁBADO NÃO LETIVO</h1>
          <p className="text-2xl text-gray-400 mb-10">Não há aulas hoje</p>
          <button
            onClick={() => {
              setSaturdayIsLetivo(null);
              setSaturdayRefDay('Segunda');
              setShowSaturdayDialog(true);
            }}
            className="px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-black text-xl rounded-xl shadow-2xl transition-all hover:scale-105"
          >
            ⚙️ Reconfigurar
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-700 text-center text-gray-400">
        <p className="text-sm">
          © 2025 Sistema Criador de Horário de Aula Escolar - Wander Pires Silva Coelho
        </p>
        <p className="text-xs mt-1">
          Atualização automática a cada {refreshInterval} segundos
        </p>
      </footer>

      {/* Botão Flutuante de Simulação de Data/Hora */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Indicador de simulação ativa */}
        {overrideDateTime && !showSimulator && (
          <div className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse shadow-lg">
            ⚠ SIMULAÇÃO: {new Date(overrideDateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Painel de simulação expandido */}
        {showSimulator && (
          <div className="bg-gray-800 border-2 border-orange-500 rounded-xl p-5 shadow-2xl w-80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-orange-400" />
                <span className="text-white font-bold text-lg">Simular Data/Hora</span>
              </div>
              <button
                onClick={() => setShowSimulator(false)}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-400 text-xs mb-3">
              Escolha uma data e hora para testar como o painel ficaria naquele momento.
            </p>
            <input
              type="datetime-local"
              value={overrideDateTime}
              onChange={(e) => setOverrideDateTime(e.target.value)}
              className={`w-full bg-gray-900 text-white border-2 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 ${
                overrideDateTime 
                  ? 'border-orange-500 focus:ring-orange-400' 
                  : 'border-gray-600 focus:ring-gray-400'
              }`}
            />
            {overrideDateTime && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-orange-400 text-sm font-semibold animate-pulse">
                  ⚠ Simulação ativa
                </span>
                <button
                  onClick={() => setOverrideDateTime('')}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  ✕ Voltar ao Tempo Real
                </button>
              </div>
            )}
          </div>
        )}

        {/* Botão toggle */}
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className={`p-4 rounded-full shadow-2xl text-xl transition-all hover:scale-110 ${
            overrideDateTime
              ? 'bg-orange-600 hover:bg-orange-700 text-white ring-4 ring-orange-400 animate-pulse'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 ring-2 ring-gray-500'
          }`}
          title="Simular data/hora para teste"
        >
          <Calendar size={24} />
        </button>
      </div>
    </div>
  );
}

// Componente de Card de Aula
interface SlotCardProps {
  slot: TimetableSlot;
  status: SlotStatus;
  compact?: boolean;
}

function SlotCard({ slot, status, compact = false }: SlotCardProps) {
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  if (compact) {
    return (
      <div className={`${statusColor} border-2 rounded-lg p-3 shadow-lg`}>
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold">{statusLabel}</span>
          <span className="text-sm font-mono">{slot.startTime}</span>
        </div>
        <h3 className="font-bold text-sm mb-1 truncate">{slot.subjectName}</h3>
        <p className="text-xs opacity-90 truncate">
          {slot.gradeName && <span className="font-semibold text-yellow-300">{slot.gradeName} - </span>}
          {slot.className}
        </p>
        <p className="text-xs opacity-80 truncate">{slot.teacherName}</p>
      </div>
    );
  }

  return (
    <div 
      className={`${statusColor} border-4 rounded-xl p-6 shadow-2xl transform transition-all hover:scale-105`}
      style={{ backgroundColor: slot.subjectColor ? `${slot.subjectColor}dd` : undefined }}
    >
      {/* Status Badge */}
      <div className="flex justify-between items-start mb-4">
        <span className="px-3 py-1 bg-black bg-opacity-30 rounded-full text-xs font-bold">
          {statusLabel}
        </span>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold">{slot.startTime}</div>
          <div className="text-sm opacity-90">{slot.endTime}</div>
        </div>
      </div>

      {/* Disciplina */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={20} />
          <span className="text-xs opacity-75">DISCIPLINA</span>
        </div>
        <h3 className="text-2xl font-bold">{slot.subjectName}</h3>
      </div>

      {/* Turma */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={18} />
          <span className="text-xs opacity-75">TURMA</span>
        </div>
        <p className="text-lg font-semibold">
          {slot.gradeName} - {slot.className}
        </p>
      </div>

      {/* Professor */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <User size={18} />
          <span className="text-xs opacity-75">PROFESSOR(A)</span>
        </div>
        <p className="text-lg font-semibold">{slot.teacherName}</p>
      </div>

      {/* Horário */}
      <div className="mt-4 pt-4 border-t border-white border-opacity-30">
        <div className="flex justify-between items-center">
          <span className="text-sm opacity-75">{slot.period}º Horário</span>
          <span className="text-sm opacity-75">{slot.day}</span>
        </div>
      </div>
    </div>
  );
}

// Helper functions (duplicadas do componente principal para uso interno)
function getStatusColor(status: SlotStatus): string {
  switch (status) {
    case 'ongoing':
      return 'bg-green-600 text-white border-green-700';
    case 'upcoming':
      return 'bg-yellow-500 text-black border-yellow-600';
    case 'completed':
      return 'bg-gray-400 text-gray-700 border-gray-500';
    case 'scheduled':
      return 'bg-blue-500 text-white border-blue-600';
    default:
      return 'bg-gray-300 text-gray-600 border-gray-400';
  }
}

function getStatusLabel(status: SlotStatus): string {
  switch (status) {
    case 'ongoing':
      return 'EM ANDAMENTO';
    case 'upcoming':
      return 'PRÓXIMA';
    case 'completed':
      return 'CONCLUÍDA';
    case 'scheduled':
      return 'AGENDADA';
    default:
      return '';
  }
}
