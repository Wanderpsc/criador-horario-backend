import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { Clock, Wifi, WifiOff, Grid3x3, List, BookOpen, MapPin, User } from 'lucide-react';

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
type ViewMode = 'grid' | 'cards' | 'airport' | 'display';

export default function DisplayPanel({ 

  autoRefresh = true, 
  refreshInterval = 60 
}: DisplayPanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('display'); // Começar com modo display (letreiro)
  const [lastAlertTime, setLastAlertTime] = useState<string>('');
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('Segunda'); // Dia selecionado para visualização
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0); // Para navegação manual
  const [isEmergencyMode, setIsEmergencyMode] = useState(false); // Modo emergencial
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string>(''); // ID do horário emergencial selecionado
  const [allClassesList, setAllClassesList] = useState<{ className: string; gradeName?: string }[]>([]); // Lista completa de turmas
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Log do modo de visualização
  useEffect(() => {
    console.log('🎨 Modo de visualização:', viewMode);
  }, [viewMode]);

  // Criar elemento de áudio para alertas
  useEffect(() => {
    try {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0PLPgDQGHG7A7+OZSA0PVKzn77BfHA==');
    } catch (error) {
      console.error('Erro ao inicializar áudio:', error);
    }
  }, []);

  // Buscar lista de horários disponíveis
  const { data: availableTimetables = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['availableTimetables'],
    queryFn: async () => {
      try {
        const response = await api.get('/generated-timetables/all');
        return response.data.data || [];
      } catch (error) {
        console.error('Erro ao buscar lista de horários:', error);
        return [];
      }
    },
    refetchInterval: false,
  });

  // Buscar horários emergenciais
  const { data: emergencySchedules = [], isLoading: isLoadingEmergency } = useQuery({
    queryKey: ['emergency-schedules'],
    queryFn: async () => {
      try {
        const response = await api.get('/emergency-schedules');
        return response.data.data || [];
      } catch (error) {
        console.error('Erro ao buscar horários emergenciais:', error);
        return [];
      }
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

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
    if (isEmergencyMode && emergencySchedules.length > 0 && !selectedEmergencyId) {
      const first = emergencySchedules[0];
      const firstId = first._id || first.id;
      console.log('🚨 Auto-selecionando horário emergencial:', new Date(first.date).toLocaleDateString('pt-BR'), '| ID:', firstId);
      setSelectedEmergencyId(firstId);
    }
  }, [isEmergencyMode, emergencySchedules, selectedEmergencyId]);

  // Selecionar automaticamente o dia atual na primeira carga
  useEffect(() => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const today = days[new Date().getDay()];
    if (['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].includes(today)) {
      setSelectedDay(today);
    }
  }, []);

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Alternar entre modos a cada 60 segundos (ou manter em grade)
  useEffect(() => {
    // Comentado: manter sempre em grade
    // const viewTimer = setInterval(() => {
    //   setViewMode(prev => prev === 'grid' ? 'cards' : 'grid');
    // }, 60000); // 60 segundos
    
    // return () => clearInterval(viewTimer);
  }, []);

  // Buscar horários gerados (com suporte a modo emergencial)
  const { data: timetables = [], isLoading, isError } = useQuery({
    queryKey: ['displayPanel', selectedTimetableId, isEmergencyMode, selectedEmergencyId],
    queryFn: async () => {
      if (!selectedTimetableId && !isEmergencyMode) {
        console.log('⏸️ Query pausada: nenhum horário selecionado');
        return [];
      }
      
      console.log('🔍 Modo:', isEmergencyMode ? 'EMERGENCIAL' : 'Normal');
      
      try {
        // Modo Emergencial: buscar do emergency-schedules
        if (isEmergencyMode) {
          if (!selectedEmergencyId) {
            console.log('⏸️ Aguardando seleção de horário emergencial');
            return [];
          }

          const response = await api.get('/emergency-schedules');
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
          
          const allSlots: TimetableSlot[] = [];
          const emergencySlots = selectedSchedule.emergencySlots || [];
          
          if (emergencySlots.length > 0) {
            console.log('🚨 Primeiro emergencySlot:', emergencySlots[0]);
            console.log('🚨 Campos do slot:', Object.keys(emergencySlots[0]));
          } else {
            console.error('❌ NENHUM emergencySlot encontrado! Array está vazio.');
          }
          
          // PASSO 1: Buscar TODAS as turmas do horário base (versão otimizada)
          console.log('🔍 Buscando turmas do horário base:', selectedSchedule.scheduleId);
          const emergencyClasses: { className: string; gradeName?: string }[] = [];
          const classIdsSet = new Set<string>();
          
          try {
            // Buscar horário base SEM popular (mais rápido) - apenas para pegar os classIds
            const allTimetablesResponse = await api.get('/generated-timetables/all');
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
                api.get(`/classes/${classId}`)
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
          setAllClassesList(emergencyClasses);
          setIsConnected(true);
          return allSlots;
        }
        
        // Modo Normal
        console.log('🔍 Buscando horário ID:', selectedTimetableId);
        
        const response = await api.get('/generated-timetables/all');
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
              
              // Processar todos os slots
              slots.forEach((slot: any) => {
                allSlots.push({
                  ...slot,
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
              const response = await api.get(`/classes/${classId}`);
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
        setAllClassesList(allClasses);
        setIsConnected(true);
        return allSlots;
      } catch (error: any) {
        console.error('Erro ao buscar horários:', error.message);
        setIsConnected(false);
        throw error;
      }
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    retry: 3,
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

  // Função para tocar alerta sonoro
  const playAlert = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Erro ao tocar som:', err));
    }
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
    // Usar a lista completa de turmas com className + gradeName
    const classes = allClassesList.length > 0 
      ? allClassesList // Manter o objeto completo {className, gradeName}
      : [...new Set(timetables.map(s => s.className))].map(name => ({ className: name, gradeName: undefined }));
    
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Carregando painel...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center">
        <div className="text-center text-white">
          <WifiOff size={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Erro ao Carregar</h1>
          <p className="text-xl mb-2">
            {isConnected ? 'Erro no servidor' : 'Sem Conexão'}
          </p>
          <p className="text-sm text-gray-300">Tentando reconectar...</p>
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
              {isEmergencyMode ? '🚨 HORÁRIO EMERGENCIAL' : '📚 GRADE DE HORÁRIOS'}
            </h1>
            <p className="text-xl text-yellow-400">
              {currentDay.toUpperCase()}, {currentTime.toLocaleDateString('pt-BR', { 
                day: 'numeric', 
                month: 'long'
              }).toUpperCase()}
            </p>
            
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
                onClick={() => setIsEmergencyMode(!isEmergencyMode)}
                className={`px-6 py-2 rounded-lg font-bold text-lg transition-all whitespace-nowrap ${
                  isEmergencyMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-400' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {isEmergencyMode ? '🚨 EMERGENCIAL' : '📅 Normal'}
              </button>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-5xl font-mono font-bold">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
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
                  const modes: ViewMode[] = ['display', 'airport', 'grid', 'cards'];
                  const currentIndex = modes.indexOf(viewMode);
                  const nextIndex = (currentIndex + 1) % modes.length;
                  setViewMode(modes[nextIndex]);
                }}
                className="ml-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title={`Modo: ${viewMode === 'display' ? 'Display' : viewMode === 'grid' ? 'Grade' : viewMode === 'airport' ? 'Aeroporto' : 'Cards'}`}
              >
                {viewMode === 'display' ? <Clock size={20} /> : viewMode === 'grid' ? <Grid3x3 size={20} /> : viewMode === 'airport' ? <Clock size={20} /> : <List size={20} />}
              </button>
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
                Não há aulas programadas para este dia.
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

      {/* MODO DISPLAY/LETREIRO - Mostra apenas período atual em tela cheia */}
      {!isLoadingAvailable && availableTimetables.length > 0 && viewMode === 'display' && (
        <div className="space-y-4">
          {Object.keys(fullWeekGrid[selectedDay] || {}).length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={80} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-4xl font-bold text-white mb-4">
                Sem Aulas em {selectedDay}
              </h2>
            </div>
          ) : (() => {
            // Encontrar o período atual ou próximo
            const now = currentTime;
            let currentPeriod = allPeriods[currentPeriodIndex];
            
            // Auto-detectar período atual baseado no horário
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
                        <div className="text-2xl text-yellow-400 font-bold">
                          {selectedDay.toUpperCase()} • {allClasses.length} TURMA(S)
                        </div>
                      </div>
                    </div>
                    
                    {/* Navegação Manual */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCurrentPeriodIndex(Math.max(0, allPeriods.indexOf(currentPeriod) - 1))}
                        disabled={allPeriods.indexOf(currentPeriod) === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold text-2xl px-6 py-3 rounded-lg"
                      >
                        ◀ Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPeriodIndex(Math.min(allPeriods.length - 1, allPeriods.indexOf(currentPeriod) + 1))}
                        disabled={allPeriods.indexOf(currentPeriod) === allPeriods.length - 1}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold text-2xl px-6 py-3 rounded-lg"
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

      {/* Mensagem se não houver aulas do dia atual */}
      {timetables.length > 0 && todaySlots.length === 0 && (
        <div className="text-center py-20">
          <Clock size={80} className="mx-auto mb-4 text-gray-500" />
          <h2 className="text-4xl font-bold text-white mb-4">
            Nenhuma aula agendada para hoje
          </h2>
          <p className="text-2xl text-gray-400 mb-2">
            {currentTime.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })}
          </p>
          <div className="mt-6 bg-blue-900 bg-opacity-50 rounded-lg p-6 max-w-2xl mx-auto">
            <p className="text-xl text-yellow-400 font-bold mb-2">
              📅 Dia da semana: {getCurrentDay()}
            </p>
            <p className="text-lg text-gray-300">
              ℹ️ Há {timetables.length} aula(s) cadastrada(s) em outros dias da semana
            </p>
            <p className="text-md text-gray-400 mt-4">
              Dica: Acesse o sistema e cadastre aulas para {getCurrentDay()}
            </p>
          </div>
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
