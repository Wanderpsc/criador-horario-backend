import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, AlertTriangle, Users, BookOpen, Clock, RefreshCw, Save, Printer, CheckCircle, Eye, Trash2, TrendingUp, Award, CheckSquare, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Teacher {
  _id: string;
  id?: string;
  name: string;
  email: string;
}

interface Subject {
  _id: string;
  id?: string;
  name: string;
  color: string;
}

interface Class {
  _id: string;
  id?: string;
  name: string;
  shift: 'morning' | 'afternoon' | 'evening';
  gradeId?: string;
  grade?: {
    id: string;
    name: string;
    level: string;
  };
}

interface TeacherDebt {
  teacherId: string;
  teacherName: string;
  totalDebts: number;
  debts: Array<{
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
    missedLessons: number;
    isAccumulated?: boolean; // Se veio de não comparecimento em sábado
  }>;
  accumulatedDebts?: number; // Total de débitos acumulados
  originalDebts?: number; // Total de débitos originais
}

interface MakeupSlot {
  period: number;
  startTime: string;
  endTime: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

export default function MakeupSaturdays() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [makeupSchedule, setMakeupSchedule] = useState<{ [classId: string]: MakeupSlot[] }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [wasHeld, setWasHeld] = useState(false); // Se o sábado foi realizado
  const [maxPeriods, setMaxPeriods] = useState(4); // Quantidade de aulas (1 a 8)
  const [lessonDuration, setLessonDuration] = useState(60); // Duração em minutos
  const [startTime, setStartTime] = useState('08:00'); // Horário de início
  const [selectedTeachersForSaturday, setSelectedTeachersForSaturday] = useState<Set<string>>(new Set()); // Professores selecionados para o sábado
  // Controle de presença por slot (chave: `${classId}-${period}`)
  const [confirmedSlots, setConfirmedSlots] = useState<Set<string>>(new Set());
  const [activeScheduleId, setActiveScheduleId] = useState<string>(''); // ID do sábado salvo em edição de presença
  const [showAttendancePanel, setShowAttendancePanel] = useState(false);
  const [showSaveTitleDialog, setShowSaveTitleDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');

  // Monitor de mudanças no makeupSchedule
  useEffect(() => {
    console.log('🔄 makeupSchedule atualizado!');
    console.log('📋 Novo valor:', makeupSchedule);
    console.log('📋 Keys:', Object.keys(makeupSchedule));
    console.log('📋 Quantidade de turmas:', Object.keys(makeupSchedule).length);
    if (Object.keys(makeupSchedule).length > 0) {
      console.log('✅ Horário visível agora!');
    } else {
      console.log('⚠️ Horário ainda vazio');
    }
  }, [makeupSchedule]);

  // Buscar professores, disciplinas e turmas
  const { data: teachersData } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data.data || res.data || [];
    }
  });
  const teachers = Array.isArray(teachersData) ? teachersData : [];

  const { data: subjectsData } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data.data || res.data || [];
    }
  });
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  const { data: classesData } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data.data || res.data || [];
    }
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  // Buscar horários emergenciais salvos
  const { data: emergencySchedules = [] } = useQuery({
    queryKey: ['emergency-schedules'],
    queryFn: async () => {
      const res = await api.get('/emergency-schedules');
      return res.data.data || res.data || [];
    }
  });

  // Buscar horários de sábado salvos
  const { data: savedMakeupSchedules = [] } = useQuery({
    queryKey: ['makeup-saturdays'],
    queryFn: async () => {
      try {
        // Verificar se está autenticado
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) {
          console.warn('⚠️ Usuário não autenticado');
          return [];
        }
        
        const res = await api.get('/saturday-makeup');
        return res.data.data || res.data || [];
      } catch (error: any) {
        console.error('❌ Erro ao buscar sábados salvos:', error);
        if (error.response?.status === 400) {
          console.error('⚠️ Erro 400: Provavelmente problema de autenticação');
        }
        return [];
      }
    }
  });

  // Calcular débitos dos professores com filtro de período
  const calculateTeacherDebts = (): TeacherDebt[] => {
    const debtsMap = new Map<string, TeacherDebt>();

    // Filtrar horários emergenciais pelo período selecionado
    const filteredSchedules = emergencySchedules.filter((schedule: any) => {
      if (!startDate && !endDate) return true; // Sem filtro, mostra todos
      
      // Normalizar datas para comparação (apenas YYYY-MM-DD, sem horas)
      // Suportar tanto string ISO quanto Date object
      let scheduleDateStr: string;
      if (typeof schedule.date === 'string') {
        // Se for string, verificar se é ISO ou não
        if (schedule.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          scheduleDateStr = schedule.date; // Já está em formato ISO
        } else {
          // String em outro formato, converter
          const dateObj = new Date(schedule.date);
          scheduleDateStr = dateObj.toISOString().split('T')[0];
        }
      } else {
        // Date object
        const scheduleDate = new Date(schedule.date);
        scheduleDateStr = scheduleDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
      }
      
      const startDateStr = startDate || '0000-01-01';
      const endDateStr = endDate || '9999-12-31';
      
      // Comparação de strings de data (funciona perfeitamente com formato ISO)
      if (scheduleDateStr < startDateStr) return false;
      if (scheduleDateStr > endDateStr) return false;
      
      return true;
    });

    console.log(`📅 Período: ${startDate || 'início'} até ${endDate || 'fim'}`);
    console.log(`📚 Horários emergenciais no período: ${filteredSchedules.length}`);
    console.log(`📋 Lista de horários emergenciais:`, filteredSchedules.map(s => ({
      title: s.title,
      date: s.date,
      makeupClassesCount: s.makeupClasses?.length || 0,
      absentTeachers: s.absentTeachersNames
    })));

    // Calcular aulas já repostas (por professor que compareceu)
    const realizedDebts = new Map<string, number>();
    savedMakeupSchedules.forEach((saved: any) => {
      const attendedTeachers = saved.attendedTeachers || [];
      if (saved.schedule && attendedTeachers.length > 0) {
        Object.values(saved.schedule).forEach((period: any) => {
          if (Array.isArray(period)) {
            period.forEach((slot: any) => {
              // Só conta se o professor está na lista de presença
              if (slot?.teacherId && attendedTeachers.includes(slot.teacherId)) {
                const current = realizedDebts.get(slot.teacherId) || 0;
                realizedDebts.set(slot.teacherId, current + 1);
              }
            });
          }
        });
      }
    });
    
    console.log('✅ Aulas já repostas por professor:', Object.fromEntries(realizedDebts));

    filteredSchedules.forEach((schedule: any, index: number) => {
      // Usar o campo makeupClasses que contém as aulas que precisam ser repostas
      const makeupClasses = schedule.makeupClasses || [];
      
      console.log(`\n📋 Horário ${index + 1}/${filteredSchedules.length}: ${schedule.title || 'Sem título'}`);
      console.log(`   📅 Data: ${schedule.date}`);
      console.log(`   📚 ${makeupClasses.length} aulas para reposição`);
      console.log(`   👥 Professores ausentes: ${schedule.absentTeachersNames || 'N/A'}`);
      console.log(`   📝 makeupClasses:`, makeupClasses);
      
      if (makeupClasses.length === 0) {
        console.warn(`   ⚠️ Este horário emergencial NÃO TEM makeupClasses!`);
        console.warn(`   ℹ️ Horário emergencial antigo sem dados de reposição - IGNORANDO`);
        return; // Pula para próximo horário - não criar débitos falsos
      }
      
      // Processar apenas makeupClasses válidos (que tenham classId e subjectId)
      makeupClasses.forEach((makeup: any, makeupIndex: number) => {
        console.log(`      🔍 makeupClass ${makeupIndex + 1}: ${makeup.originalTeacherName} - ${makeup.subjectName}`);
        
        // Filtrar makeupClasses inválidos (professores sem aula naquele dia)
        if (!makeup.classId || !makeup.subjectId || makeup.subjectName === 'N/A - Não tinha aula neste dia') {
          console.log(`      ⏭️ IGNORADO: ${makeup.originalTeacherName} (não tinha aula neste dia)`);
          return;
        }
        
        console.log(`      ✅ PROCESSANDO: ${makeup.originalTeacherName} - ${makeup.subjectName} em ${makeup.className}`);
        
        const teacherId = makeup.originalTeacherId;
        const teacherName = makeup.originalTeacherName;

        if (!debtsMap.has(teacherId)) {
          console.log(`         📝 Adicionando professor ${teacherName} ao mapa de débitos`);
          debtsMap.set(teacherId, {
            teacherId,
            teacherName,
            totalDebts: 0,
            debts: []
          });
        }

        const debt = debtsMap.get(teacherId)!;
        debt.totalDebts++;

        // Agrupar por disciplina e turma
        const existingDebt = debt.debts.find(
          d => d.subjectId === makeup.subjectId && d.classId === makeup.classId
        );

        if (existingDebt) {
          existingDebt.missedLessons++;
          console.log(`         ➕ Incrementando aulas existentes: ${existingDebt.missedLessons}`);
        } else {
          debt.debts.push({
            subjectId: makeup.subjectId,
            subjectName: makeup.subjectName || 'Desconhecido',
            classId: makeup.classId,
            className: makeup.className || 'Desconhecido',
            missedLessons: 1
          });
          console.log(`         ➕ Nova aula adicionada`);
        }
      });
    });

    console.log(`\n📊 Total de professores com débitos no mapa: ${debtsMap.size}`);
    console.log('📋 Débitos calculados por professor:');
    Array.from(debtsMap.values()).forEach(debt => {
      console.log(`   👨‍🏫 ${debt.teacherName}: ${debt.totalDebts} aula(s) devidas`);
      debt.debts.forEach(d => {
        console.log(`      - ${d.subjectName} em ${d.className}: ${d.missedLessons} aula(s)`);
      });
    });

    // Descontar aulas já repostas
    const finalDebts = Array.from(debtsMap.values()).map(debt => {
      const realized = realizedDebts.get(debt.teacherId) || 0;
      return {
        ...debt,
        totalDebts: debt.totalDebts - realized,
        realizedClasses: realized
      };
    }).filter(d => d.totalDebts > 0); // Remover professores sem débito

    console.log('🎯 Débitos finais após desconto:', finalDebts);

    return finalDebts;
  };

  // Ordenar por prioridade (mais débitos primeiro)
  const teacherDebts = calculateTeacherDebts().sort((a, b) => b.totalDebts - a.totalDebts);

  // Helper de prioridade visual
  const getTeacherPriorityInfo = (rank: number, totalDebts: number) => {
    if (rank === 0) return { badge: '🥇 #1 URGENTE', bgClass: 'bg-red-100 border-red-400', textClass: 'text-red-800', badgeClass: 'bg-red-600 text-white' };
    if (rank === 1) return { badge: '🥈 #2', bgClass: 'bg-orange-100 border-orange-400', textClass: 'text-orange-800', badgeClass: 'bg-orange-500 text-white' };
    if (rank === 2) return { badge: '🥉 #3', bgClass: 'bg-yellow-100 border-yellow-300', textClass: 'text-yellow-800', badgeClass: 'bg-yellow-500 text-white' };
    if (totalDebts >= 4) return { badge: `⚠️ #${rank + 1}`, bgClass: 'bg-yellow-50 border-yellow-200', textClass: 'text-yellow-700', badgeClass: 'bg-yellow-400 text-yellow-900' };
    return { badge: `#${rank + 1}`, bgClass: 'bg-gray-50 border-gray-200', textClass: 'text-gray-700', badgeClass: 'bg-gray-400 text-white' };
  };

  // Gerar horário automaticamente do backend (com professores selecionados)
  const generateFromBackend = async () => {
    if (!selectedDate) {
      toast.error('Selecione uma data primeiro');
      return;
    }
    
    if (selectedTeachersForSaturday.size === 0) {
      toast.error('Selecione pelo menos um professor');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🎯 Gerando horário automaticamente do backend...');
      console.log(`⏰ Configuração: ${maxPeriods} aulas de ${lessonDuration} minutos iniciando às ${startTime}`);
      console.log(`👥 Professores selecionados: ${Array.from(selectedTeachersForSaturday).length}`);
      
      const response = await api.post('/saturday-makeup/generate-from-debts', {
        date: selectedDate,
        maxPeriods,
        lessonDuration,
        startTime,
        selectedTeacherIds: Array.from(selectedTeachersForSaturday) // Envia apenas os selecionados
      });

      console.log('📥 Resposta completa do backend:', response);
      console.log('📦 response.data:', response.data);
      console.log('📦 response.data.data:', response.data.data);
      
      const { schedule, teacherDebts: dbTeacherDebts } = response.data.data;
      
      console.log('📋 Schedule extraído:', schedule);
      console.log('📋 Tipo do schedule:', typeof schedule);
      console.log('📋 Keys do schedule:', Object.keys(schedule || {}));
      console.log('📋 teacherDebts extraído:', dbTeacherDebts);
      
      setMakeupSchedule(schedule);
      console.log('✅ setMakeupSchedule chamado com:', schedule);
      
      toast.success(`✅ Horário gerado! ${dbTeacherDebts.length} professor(es) incluído(s)`);
      console.log('✅ Horário gerado do backend:', { schedule, teacherDebts: dbTeacherDebts });
    } catch (error: any) {
      console.error('❌ Erro ao gerar do backend:', error);
      toast.error('Erro ao gerar horário automaticamente');
    } finally {
      setIsGenerating(false);
    }
  };

  // Gerar horário de reposição automaticamente (frontend - método antigo)
  const generateMakeupSchedule = () => {
    console.log('🎯 Iniciando geração de horário de reposição...');
    console.log('📅 Data selecionada:', selectedDate);
    console.log('📊 Débitos de professores:', teacherDebts);
    console.log(`⏰ Configuração: ${maxPeriods} aulas de ${lessonDuration} minutos`);
    
    setIsGenerating(true);

    try {
      // 🎯 Gerar períodos baseados na configuração do usuário
      const basePeriods = [];
      let currentHour = 8; // Início às 8h
      let currentMinute = 0;

      for (let i = 1; i <= maxPeriods; i++) {
        const startHour = currentHour.toString().padStart(2, '0');
        const startMin = currentMinute.toString().padStart(2, '0');
        
        // Calcular horário de término
        const totalMinutes = currentMinute + lessonDuration;
        const endHour = currentHour + Math.floor(totalMinutes / 60);
        const endMinute = totalMinutes % 60;
        
        const endHourStr = endHour.toString().padStart(2, '0');
        const endMinStr = endMinute.toString().padStart(2, '0');

        basePeriods.push({
          period: i,
          startTime: `${startHour}:${startMin}`,
          endTime: `${endHourStr}:${endMinStr}`
        });

        // Atualizar para próximo período
        currentHour = endHour;
        currentMinute = endMinute;
      }

      console.log('📋 Períodos configurados:', basePeriods);

      const schedule: { [classId: string]: MakeupSlot[] } = {};

      // 🎯 MUDANÇA: Incluir TODOS os débitos, independente da quantidade de aulas por turma
      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 DISTRIBUINDO TODOS OS DÉBITOS POR TURMA/SÉRIE');
      console.log('═══════════════════════════════════════════════════════');

      // Distribuir as reposições por turma
      teacherDebts.forEach(teacherDebt => {
        console.log(`\n👨‍🏫 Professor: ${teacherDebt.teacherName} (${teacherDebt.totalDebts} aulas devidas)`);
        
        teacherDebt.debts.forEach(debt => {
          if (!schedule[debt.classId]) {
            schedule[debt.classId] = [];
          }

          console.log(`  📚 ${debt.subjectName} em ${debt.className}: ${debt.missedLessons} aula(s)`);

          // ✅ CORRIGIDO: Adicionar TODAS as aulas que o professor deve
          for (let i = 0; i < debt.missedLessons; i++) {
            const currentLength = schedule[debt.classId].length;
            
            // Gerar período dinamicamente
            let period, startTime, endTime;
            
            if (currentLength < basePeriods.length) {
              // Usar períodos configurados
              const basePeriod = basePeriods[currentLength];
              period = basePeriod.period;
              startTime = basePeriod.startTime;
              endTime = basePeriod.endTime;
            } else {
              // Criar períodos extras além do máximo configurado
              period = currentLength + 1;
              
              // Continuar calculando horários dinamicamente
              const extraPeriodIndex = currentLength - basePeriods.length;
              const lastPeriod = basePeriods[basePeriods.length - 1];
              
              // Parsear último horário
              const [lastEndHour, lastEndMin] = lastPeriod.endTime.split(':').map(Number);
              const totalMinutesFromLast = (extraPeriodIndex + 1) * lessonDuration;
              
              const startHour = lastEndHour + Math.floor(totalMinutesFromLast / 60);
              const startMinute = (lastEndMin + (totalMinutesFromLast % 60)) % 60;
              
              const endHour = startHour + Math.floor(lessonDuration / 60);
              const endMinute = (startMinute + (lessonDuration % 60)) % 60;
              
              startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
              endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            }

            schedule[debt.classId].push({
              period,
              startTime,
              endTime,
              teacherId: teacherDebt.teacherId,
              teacherName: teacherDebt.teacherName,
              subjectId: debt.subjectId,
              subjectName: debt.subjectName,
              classId: debt.classId,
              className: debt.className
            });

            console.log(`    ✓ Aula ${i + 1}/${debt.missedLessons} adicionada (período ${period}: ${startTime}-${endTime})`);
          }
        });
      });

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ HORÁRIO GERADO COM TODOS OS DÉBITOS:');
      console.log('═══════════════════════════════════════════════════════');
      Object.entries(schedule).forEach(([classId, slots]) => {
        const className = slots[0]?.className || classId;
        console.log(`📋 ${className}: ${slots.length} aulas`);
      });
      console.log(`📚 Total de turmas: ${Object.keys(schedule).length}`);
      console.log(`📊 Total de aulas: ${Object.values(schedule).flat().length}`);
      console.log('═══════════════════════════════════════════════════════\n');
      
      setMakeupSchedule(schedule);
      
    } catch (error) {
      console.error('❌ Erro ao gerar horário:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Salvar horário de reposição
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/saturday-makeup', data);
    },
    onSuccess: async (response, variables) => {
      // Capturar o ID do sábado salvo para controle de presença
      const savedId = response.data?._id || response.data?.id || response.data?.data?._id;
      if (savedId) {
        setActiveScheduleId(savedId);
        setShowAttendancePanel(true);
      }
      // Se o sábado foi realizado, dar baixa nos débitos
      if (wasHeld && variables.wasHeld) {
        try {
          console.log('✅ Sábado realizado - dando baixa nos débitos...');
          
          // Para cada professor no horário gerado, dar baixa nas aulas
          const teacherIds = new Set<string>();
          Object.values(makeupSchedule).forEach((slots: MakeupSlot[]) => {
            slots.forEach(slot => teacherIds.add(slot.teacherId));
          });
          
          // Registrar as reposições realizadas
          for (const teacherId of teacherIds) {
            const teacherSlots = Object.values(makeupSchedule)
              .flat()
              .filter(slot => slot.teacherId === teacherId);
            
            await api.post(`/emergency-schedules/teacher-debts/${teacherId}/pay`, {
              date: selectedDate,
              hoursRepaid: teacherSlots.length,
              details: teacherSlots.map(s => ({
                subjectId: s.subjectId,
                classId: s.classId,
                period: s.period
              }))
            });
          }
          
          console.log('✅ Baixa nos débitos concluída!');
          toast.success('✅ Horário de reposição salvo e débitos atualizados!');
        } catch (error) {
          console.error('❌ Erro ao dar baixa nos débitos:', error);
          toast.error('Horário salvo, mas houve erro ao atualizar os débitos.');
        }
      } else {
        toast.success('✅ Horário de reposição salvo com sucesso!');
      }
      
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-schedules'] });
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar horário de reposição');
    }
  });

  // Deletar horário de reposição
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/saturday-makeup/${id}`);
    },
    onSuccess: () => {
      toast.success('✅ Horário de reposição excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
    },
    onError: (error) => {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir horário de reposição');
    }
  });

  // Mutation para marcar presença de professor
  const toggleTeacherAttendanceMutation = useMutation({
    mutationFn: async ({ id, teacherId, attended }: { id: string; teacherId: string; attended: boolean }) => {
      const url = `/saturday-makeup/${id}/attendance`;
      console.log('🔄 Atualizando presença:', { id, teacherId, attended, url });
      console.log('📡 URL completa:', `${api.defaults.baseURL}${url}`);
      return await api.put(url, { teacherId, attended });
    },
    onSuccess: () => {
      toast.success('✅ Presença atualizada!');
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-schedules'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro COMPLETO ao atualizar presença:', error);
      console.error('📋 Status:', error.response?.status);
      console.error('📋 Data:', error.response?.data);
      console.error('📋 Config:', error.config);
      toast.error('Erro ao atualizar presença');
    }
  });

  // Processar sábado após realização (dar baixa e acumular débitos)
  const processSaturdayMutation = useMutation({
    mutationFn: async (saturdayId: string) => {
      console.log('🔄 Processando sábado:', saturdayId);
      return await api.post(`/saturday-makeup/${saturdayId}/process`);
    },
    onSuccess: (response) => {
      const { totalRealizedHours, absentTeachers, attendedTeachers } = response.data.data;
      toast.success(
        `✅ Sábado processado!\n` +
        `${totalRealizedHours} horas realizadas\n` +
        `${attendedTeachers} professor(es) presente(s)\n` +
        `${absentTeachers} ausente(s) - débitos acumulados`
      );
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-schedules'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao processar sábado:', error);
      toast.error('Erro ao processar sábado');
    }
  });

  // Mutation para confirmar aulas por slot e abater débitos
  const confirmSlotsMutation = useMutation({
    mutationFn: async ({ id, slots }: { id: string; slots: Array<{ classId: string; period: number }> }) => {
      return await api.put(`/saturday-makeup/${id}/confirm-slots`, { confirmedSlots: slots });
    },
    onSuccess: (response) => {
      const { confirmedCount, attendedTeachers } = response.data;
      toast.success(
        `✅ ${confirmedCount} aula(s) confirmada(s) — ${attendedTeachers?.length ?? 0} professor(es) presente(s)!\nDébitos abatidos automaticamente.`
      );
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-schedules'] });
      setShowAttendancePanel(false);
    },
    onError: () => toast.error('Erro ao confirmar presenças')
  });

  const handleSave = () => {
    if (!selectedDate) {
      toast.error('Selecione uma data para o sábado de reposição');
      return;
    }
    if (Object.keys(makeupSchedule).length === 0) {
      toast.error('Gere um horário de reposição primeiro!');
      return;
    }
    // Pré-preencher título sugerido e abrir diálogo
    const suggestedTitle = `Sábado ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    setSaveTitle(suggestedTitle);
    setShowSaveTitleDialog(true);
  };

  const handleConfirmSave = () => {
    const data = {
      date: selectedDate,
      schedule: makeupSchedule,
      wasHeld,
      title: saveTitle.trim()
    };
    saveMutation.mutate(data);
    setShowSaveTitleDialog(false);
  };

  const handleDelete = (id: string) => {
    console.log('🗑️ handleDelete chamado com ID:', id);
    console.log('🔍 Tipo do ID:', typeof id);
    console.log('🔍 ID é truthy?', !!id);
    
    if (!id) {
      toast.error('ID do horário não encontrado');
      console.error('❌ ID inválido para exclusão:', id);
      return;
    }
    
    // Verificar token
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      console.log('🔑 Token presente:', !!parsed?.state?.token);
      console.log('👤 User do token:', parsed?.state?.user);
    }
    
    if (confirm('Tem certeza que deseja excluir este horário de reposição?')) {
      console.log('✅ Confirmação OK, chamando deleteMutation...');
      deleteMutation.mutate(id);
    } else {
      console.log('❌ Usuário cancelou a exclusão');
    }
  };

  const handleView = (saved: any) => {
    // Converter a data para o formato YYYY-MM-DD para o input date
    const dateObj = new Date(saved.date);
    const formattedDate = dateObj.toISOString().split('T')[0];
    
    setSelectedDate(formattedDate);
    setMakeupSchedule(saved.schedule);
    setWasHeld(saved.wasHeld || false);
    
    const savedId = saved._id || saved.id;
    setActiveScheduleId(savedId || '');
    
    toast.success('📅 Horário carregado com sucesso!');
  };

  // Imprimir horário em popup limpo (cabe em uma página A4 landscape)
  const openPrintWindow = (scheduleData: { [classId: string]: MakeupSlot[] }, dateStr: string) => {
    const classIds = Object.keys(scheduleData);
    if (classIds.length === 0) {
      toast.error('Horário vazio, nada para imprimir.');
      return;
    }
    const maxPer = Math.max(...Object.values(scheduleData).map(s => s.length), 1);
    // Ajusta font-size conforme número de colunas para caber em uma página
    const colCount = classIds.length + 1;
    const fs = Math.max(6, Math.min(11, Math.floor(120 / colCount)));
    const fsSm = Math.max(5, fs - 1);

    const headerCells = classIds.map(classId => {
      const ci = classes.find((c: Class) => c._id === classId || c.id === classId);
      const grade = ci?.grade?.name || '';
      const name = ci?.name || 'Turma';
      return `<th>${grade ? grade + '<br>' + name : name}</th>`;
    }).join('');

    const bodyRows = Array.from({ length: maxPer }, (_, i) => i + 1).map(period => {
      let startTime = '—', endTime = '—';
      for (const slots of Object.values(scheduleData)) {
        const slot = slots.find(s => s.period === period);
        if (slot) { startTime = slot.startTime; endTime = slot.endTime; break; }
      }
      const cells = classIds.map(classId => {
        const slot = (scheduleData[classId] || []).find(s => s.period === period);
        if (slot) {
          return `<td><div class="subj">${slot.subjectName}</div><div class="teach">${slot.teacherName}</div></td>`;
        }
        return '<td style="color:#bbb">—</td>';
      }).join('');
      return `<tr>
        <td class="period-col"><strong>${period}º</strong><br><span style="font-size:${fsSm}px">${startTime}–${endTime}</span></td>
        ${cells}
      </tr>`;
    }).join('');

    const printDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) { toast.error('Popup bloqueado. Permita popups para imprimir.'); return; }
    printWindow.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>Horário de Reposição – ${printDate}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: ${fs}px; }
    h2 { text-align: center; font-size: ${fs + 2}px; margin-bottom: 6px; }
    p.sub { text-align: center; font-size: ${fsSm}px; color: #555; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { background-color: #16a34a; color: white; border: 1px solid #222;
         padding: 3px 2px; font-size: ${fs}px; text-align: center;
         word-break: break-word; line-height: 1.2; }
    td { border: 1px solid #444; padding: 3px 2px; text-align: center;
         vertical-align: middle; word-break: break-word; line-height: 1.2; }
    .period-col { background: #f3f4f6; font-size: ${fs}px; width: 56px; min-width: 56px; }
    .subj { font-weight: bold; font-size: ${fs}px; }
    .teach { font-size: ${fsSm}px; color: #374151; margin-top: 2px; }
  </style>
</head><body>
  <h2>📊 Grade de Horários – Sábado de Reposição</h2>
  <p class="sub">${printDate}</p>
  <table>
    <thead><tr>
      <th style="width:56px">Horário</th>
      ${headerCells}
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const handlePrint = () => {
    if (Object.keys(makeupSchedule).length === 0) {
      toast.error('Gere um horário de reposição primeiro!');
      return;
    }
    openPrintWindow(makeupSchedule, selectedDate);
  };

  const toggleSlotConfirmation = (classId: string, period: number) => {
    const key = `${classId}-${period}`;
    setConfirmedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleConfirmAllSlots = () => {
    const allKeys = new Set<string>();
    Object.entries(makeupSchedule).forEach(([classId, slots]) => {
      (slots as MakeupSlot[]).forEach(slot => allKeys.add(`${classId}-${slot.period}`));
    });
    setConfirmedSlots(allKeys);
  };

  const handleClearAllSlots = () => setConfirmedSlots(new Set());

  // Calcular confirmações por professor no horário atual
  const getTeacherConfirmationSummary = () => {
    const summary = new Map<string, { teacherName: string; total: number; confirmed: number }>();
    Object.entries(makeupSchedule).forEach(([classId, slots]) => {
      (slots as MakeupSlot[]).forEach(slot => {
        if (!summary.has(slot.teacherId)) {
          summary.set(slot.teacherId, { teacherName: slot.teacherName, total: 0, confirmed: 0 });
        }
        const entry = summary.get(slot.teacherId)!;
        entry.total++;
        if (confirmedSlots.has(`${classId}-${slot.period}`)) entry.confirmed++;
      });
    });
    return Array.from(summary.entries()).map(([teacherId, data]) => ({ teacherId, ...data }))
      .sort((a, b) => b.total - a.total);
  };

  // Calcular resumo de confirmações a partir de um sábado salvo
  const getSavedSaturdaySlotSummary = (saved: any) => {
    const summary = new Map<string, { teacherName: string; total: number; confirmed: number }>();
    Object.entries(saved.schedule || {}).forEach(([classId, slots]: [string, any]) => {
      (slots as any[]).forEach((slot: any) => {
        if (!slot?.teacherId) return;
        if (!summary.has(slot.teacherId)) {
          summary.set(slot.teacherId, { teacherName: slot.teacherName, total: 0, confirmed: 0 });
        }
        const entry = summary.get(slot.teacherId)!;
        entry.total++;
        if (slot.confirmed) entry.confirmed++;
      });
    });
    return Array.from(summary.entries()).map(([teacherId, data]) => ({ teacherId, ...data }))
      .sort((a, b) => b.total - a.total);
  };

  const getSubjectColor = (subjectId: string) => {
    const subject = subjects.find((s: Subject) => s._id === subjectId || s.id === subjectId);
    return subject?.color || '#6B7280';
  };

  return (
    <div className="space-y-6">
      {/* ── Modal: título ao salvar ── */}
      {showSaveTitleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Save size={20} className="text-green-600" />
              Nome do Horário
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Digite um título para identificar este horário de reposição:
            </p>
            <input
              type="text"
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmSave(); if (e.key === 'Escape') setShowSaveTitleDialog(false); }}
              placeholder="Ex: Reposição Semana 1 – Abril 2026"
              className="input w-full mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSaveTitleDialog(false)}
                className="btn btn-outline btn-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={saveMutation.isPending}
                className="btn btn-success btn-sm flex items-center gap-2"
              >
                <Save size={16} />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-800">
          <Calendar className="text-blue-600" />
          Sábados de Reposição
        </h1>
        <p className="text-blue-700 mt-2">
          Gere automaticamente horários de reposição para professores que faltaram durante a semana
        </p>
      </div>

      {/* Lista de Horários Salvos - DESTACADA */}
      {savedMakeupSchedules.length > 0 && (
        <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-purple-800 flex items-center gap-2">
              <Calendar size={24} />
              📚 Sábados Salvos ({savedMakeupSchedules.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedMakeupSchedules.map((saved: any) => {
              const scheduleId = saved._id || saved.id;
              const attendedTeachers = saved.attendedTeachers || [];
              
              // Extrair professores do horário
              const teachersInSchedule = new Map<string, string>();
              Object.values(saved.schedule || {}).forEach((period: any) => {
                if (Array.isArray(period)) {
                  period.forEach((slot: any) => {
                    if (slot?.teacherId && slot?.teacherName) {
                      teachersInSchedule.set(slot.teacherId, slot.teacherName);
                    }
                  });
                }
              });
              
              const totalClasses = Object.values(saved.schedule || {}).flat().length;
              const totalTeachers = teachersInSchedule.size;
              
              return (
                <div 
                  key={scheduleId}
                  className="bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all p-4"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-purple-100">
                    <div>
                      {saved.title && (
                        <div className="text-sm font-semibold text-purple-900 mb-0.5">{saved.title}</div>
                      )}
                      <div className="text-xl font-bold text-purple-800">
                        📅 {new Date(saved.date).toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.keys(saved.schedule || {}).length} turma(s) · {totalClasses} aula(s)
                      </div>
                    </div>
                    {saved.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        saved.status === 'realized' ? 'bg-green-100 text-green-700' :
                        saved.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {saved.status === 'realized' ? '✓ Realizado' :
                         saved.status === 'cancelled' ? '✗ Cancelado' :
                         '⏳ Planejado'}
                      </span>
                    )}
                  </div>
                  
                  {/* Estatísticas */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">👥 Professores:</span>
                      <span className="font-bold text-gray-800">{totalTeachers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">✓ Presentes:</span>
                      <span className="font-bold text-green-600">{attendedTeachers.length}/{totalTeachers}</span>
                    </div>
                  </div>

                  {/* Resumo de confirmações por professor */}
                  {(() => {
                    const slotSummary = getSavedSaturdaySlotSummary(saved);
                    if (slotSummary.length === 0) return null;
                    const totalConfirmed = slotSummary.reduce((s, t) => s + t.confirmed, 0);
                    const totalSlots = slotSummary.reduce((s, t) => s + t.total, 0);
                    return (
                      <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                          <CheckSquare size={12} /> Aulas Confirmadas: {totalConfirmed}/{totalSlots}
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-2 mb-1">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: totalSlots > 0 ? `${(totalConfirmed / totalSlots) * 100}%` : '0%' }}
                          />
                        </div>
                        {slotSummary.map(t => (
                          <div key={t.teacherId} className="text-xs text-blue-700 flex justify-between">
                            <span className="truncate max-w-[120px]">{t.teacherName}</span>
                            <span className={`font-bold ${t.confirmed === t.total ? 'text-green-600' : t.confirmed > 0 ? 'text-orange-600' : 'text-red-500'}`}>
                              {t.confirmed}/{t.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  
                  {/* Botões de Ação */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        handleView(saved);
                        // Carregar slots confirmados do sábado salvo
                        const loadedConfirmed = new Set<string>();
                        Object.entries(saved.schedule || {}).forEach(([classId, slots]: [string, any]) => {
                          (slots as any[]).forEach((slot: any) => {
                            if (slot?.confirmed) loadedConfirmed.add(`${classId}-${slot.period}`);
                          });
                        });
                        setConfirmedSlots(loadedConfirmed);
                        setActiveScheduleId(scheduleId);
                        setShowAttendancePanel(true);
                      }}
                      className="btn btn-sm btn-primary flex items-center justify-center gap-1"
                    >
                      <Eye size={16} />
                      Visualizar
                    </button>
                    <button
                      onClick={() => {
                        const dateStr = new Date(saved.date).toISOString().split('T')[0];
                        openPrintWindow(saved.schedule, dateStr);
                      }}
                      className="btn btn-sm btn-outline flex items-center justify-center gap-1"
                    >
                      <Printer size={16} />
                      Imprimir
                    </button>
                    <button
                      onClick={() => {
                        handleView(saved);
                        const loadedConfirmed = new Set<string>();
                        Object.entries(saved.schedule || {}).forEach(([classId, slots]: [string, any]) => {
                          (slots as any[]).forEach((slot: any) => {
                            if (slot?.confirmed) loadedConfirmed.add(`${classId}-${slot.period}`);
                          });
                        });
                        setConfirmedSlots(loadedConfirmed);
                        setActiveScheduleId(scheduleId);
                        setShowAttendancePanel(true);
                      }}
                      className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1 col-span-2"
                    >
                      <CheckSquare size={16} />
                      Confirmar Presenças por Aula
                    </button>
                    {saved.status !== 'realized' && attendedTeachers.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm(`Processar sábado de ${new Date(saved.date).toLocaleDateString('pt-BR')}?\n\n` +
                            `✓ Dar baixa em débitos dos ${attendedTeachers.length} presentes\n` +
                            `✗ Acumular débitos dos ${totalTeachers - attendedTeachers.length} ausentes`)) {
                            processSaturdayMutation.mutate(scheduleId);
                          }
                        }}
                        className="btn btn-sm btn-success flex items-center justify-center gap-1"
                        disabled={processSaturdayMutation.isPending}
                      >
                        <CheckCircle size={16} />
                        Processar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(scheduleId)}
                      className="btn btn-sm btn-error flex items-center justify-center gap-1"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Principal */}
        <div className={`${Object.keys(makeupSchedule).length > 0 ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>
          {/* Configuração */}
          <div className="card">
            <h3 className="font-bold text-lg mb-4">📋 Configuração do Sábado de Reposição</h3>
            
            <div className="space-y-4">
              {/* Período de Busca de Faltosos */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  Período de Busca de Professores Faltosos
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input w-full"
                      placeholder="Início do período"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Final</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input w-full"
                      placeholder="Fim do período"
                    />
                  </div>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  ℹ️ Deixe em branco para buscar todos os professores com aulas pendentes
                </p>
              </div>

              {/* Data do Sábado */}
              <div>
                <label className="block text-sm font-medium mb-2">Data do Sábado de Reposição</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* 🎯 NOVO: Configuração de Quantidade e Duração das Aulas */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Clock size={18} />
                  Configuração das Aulas
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Horário de Início</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantidade de Aulas</label>
                    <select
                      value={maxPeriods}
                      onChange={(e) => setMaxPeriods(Number(e.target.value))}
                      className="input w-full"
                    >
                      <option value={1}>1 aula</option>
                      <option value={2}>2 aulas</option>
                      <option value={3}>3 aulas</option>
                      <option value={4}>4 aulas</option>
                      <option value={5}>5 aulas</option>
                      <option value={6}>6 aulas</option>
                      <option value={7}>7 aulas</option>
                      <option value={8}>8 aulas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duração (minutos)</label>
                    <select
                      value={lessonDuration}
                      onChange={(e) => setLessonDuration(Number(e.target.value))}
                      className="input w-full"
                    >
                      <option value={30}>30 minutos</option>
                      <option value={35}>35 minutos</option>
                      <option value={40}>40 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={50}>50 minutos</option>
                      <option value={60}>60 minutos (1 hora)</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-purple-700 mt-2">
                  ℹ️ Total: {(() => {
                    const [startHour, startMinute] = startTime.split(':').map(Number);
                    const totalMinutes = maxPeriods * lessonDuration;
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    const endHour = startHour + hours + Math.floor((startMinute + minutes) / 60);
                    const endMinute = (startMinute + minutes) % 60;
                    return `${maxPeriods} aulas = ${hours}h${minutes > 0 ? minutes + 'min' : ''} (${startTime} até ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')})`;
                  })()}
                </p>
              </div>

              {/* Seletor de Professores para o Sábado */}
              {(teacherDebts.length > 0 || (teachersData && teachersData.length > 0)) ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                      <Users size={18} />
                      1️⃣ Selecione os Professores PRESENTES no Sábado
                      <span className="ml-auto text-xs font-normal bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                        Ordenado por prioridade ↑
                      </span>
                    </h4>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto bg-white p-3 rounded border border-blue-200">
                      <div className="mb-2 flex items-center justify-between">
                        <button
                          onClick={() => {
                            const listToSelect = teacherDebts.length > 0 ? teacherDebts.map(d => d.teacherId) : (teachersData || []).map((t: any) => (t._id || t.id || '').toString());
                            setSelectedTeachersForSaturday(new Set(listToSelect));
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          ✓ Selecionar Todos
                        </button>
                        <button
                          onClick={() => setSelectedTeachersForSaturday(new Set())}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          ✗ Limpar Seleção
                        </button>
                      </div>
                      
                      {(teacherDebts.length > 0 ? teacherDebts : (teachersData || []).map((t: any) => ({ teacherId: (t._id || t.id || '').toString(), teacherName: t.name, totalDebts: 0 }))).map((debt, rankIdx) => {
                        const isSelected = selectedTeachersForSaturday.has(debt.teacherId);
                        const priority = getTeacherPriorityInfo(rankIdx, debt.totalDebts);
                        return (
                          <label
                            key={debt.teacherId}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors border-2 ${
                              isSelected ? `${priority.bgClass}` : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSet = new Set(selectedTeachersForSaturday);
                                if (e.target.checked) {
                                  newSet.add(debt.teacherId);
                                } else {
                                  newSet.delete(debt.teacherId);
                                }
                                setSelectedTeachersForSaturday(newSet);
                              }}
                              className="w-5 h-5 text-green-600 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                {debt.totalDebts > 0 && (
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${priority.badgeClass}`}>
                                    {priority.badge}
                                  </span>
                                )}
                                <span className={`font-semibold truncate ${isSelected ? priority.textClass : 'text-gray-800'}`}>
                                  {debt.teacherName}
                                </span>
                              </div>
                              {debt.totalDebts > 0 && (
                                <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                                  <TrendingUp size={10} className="text-red-500" />
                                  {debt.totalDebts} aula{debt.totalDebts > 1 ? 's' : ''} a repor
                                  {(debt as any).accumulatedDebts > 0 && (
                                    <span className="text-red-600 font-semibold">+{(debt as any).accumulatedDebts} acum.</span>
                                  )}
                                </div>
                              )}
                            </div>
                            {isSelected && <CheckCircle size={18} className="text-green-600 flex-shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                    
                    <div className="mt-3 text-sm text-blue-800 font-medium text-center">
                      {selectedTeachersForSaturday.size} de {teacherDebts.length} professores selecionados
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-gray-600">
                    ℹ️ Ajuste o período de busca acima para exibir professores com débitos
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={generateFromBackend}
                  disabled={isGenerating || !selectedDate || selectedTeachersForSaturday.size === 0}
                  className="btn btn-primary w-full flex items-center justify-center gap-2 text-lg py-3"
                  title="Gera horário apenas com os professores selecionados"
                >
                  <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
                  {isGenerating ? 'Gerando...' : `2️⃣ Gerar Horário (${selectedTeachersForSaturday.size} professores)`}
                </button>

                {/* Checkbox para marcar se foi realizado — aparece APÓS gerar */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wasHeld}
                      onChange={(e) => setWasHeld(e.target.checked)}
                      className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <div>
                      <div className="font-semibold text-green-800">
                        ✅ Sábado de Reposição foi Realizado
                      </div>
                      <div className="text-sm text-green-700">
                        Marque para dar baixa nas aulas devidas dos professores
                      </div>
                    </div>
                  </label>
                </div>

                {selectedTeachersForSaturday.size === 0 && (
                  <p className="text-sm text-orange-600 text-center">
                    ⚠️ Selecione pelo menos 1 professor acima
                  </p>
                )}
              </div>
            </div>
          </div>

          {teacherDebts.length > 0 && (
            <div className="card border-2 border-yellow-300 bg-yellow-50">
              <h3 className="font-bold text-lg mb-4 text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="text-yellow-600" />
                Ranking de Professores — Prioridade de Reposição
                <span className="ml-auto text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full font-normal">
                  {teacherDebts.length} prof. · {teacherDebts.reduce((a, d) => a + d.totalDebts, 0)} aulas
                </span>
              </h3>
              
              <div className="space-y-3">
                {teacherDebts.map((debt, rankIdx) => {
                  const priority = getTeacherPriorityInfo(rankIdx, debt.totalDebts);
                  return (
                    <div key={debt.teacherId} className={`p-4 rounded-lg border-2 ${priority.bgClass}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${priority.badgeClass}`}>
                            {priority.badge}
                          </span>
                          <h4 className={`font-semibold ${priority.textClass}`}>{debt.teacherName}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {(debt as any).realizedClasses > 0 && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                              ✓ {(debt as any).realizedClasses} reposta(s)
                            </span>
                          )}
                          {debt.accumulatedDebts && debt.accumulatedDebts > 0 && (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold" title="Débitos acumulados de não comparecimento em sábado">
                              ⚠️ {debt.accumulatedDebts} acum.
                            </span>
                          )}
                          <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                            <TrendingUp size={12} />
                            {debt.totalDebts} aula{debt.totalDebts > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        {debt.debts.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-gray-700">
                            {d.isAccumulated && <span className="text-red-600 font-bold" title="Débito acumulado">⚠️</span>}
                            <BookOpen size={12} className="text-gray-500" />
                            <span className="font-medium">{d.subjectName}</span>
                            <span className="text-gray-500">→</span>
                            <span className="font-medium">{d.className}</span>
                            <span className="ml-auto text-red-600 font-semibold text-xs">({d.missedLessons})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Horário Gerado */}
          {Object.keys(makeupSchedule).length > 0 && (() => {
            // 🔍 Debug: Verificar conteúdo do makeupSchedule
            console.log('🔍 DEBUG makeupSchedule:', makeupSchedule);
            Object.entries(makeupSchedule).forEach(([classId, slots]) => {
              console.log(`  📋 Turma ${classId}:`, slots);
              console.log(`    Total de slots: ${slots.length}`);
            });
            
            return (
            <div className="space-y-6">
              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end no-print">
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Printer size={18} />
                  🖨️ Imprimir Horário
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedDate}
                  className="btn btn-success flex items-center gap-2"
                >
                  <Save size={18} />
                  💾 Salvar Horário
                </button>
              </div>
              
              {/* Grade Visual (Planilha) */}
              <div className="card border-2 border-green-400 print-container">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-green-800">
                  <Calendar className="text-green-600" />
                  📊 Grade de Horários - Sábado {new Date(selectedDate).toLocaleDateString('pt-BR')}
                </h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-green-600 text-white">
                        <th className="border border-gray-300 p-3 text-center font-bold">Horário</th>
                        {/* Listar todas as turmas */}
                        {Object.keys(makeupSchedule).map(classId => {
                          const classInfo = classes.find((c: Class) => c._id === classId || c.id === classId);
                          const gradeName = classInfo?.grade?.name || '';
                          const className = classInfo?.name || 'Turma';
                          const displayName = gradeName ? `${gradeName} - ${className}` : className;
                          return (
                            <th key={classId} className="border border-gray-300 p-3 text-center font-bold">
                              {displayName}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Calcular o número máximo de períodos dinamicamente */}
                      {(() => {
                        // 🔍 Debug: Ver os períodos de cada slot
                        Object.entries(makeupSchedule).forEach(([classId, slots]) => {
                          console.log(`📊 Turma ${classId}: períodos =`, slots.map(s => s.period));
                        });
                        
                        const maxPeriods = Math.max(
                          ...Object.values(makeupSchedule).map(slots => slots.length),
                          4 // No mínimo 4 períodos
                        );
                        
                        console.log('📈 maxPeriods calculado:', maxPeriods);
                        console.log('📈 Maior period nos slots:', Math.max(...Object.values(makeupSchedule).flat().map(s => s.period || 0)));
                        
                        return Array.from({ length: maxPeriods }, (_, i) => i + 1).map(period => {
                          // Buscar horário real do slot (já vem do backend)
                          let startTime = '—', endTime = '—';
                          
                          // Procurar em qualquer turma que tenha esse período
                          for (const slots of Object.values(makeupSchedule)) {
                            const slot = slots.find(s => s.period === period);
                            if (slot) {
                              startTime = slot.startTime;
                              endTime = slot.endTime;
                              break;
                            }
                          }
                        
                          return (
                            <tr key={period} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-3 text-center bg-gray-50">
                                <div className="font-bold text-lg">{period}º</div>
                                <div className="text-xs text-gray-600">{startTime} - {endTime}</div>
                              </td>
                              {/* Para cada turma, mostrar a aula do período */}
                              {Object.entries(makeupSchedule).map(([classId, slots]) => {
                                const slot = slots.find(s => s.period === period);
                                
                                return (
                                  <td 
                                    key={classId} 
                                    className="border border-gray-300 p-2"
                                    style={{
                                      backgroundColor: slot ? getSubjectColor(slot.subjectId) + '30' : 'transparent'
                                    }}
                                  >
                                    {slot ? (
                                      <div className="text-center relative">
                                        {/* Checkbox de confirmação */}
                                        <button
                                          type="button"
                                          onClick={() => toggleSlotConfirmation(classId, period)}
                                          className={`absolute top-0 right-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors no-print ${
                                            confirmedSlots.has(`${classId}-${period}`)
                                              ? 'bg-green-500 border-green-600 text-white'
                                              : 'bg-white border-gray-300 hover:border-green-400'
                                          }`}
                                          title={confirmedSlots.has(`${classId}-${period}`) ? 'Aula confirmada — clique para desmarcar' : 'Clique para confirmar aula dada'}
                                        >
                                          {confirmedSlots.has(`${classId}-${period}`) && <CheckCircle size={12} />}
                                        </button>
                                        <div 
                                          className="font-bold text-sm mb-1 px-2 py-1 rounded"
                                          style={{ 
                                            backgroundColor: getSubjectColor(slot.subjectId),
                                            color: 'white',
                                            opacity: confirmedSlots.has(`${classId}-${period}`) ? 1 : 0.7
                                          }}
                                        >
                                          {slot.subjectName}
                                        </div>
                                        <div className="text-xs text-gray-700 font-medium">
                                          {slot.teacherName}
                                        </div>
                                        {confirmedSlots.has(`${classId}-${period}`) && (
                                          <div className="text-xs text-green-700 font-bold mt-1">✓ Dada</div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-400 text-xs">—</div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                      {(() => {
                        const maxPeriodsInSchedule = Math.max(
                          ...Object.values(makeupSchedule).map(slots => slots.length),
                          0
                        );
                        if (maxPeriodsInSchedule === 0) return 'Sem aulas';
                        
                        const firstSlot = Object.values(makeupSchedule).flat()[0];
                        const lastPeriodSlots = Object.values(makeupSchedule).flat()
                          .filter(s => s.period === maxPeriodsInSchedule);
                        const lastSlot = lastPeriodSlots[lastPeriodSlots.length - 1] || firstSlot;
                        
                        return `${firstSlot?.startTime || '08:00'} às ${lastSlot?.endTime || '12:00'} (${maxPeriodsInSchedule} período${maxPeriodsInSchedule > 1 ? 's' : ''})`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{Object.keys(makeupSchedule).length} turma(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} />
                    <span>{Object.values(makeupSchedule).flat().length} aula(s)</span>
                  </div>
                </div>
              </div>

              {/* ✅ PAINEL DE CONTROLE DE PRESENÇA POR AULA */}
              {(showAttendancePanel || Object.keys(makeupSchedule).length > 0) && (
                <div className="card border-2 border-emerald-400 bg-emerald-50 no-print">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-xl text-emerald-800 flex items-center gap-2">
                      <CheckSquare className="text-emerald-600" />
                      Controle de Presença por Aula
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmAllSlots}
                        className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <CheckCircle size={14} /> Marcar Todas
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllSlots}
                        className="btn btn-sm btn-outline flex items-center gap-1"
                      >
                        <X size={14} /> Limpar
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-emerald-700 mb-4">
                    Clique nos checkboxes na grade acima (ou use os botões de ação abaixo) para confirmar cada aula dada. O sistema abaterá automaticamente do déficit do professor.
                  </p>

                  {/* Resumo por professor */}
                  <div className="space-y-3 mb-5">
                    {getTeacherConfirmationSummary().map((t, rankIdx) => {
                      const pct = t.total > 0 ? (t.confirmed / t.total) * 100 : 0;
                      const priority = getTeacherPriorityInfo(rankIdx, t.total);
                      return (
                        <div key={t.teacherId} className={`p-3 rounded-lg border-2 ${priority.bgClass}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${priority.badgeClass}`}>
                                {priority.badge}
                              </span>
                              <span className={`font-semibold text-sm ${priority.textClass}`}>{t.teacherName}</span>
                            </div>
                            <span className={`text-sm font-bold ${t.confirmed === t.total ? 'text-green-700' : t.confirmed > 0 ? 'text-orange-700' : 'text-gray-500'}`}>
                              {t.confirmed}/{t.total} aula{t.total !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-orange-400' : 'bg-gray-300'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-xs mt-1 text-right">
                            {pct === 100 && <span className="text-green-700 font-bold">✅ Completo — déficit será zerado</span>}
                            {pct > 0 && pct < 100 && <span className="text-orange-700 font-bold">⚡ Parcial — {t.confirmed} aula(s) abatida(s)</span>}
                            {pct === 0 && t.total > 0 && <span className="text-gray-500">Nenhuma confirmada ainda</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contadores totais */}
                  <div className="flex items-center justify-between text-sm text-emerald-800 bg-emerald-100 rounded-lg p-3 mb-4">
                    <span className="font-semibold">📊 Total confirmado:</span>
                    <span className="font-bold text-lg">{confirmedSlots.size} / {Object.values(makeupSchedule).flat().length} aulas</span>
                  </div>

                  {/* Botão Salvar Presenças */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeScheduleId) {
                        toast.error('Salve o horário primeiro antes de confirmar presenças');
                        return;
                      }
                      const slots = Array.from(confirmedSlots).map(key => {
                        const [classId, periodStr] = key.split('-');
                        return { classId, period: Number(periodStr) };
                      });
                      confirmSlotsMutation.mutate({ id: activeScheduleId, slots });
                    }}
                    disabled={confirmSlotsMutation.isPending || confirmedSlots.size === 0 || !activeScheduleId}
                    className="btn btn-success w-full flex items-center justify-center gap-2 text-lg py-3"
                  >
                    <CheckSquare size={20} />
                    {confirmSlotsMutation.isPending
                      ? 'Salvando presenças...'
                      : activeScheduleId
                        ? `✅ Salvar ${confirmedSlots.size} Presença(s) e Abater Déficits`
                        : '⚠️ Salve o horário primeiro'}
                  </button>
                  {!activeScheduleId && Object.keys(makeupSchedule).length > 0 && (
                    <p className="text-xs text-orange-600 text-center mt-2">
                      Clique em "Salvar Horário" acima para habilitar a confirmação de presenças
                    </p>
                  )}
                </div>
              )}

              {/* Resumo e ações */}
              {wasHeld && (
                <div className="card bg-green-50 border-2 border-green-400 no-print">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-600 mt-1" size={24} />
                    <div>
                      <h4 className="font-bold text-green-800 mb-2">
                        ✅ Sábado Marcado como Realizado
                      </h4>
                      <p className="text-sm text-green-700 mb-2">
                        Ao salvar, as seguintes ações serão executadas:
                      </p>
                      <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                        <li>Salvar horário de reposição do dia {new Date(selectedDate).toLocaleDateString('pt-BR')}</li>
                        <li>Dar baixa em {Object.values(makeupSchedule).flat().length} aula(s) dos professores</li>
                        <li>Atualizar débitos pendentes automaticamente</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 no-print">
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className={`btn ${wasHeld ? 'btn-success' : 'btn-primary'} flex-1 flex items-center justify-center gap-2`}
                >
                  <Save size={20} />
                  {saveMutation.isPending 
                    ? 'Salvando...' 
                    : wasHeld 
                      ? '💾 Salvar e Dar Baixa nos Débitos'
                      : '💾 Salvar Horário'}
                </button>
                <button
                  onClick={handlePrint}
                  className="btn btn-outline flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Imprimir
                </button>
              </div>

              {Object.entries(makeupSchedule).map(([classId, slots]) => {
                const classInfo = classes.find((c: Class) => c._id === classId || c.id === classId);
                const gradeName = classInfo?.grade?.name || '';
                const className = classInfo?.name || 'Turma';
                const displayName = gradeName ? `${gradeName} - ${className}` : className;
                
                return (
                  <div key={classId} className="card border-2 border-green-400 print-container">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <CheckCircle className="text-green-600" />
                      Turma: {displayName}
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead className="bg-green-100">
                          <tr>
                            <th className="border border-gray-300 p-3 text-left">Horário</th>
                            <th className="border border-gray-300 p-3 text-left">Início</th>
                            <th className="border border-gray-300 p-3 text-left">Fim</th>
                            <th className="border border-gray-300 p-3 text-left">Componente Curricular</th>
                            <th className="border border-gray-300 p-3 text-left">Professor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slots.map((slot, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-3">
                                <span className="font-bold">{slot.period}º Horário</span>
                              </td>
                              <td className="border border-gray-300 p-3">{slot.startTime}</td>
                              <td className="border border-gray-300 p-3">{slot.endTime}</td>
                              <td className="border border-gray-300 p-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: getSubjectColor(slot.subjectId) }}
                                  />
                                  <span className="font-medium">{slot.subjectName}</span>
                                </div>
                              </td>
                              <td className="border border-gray-300 p-3">
                                <span className="font-medium">{slot.teacherName}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>

        {/* Painel Lateral - oculto quando o horário está gerado */}
        {Object.keys(makeupSchedule).length === 0 && <div className="space-y-6 no-print">
          <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
            <h3 className="font-bold text-lg mb-3 text-blue-800 flex items-center gap-2">
              <AlertTriangle size={20} />
              Como Funciona
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Defina o período e o sábado de reposição</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>O sistema lista professores ordenados pelo maior déficit de aulas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Selecione os professores e clique em "Gerar Horário"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Salve o horário para ativar o controle de presença</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">5.</span>
                <span>Marque cada aula dada (✓) e confirme — o sistema abate automaticamente o déficit de cada professor</span>
              </li>
            </ul>
          </div>

          {/* Estatísticas */}
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <h3 className="font-bold text-lg mb-3 text-green-800 flex items-center gap-2">
              <Users size={20} />
              Resumo
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Professores com débito:</span>
                <span className="font-bold text-green-800">{teacherDebts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Total de aulas a repor:</span>
                <span className="font-bold text-red-700">
                  {teacherDebts.reduce((acc, d) => acc + d.totalDebts, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Turmas afetadas:</span>
                <span className="font-bold text-green-800">
                  {Object.keys(makeupSchedule).length}
                </span>
              </div>
              {confirmedSlots.size > 0 && (
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-emerald-700 font-semibold">Aulas confirmadas:</span>
                  <span className="font-bold text-emerald-700">{confirmedSlots.size}</span>
                </div>
              )}
              {teacherDebts.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <Award size={12} className="text-yellow-600" /> Maior devedor:
                  </div>
                  <div className="text-sm font-bold text-red-700">{teacherDebts[0]?.teacherName}</div>
                  <div className="text-xs text-red-600">{teacherDebts[0]?.totalDebts} aula(s) pendente(s)</div>
                </div>
              )}
            </div>
          </div>

          {/* Info Adicional */}
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <h3 className="font-bold text-lg mb-3 text-yellow-800 flex items-center gap-2">
              <BookOpen size={20} />
              Informações
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span>⏰</span>
                <span>Horário padrão: 8h às 12h (4 períodos)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>📊</span>
                <span>Baseado em horários emergenciais salvos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Distribuição automática por turma</span>
              </li>
            </ul>
          </div>
        </div>}
      </div>

      {/* CSS para impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .print-container, .print-container * {
            visibility: visible;
          }
          
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            page-break-after: always;
          }
          
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 10pt !important;
          }
          
          th {
            background-color: #e5e7eb !important;
            border: 1px solid #000 !important;
            padding: 6px 4px !important;
            font-weight: bold !important;
          }
          
          td {
            border: 1px solid #000 !important;
            padding: 6px 4px !important;
            vertical-align: top !important;
          }
          
          .bg-green-100 {
            background-color: #d1fae5 !important;
          }
          
          .bg-gray-50 {
            background-color: #f9fafb !important;
          }
          
          h2, h3 {
            color: #000 !important;
            margin-bottom: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
