import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { AlertTriangle, Calendar, Clock, User, Zap, RefreshCw, Save, Printer, List, Bell, Send, Eye, FileText, Trash2, Info } from 'lucide-react';

interface Class {
  _id?: string;
  id: string;
  name: string;
  grade: { name: string };
  shift: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface Subject {
  _id?: string;
  id?: string;
  name: string;
  color: string;
}

interface GeneratedTimetable {
  _id: string;
  classId: string;
  name: string;
  createdAt: string;
  timetable: any;
}

interface TimeSlot {
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName?: string;
  teacherId: string;
  teacherName?: string;
  day: string;
  classId?: string;
  className?: string;
}

interface EmergencySlot extends TimeSlot {
  isModified?: boolean;
  isVacant?: boolean;
  substituteOrigin?: {
    className: string;
    gradeName: string;
  };
  // Informações do professor ausente (para slots vagos)
  absentTeacherId?: string;
  absentTeacherName?: string;
  absentTeacherSubject?: string;
  vacantReason?: string;
  // Flag para indicar se o período foi reordenado na compactação
  wasReordered?: boolean;
  // Informações da turma
  gradeName?: string;
}

interface OriginalSlot extends TimeSlot {
  isAffected?: boolean;
  gradeName?: string;
}

interface MakeupClass {
  originalTeacherId: string;
  originalTeacherName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  gradeName: string;
  period: number;
  originalDay: string;
  makeupDay: string;
  reason: string;
  confirmedSaturday?: boolean; // Flag para indicar que o professor confirmou presença no sábado
}

export default function EmergencySchedule() {
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [emergencyScheduleDate, setEmergencyScheduleDate] = useState(''); // Data do horário emergencial gerado/carregado
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [absentTeacherIds, setAbsentTeacherIds] = useState<string[]>([]);
  const [confirmedSaturdayTeacherIds, setConfirmedSaturdayTeacherIds] = useState<string[]>([]); // Professores que confirmaram presença no sábado
  const [saturdayRealized, setSaturdayRealized] = useState(false); // Se o sábado de reposição foi realizado
  const [reason, setReason] = useState('');
  const [originalSlots, setOriginalSlots] = useState<OriginalSlot[]>([]);
  const [emergencySlots, setEmergencySlots] = useState<EmergencySlot[]>([]);
  const [makeupClasses, setMakeupClasses] = useState<MakeupClass[]>([]);
  const [generating, setGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<any[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [sendNotifications, setSendNotifications] = useState(true);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(true);
  const [customScheduleName, setCustomScheduleName] = useState(''); // Nome personalizado do horário

  // Buscar turmas
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      const classesData = response.data.data || [];
      console.log('🏫 Turmas carregadas:', classesData.length);
      if (classesData.length > 0) {
        console.log('📋 Exemplo de turma:', JSON.stringify(classesData[0], null, 2));
        console.log('📋 Chaves da turma:', Object.keys(classesData[0]));
      }
      return classesData;
    },
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  // Buscar professores
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await api.get('/teachers');
      // A API agora retorna array direto, não mais { data: [] }
      const teachersData = Array.isArray(response.data) ? response.data : (response.data.data || []);
      console.log('👥 Professores carregados:', teachersData.length);
      if (teachersData.length > 0) {
        console.log('👤 Exemplo de professor (completo):', JSON.stringify(teachersData[0], null, 2));
        console.log('👤 Chaves do professor:', Object.keys(teachersData[0]));
      }
      return teachersData;
    },
  });
  const teachers = Array.isArray(teachersData) ? teachersData : [];

  // Buscar Componente Curriculars
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await api.get('/subjects');
      const data = response.data.data || response.data || [];
      const subjectsArray = Array.isArray(data) ? data : [];
      console.log('📚 Componente Curriculars carregadas:', subjectsArray.length);
      if (subjectsArray.length > 0) {
        console.log('📖 Exemplo de Componente Curricular:', JSON.stringify(subjectsArray[0], null, 2));
        console.log('📖 Chaves da Componente Curricular:', Object.keys(subjectsArray[0]));
      }
      return subjectsArray;
    },
  });
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  // Buscar horários salvos
  const { data: savedTimetables = [], isLoading: loadingTimetables } = useQuery({
    queryKey: ['generatedTimetables', selectedClass],
    queryFn: async () => {
      if (!selectedClass) {
        console.log('⏭️ Pulando busca de horários (sem turma)');
        return [];
      }
      
      if (selectedClass === 'all') {
        console.log('🔍 Buscando TODOS os horários salvos (metadados)');
        // Usar rota otimizada que retorna apenas metadados
        const response = await api.get('/generated-timetables/metadata');
        console.log('📚 Resposta completa (metadata):', response);
        console.log('📚 response.data:', response.data);
        console.log('📚 response.data.data:', response.data?.data);
        const data = response.data?.data;
        const dataArray = Array.isArray(data) ? data : (data ? [data] : []);
        console.log('📚 Quantidade (metadata):', dataArray.length);
        if (dataArray.length > 0) {
          console.log('📚 Primeiro horário (raw):', dataArray[0]);
          console.log('📚 Chaves:', Object.keys(dataArray[0]));
          console.log('📚 _id do primeiro:', dataArray[0]._id);
          console.log('📚 id do primeiro:', dataArray[0].id);
          console.log('📚 name do primeiro:', dataArray[0].name);
          console.log('📚 title do primeiro:', dataArray[0].title);
        }
        // Mapear 'id' para '_id' para compatibilidade com o código existente
        const mappedData = dataArray.map((item: any) => ({
          ...item,
          _id: item._id || item.id // Usar _id se existir, senão usar id
        }));
        console.log('✅ Dados mapeados - _id do primeiro:', mappedData[0]?._id);
        return mappedData;
      }
      
      console.log('🔍 Buscando horários para turma:', selectedClass);
      const response = await api.get(`/generated-timetables/by-class/${selectedClass}`);
      console.log('📚 Resposta completa:', response);
      console.log('📚 Horários recebidos:', response.data);
      const data = response.data?.data;
      const dataArray = Array.isArray(data) ? data : (data ? [data] : []);
      console.log('📚 Quantidade:', dataArray.length);
      return dataArray;
    },
    enabled: !!selectedClass,
  });

  // Buscar horários emergenciais salvos
  useQuery({
    queryKey: ['emergencySchedules'],
    queryFn: async () => {
      try {
        const response = await api.get('/emergency-schedules');
        console.log('🆘 Horários emergenciais salvos:', response.data);
        const data = response.data?.data || response.data || [];
        const schedules = Array.isArray(data) ? data : [];
        console.log('📋 Total de horários emergenciais:', schedules.length);
        setSavedSchedules(schedules);
        return schedules;
      } catch (error) {
        console.error('Erro ao buscar horários emergenciais:', error);
        return [];
      }
    },
  });

  // Logs de debug (depois de todos os hooks)
  console.log('🎯 Turma selecionada:', selectedClass);
  console.log('📚 Horários carregados:', savedTimetables);
  console.log('🔄 Loading:', loadingTimetables);

  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const currentDay = weekDays[new Date(selectedDate).getDay()];

  /**
   * Função para compactar horários por turma
   * Coloca aulas com professor nos primeiros períodos e janelas no final
   * IMPORTANTE: Renumera os períodos sequencialmente (1, 2, 3...) 
   */
  const compactScheduleByClass = (slots: EmergencySlot[]): EmergencySlot[] => {
    console.log('🔄 Iniciando compactação de horários...');
    console.log(`   Total de slots recebidos: ${slots.length}`);
    
    // Agrupar slots por turma e dia
    const slotsByClass = slots.reduce((acc: any, slot: any) => {
      const key = `${slot.classId}|||${slot.day}`;
      if (!acc[key]) {
        acc[key] = {
          classId: slot.classId,
          className: slot.className,
          gradeName: slot.gradeName,
          day: slot.day,
          slots: []
        };
      }
      acc[key].slots.push(slot);
      return acc;
    }, {});
    
    console.log(`   Turmas encontradas: ${Object.keys(slotsByClass).length}`);
    
    const compactedSlots: EmergencySlot[] = [];
    
    // Para cada turma, compactar seus períodos
    Object.values(slotsByClass).forEach((classData: any) => {
      const { className, gradeName, day, slots: classSlots } = classData;
      
      console.log(`\n📚 Compactando: ${gradeName} - ${className} (${day})`);
      console.log(`   Períodos originais: ${classSlots.length}`);
      
      // Separar slots em dois grupos: com professor e vagos
      const slotsComProfessor = classSlots.filter((s: any) => !s.isVacant && s.teacherId);
      const slotsVagos = classSlots.filter((s: any) => s.isVacant || !s.teacherId);
      
      console.log(`   - Com professor: ${slotsComProfessor.length}`);
      console.log(`   - Vagos/Janela: ${slotsVagos.length}`);
      
      // Ordenar slots com professor pelo período original (para manter a sequência lógica)
      slotsComProfessor.sort((a: any, b: any) => a.period - b.period);
      
      // Também ordenar os vagos para manter consistência
      slotsVagos.sort((a: any, b: any) => a.period - b.period);
      
      // Renumerar os períodos: aulas com professor vêm primeiro (1, 2, 3...)
      let novoPeriodo = 1;
      
      // Adicionar slots com professor (compactados no início)
      slotsComProfessor.forEach((slot: any) => {
        const periodoOriginal = slot.period;
        compactedSlots.push({
          ...slot,
          period: novoPeriodo,
          // Manter horários do período novo (sequencial)
          // Usar horários padrão baseados no novo período
          wasReordered: periodoOriginal !== novoPeriodo
        });
        console.log(`      ✓ Período ${periodoOriginal} → ${novoPeriodo}: ${slot.subjectName} (${slot.teacherName})`);
        novoPeriodo++;
      });
      
      // Adicionar slots vagos no final
      slotsVagos.forEach((slot: any) => {
        const periodoOriginal = slot.period;
        compactedSlots.push({
          ...slot,
          period: novoPeriodo,
          wasReordered: true // Sempre foi movido para o final
        });
        console.log(`      ○ Período ${periodoOriginal} → ${novoPeriodo}: JANELA (${slot.absentTeacherName || 'vago'})`);
        novoPeriodo++;
      });
      
      console.log(`   ✅ Compactado: ${slotsComProfessor.length} aulas nos períodos 1-${slotsComProfessor.length}`);
      console.log(`              ${slotsVagos.length} janelas nos períodos ${slotsComProfessor.length + 1}-${novoPeriodo - 1}`);
    });
    
    console.log(`\n✅ Compactação concluída! Total de slots: ${compactedSlots.length}`);
    return compactedSlots;
  };

  const handleGenerateEmergency = async () => {
    console.log('🚀 Iniciando geração de horário emergencial...');
    console.log('   selectedClass:', selectedClass);
    console.log('   absentTeacherIds:', absentTeacherIds);
    console.log('   selectedTimetableId:', selectedTimetableId);
    console.log('   savedTimetables:', savedTimetables);
    
    if (!selectedClass) {
      toast.error('Selecione uma turma');
      console.log('❌ Falhou: sem turma');
      return;
    }

    if (absentTeacherIds.length === 0) {
      toast.error('Selecione pelo menos um professor ausente');
      console.log('❌ Falhou: sem professores');
      return;
    }

    if (!selectedTimetableId) {
      toast.error('Selecione um horário base');
      console.log('❌ Falhou: sem horário base');
      return;
    }

    console.log('✅ Validações passaram, iniciando processamento...');
    
    // Mostrar resumo dos professores confirmados
    if (confirmedSaturdayTeacherIds.length > 0) {
      const confirmedNames = confirmedSaturdayTeacherIds.map(id => {
        const teacher = teachers.find((t: Teacher) => t.id === id);
        return teacher?.name || 'Desconhecido';
      }).join(', ');
      
      toast.success(
        `✅ ${confirmedSaturdayTeacherIds.length} professor(es) confirmado(s) para o sábado:\n${confirmedNames}`,
        { duration: 5000 }
      );
      console.log(`✅ Professores confirmados para sábado (${confirmedSaturdayTeacherIds.length}):`, confirmedNames);
    } else {
      toast.warning('⚠️ Nenhum professor confirmou presença no sábado', { duration: 4000 });
      console.log('⚠️ Nenhum professor confirmado para o sábado');
    }
    
    setGenerating(true);
    try {
      let realSlots: OriginalSlot[] = [];
      let emergencySlots: EmergencySlot[] = [];

      if (selectedClass === 'all') {
        // TODAS AS TURMAS: Buscar horário base COMPLETO e percorrer todas as turmas
        console.log('📚 Processando TODAS as turmas do horário base');
        
        // Buscar horário completo (não apenas metadados)
        console.log('🔍 Buscando horário completo do ID:', selectedTimetableId);
        const fullTimetableResponse = await api.get(`/generated-timetables/full/${selectedTimetableId}`);
        const timetable = fullTimetableResponse.data?.data || fullTimetableResponse.data;
        
        if (!timetable || !timetable.timetable) {
          toast.error('Horário base não encontrado ou incompleto');
          setGenerating(false);
          return;
        }

        console.log('📊 Horário base completo encontrado:', timetable);
        console.log('📊 Turmas no horário:', Object.keys(timetable.timetable || {}));

        // Buscar informações do schedule (períodos com horários)
        console.log('⏰ Buscando configuração de períodos do schedule ID:', timetable.scheduleId);
        let schedulePeriodsMap: Record<number, { startTime: string; endTime: string }> = {};
        try {
          const scheduleResponse = await api.get(`/schedules/${timetable.scheduleId}`);
          const schedule = scheduleResponse.data;
          if (schedule && schedule.periods && Array.isArray(schedule.periods)) {
            schedule.periods.forEach((p: any) => {
              schedulePeriodsMap[p.period] = {
                startTime: p.startTime,
                endTime: p.endTime
              };
            });
            console.log('✅ Períodos carregados:', Object.keys(schedulePeriodsMap).length);
          } else {
            console.warn('⚠️ Schedule não tem períodos definidos, usando valores padrão');
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar schedule, usando valores padrão:', error);
        }

        // Percorrer TODAS as turmas da escola (não apenas as do horário base)
        // Isso garante que todas as 11 turmas apareçam, mesmo sem horário gerado
        const allClassIds = classes.map((c: Class) => c.id || c._id).filter((id): id is string => !!id);
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🚨 PROFESSORES AUSENTES SELECIONADOS:');
        console.log('═══════════════════════════════════════════════════════════');
        absentTeacherIds.forEach((id, index) => {
          const teacher = teachers.find((t: Teacher) => t.id === id);
          console.log(`   ${index + 1}. ${teacher?.name || 'Desconhecido'} (ID: ${id})`);
        });
        console.log(`📅 Data: ${selectedDate} (${currentDay})`);
        console.log(`🏫 Buscando em ${allClassIds.length} turmas da escola`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        let affectedSlotsCount = 0;
        const classesWithAffectedSlots = new Set<string>();
        let totalClassesWithoutSchedule = 0;
        let totalClassesWithoutClassesThisDay = 0;

        for (const classId of allClassIds) {
          // Buscar horário da turma (pode não existir)
          const classTimetable = timetable.timetable?.[classId as string];
          
          // Obter informações da turma
          const classObj = classes.find((c: Class) => c.id === classId || c._id === classId);
          const className = classObj?.name || classId;
          const gradeName = classObj?.grade?.name || 'Série Desconhecida';
          
          // Se não tem horário gerado, criar slots vazios para a turma aparecer
          if (!classTimetable || !Array.isArray(classTimetable)) {
            console.log(`⚠️ Turma ${gradeName} - ${className}: sem horário gerado no sistema`);
            totalClassesWithoutSchedule++;
            continue;
          }

          // Filtrar APENAS os slots do dia selecionado
          const daySlots = classTimetable.filter((slot: any) => slot.day === currentDay);
          
          // Log se não há aulas neste dia
          if (daySlots.length === 0) {
            console.log(`📅 Turma ${gradeName} - ${className}: sem aulas cadastradas na ${currentDay}`);
            totalClassesWithoutClassesThisDay++;
            continue;
          }
          
          // Buscar slots dos professores ausentes NESTE DIA ESPECÍFICO
          const affectedSlots = daySlots.filter((slot: any) => absentTeacherIds.includes(slot.teacherId));
          
          if (affectedSlots.length > 0) {
            classesWithAffectedSlots.add(classId);
            
            console.log('');
            console.log(`📚 TURMA: ${gradeName} - ${className}`);
            console.log(`   ${affectedSlots.length} período(s) afetado(s):`);
            
            affectedSlots.forEach((slot: any) => {
              const teacher = teachers.find((t: Teacher) => t.id === slot.teacherId);
              const subject = subjects.find((s: Subject) => s.id === slot.subjectId);
              console.log(`      🔴 Período ${slot.period}: ${teacher?.name || 'Prof. Desconhecido'} - ${subject?.name || 'Disciplina Desconhecida'}`);
            });
            
            affectedSlotsCount += affectedSlots.length;
          }

          // Adicionar TODOS os slots do dia selecionado (afetados ou não)
          daySlots.forEach((slot: any) => {
            const teacher = teachers.find((t: Teacher) => t.id === slot.teacherId);
            const subject = subjects.find((s: Subject) => 
              s._id === slot.subjectId || 
              s.id === slot.subjectId
            );
            
            // Buscar horários do período no schedulePeriodsMap
            const periodTimes = schedulePeriodsMap[slot.period] || { startTime: '', endTime: '' };
            
            realSlots.push({
              period: slot.period,
              startTime: slot.startTime || periodTimes.startTime,
              endTime: slot.endTime || periodTimes.endTime,
              subjectId: slot.subjectId,
              subjectName: subject?.name || 'Desconhecido',
              teacherId: slot.teacherId,
              teacherName: teacher?.name || 'Desconhecido',
              day: currentDay,
              isAffected: absentTeacherIds.includes(slot.teacherId),
              // Adicionar info da turma
              classId: classId,
              className: className,
              gradeName: gradeName
            });
          });
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESUMO DO DIA ' + currentDay.toUpperCase() + ':');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`🏫 Total de turmas na escola: ${allClassIds.length}`);
        console.log(`📚 Turmas com horário gerado: ${allClassIds.length - totalClassesWithoutSchedule}`);
        console.log(`⚠️  Turmas sem horário gerado: ${totalClassesWithoutSchedule}`);
        console.log(`📅 Turmas sem aulas na ${currentDay}: ${totalClassesWithoutClassesThisDay}`);
        console.log(`🎯 Turmas com aulas na ${currentDay}: ${allClassIds.length - totalClassesWithoutSchedule - totalClassesWithoutClassesThisDay}`);
        console.log(`🔴 Turmas afetadas (com professores ausentes): ${classesWithAffectedSlots.size}`);
        console.log(`📝 Total de períodos afetados: ${affectedSlotsCount}`);
        console.log('═══════════════════════════════════════════════════════════');
        
        if (affectedSlotsCount === 0) {
          console.log('');
          console.log('❌ ERRO: Nenhum período afetado encontrado!');
          console.log('   Possíveis razões:');
          console.log('   1. Professores selecionados não têm aulas na ' + currentDay);
          console.log('   2. Nenhuma turma tem aulas cadastradas neste dia');
          console.log('   3. Horário base não contém os professores selecionados');
          console.log('');
          
          // Mensagem específica baseada na análise
          if (totalClassesWithoutClassesThisDay === allClassIds.length - totalClassesWithoutSchedule) {
            toast.error(
              `❌ Nenhuma turma tem aulas cadastradas na ${currentDay}!\n\n` +
              `📅 Por favor, selecione um dia da semana que tenha aulas (Segunda a Sexta).\n\n` +
              `💡 Dica: Verifique o horário base "${timetable.name || timetable.title}" para ver quais dias têm aulas cadastradas.`,
              { duration: 8000 }
            );
          } else {
            toast.error(
              `❌ Os professores selecionados não têm aulas na ${currentDay}!\n\n` +
              `📅 Tente selecionar outro dia ou outros professores.`,
              { duration: 6000 }
            );
          }
          
          setGenerating(false);
          return;
        }

        console.log('✅ Horário emergencial pode ser gerado!');
        console.log('═══════════════════════════════════════════════════════════');
        
        // Verificar quais professores ausentes NÃO têm aulas neste dia
        const teachersWithClasses = new Set<string>();
        for (const classId of allClassIds) {
          const classTimetable = timetable.timetable?.[classId as string];
          if (!Array.isArray(classTimetable)) continue;
          
          const daySlots = classTimetable.filter((slot: any) => slot.day === currentDay);
          daySlots.forEach((slot: any) => {
            if (absentTeacherIds.includes(slot.teacherId)) {
              teachersWithClasses.add(slot.teacherId);
            }
          });
        }
        
        const teachersWithoutClasses = absentTeacherIds.filter(id => !teachersWithClasses.has(id));
        if (teachersWithoutClasses.length > 0) {
          console.log('');
          console.log('ℹ️ PROFESSORES SEM AULAS NA ' + currentDay.toUpperCase() + ':');
          teachersWithoutClasses.forEach((id) => {
            const teacher = teachers.find((t: Teacher) => t.id === id);
            console.log(`   • ${teacher?.name || 'Desconhecido'}`);
          });
          console.log('   (Estes professores não aparecem no horário emergencial)');
        }
        console.log('');

        // Função para encontrar professor disponível no mesmo horário
        const findAvailableTeacher = (
          period: number, 
          day: string, 
          classId: string, 
          excludeTeacherIds: string[]
        ) => {
          // Buscar todos os slots do mesmo período e dia em OUTRAS turmas
          const occupiedTeachers = new Set<string>();
          
          for (const cId of allClassIds) {
            if (cId === classId) continue; // Pular a turma atual
            const classTimetable = timetable.timetable?.[cId as string];
            if (!Array.isArray(classTimetable)) continue;
            
            const sameTimeSlots = classTimetable.filter((s: any) => 
              s.period === period && s.day === day
            );
            
            sameTimeSlots.forEach((s: any) => occupiedTeachers.add(s.teacherId));
          }
          
          // 🎯 PRIORIDADE 1: Buscar professores da PRÓPRIA TURMA neste dia que estejam disponíveis
          // Eles podem ter seus horários reorganizados/trocados
          const classTimetable = timetable.timetable?.[classId as string];
          const classTeachersThisDay = new Set<string>();
          
          if (Array.isArray(classTimetable)) {
            classTimetable
              .filter((s: any) => s.day === day && !excludeTeacherIds.includes(s.teacherId))
              .forEach((s: any) => classTeachersThisDay.add(s.teacherId));
          }
          
          // Tentar professores da própria turma primeiro
          const classTeacher = teachers.find((t: any) => 
            !excludeTeacherIds.includes(t.id) && 
            !occupiedTeachers.has(t.id) &&
            classTeachersThisDay.has(t.id)
          );
          
          if (classTeacher) {
            return { ...classTeacher, priority: 'class' }; // Prioridade 1
          }
          
          // 🎯 PRIORIDADE 2: Buscar qualquer professor disponível
          // Pode repetir professor (dar aulas extras)
          const anyAvailableTeacher = teachers.find((t: any) => 
            !excludeTeacherIds.includes(t.id) && 
            !occupiedTeachers.has(t.id)
          );
          
          if (anyAvailableTeacher) {
            return { ...anyAvailableTeacher, priority: 'available' }; // Prioridade 2
          }
          
          return null; // Prioridade 3: JANELA (será tratada no processamento)
        };

        // Gerar substituições inteligentes para slots afetados
        const makeupClasses: any[] = []; // Aulas para reposição no sábado
        
        console.log('🔍 Debug de geração de substituições:');
        console.log(`   - Total de realSlots: ${realSlots.length}`);
        console.log(`   - Slots afetados: ${realSlots.filter((s: any) => s.isAffected).length}`);
        console.log(`   - IDs de professores ausentes: ${JSON.stringify(absentTeacherIds)}`);
        
        // 🎯 PRIMEIRO: Adicionar TODAS as aulas dos professores faltosos para reposição
        console.log('📋 Adicionando TODAS as aulas dos professores faltosos para reposição...');
        console.log(`📅 Professores com presença confirmada no sábado: ${confirmedSaturdayTeacherIds.length}`);
        console.log(`📅 IDs confirmados:`, confirmedSaturdayTeacherIds);
        console.log(`📅 IDs ausentes:`, absentTeacherIds);
        
        // Garantir que todos os IDs sejam strings
        const confirmedIdsAsStrings = confirmedSaturdayTeacherIds.map(id => String(id));
        
        realSlots.forEach((slot) => {
          if (slot.isAffected) {
            // Verificar se o professor confirmou presença no sábado (comparando como strings)
            const slotTeacherIdStr = String(slot.teacherId);
            const confirmedSaturday = confirmedIdsAsStrings.includes(slotTeacherIdStr);
            
            console.log(`   🔍 Processando: ${slot.teacherName} (ID: ${slot.teacherId})`);
            console.log(`      - ID como string: "${slotTeacherIdStr}"`);
            console.log(`      - Confirmado? ${confirmedSaturday}`);
            console.log(`      - Está em confirmedSaturdayTeacherIds? ${confirmedSaturdayTeacherIds.includes(slot.teacherId)}`);
            console.log(`      - Está em confirmedIdsAsStrings? ${confirmedIdsAsStrings.includes(slotTeacherIdStr)}`);
            
            if (confirmedSaturday) {
              console.log(`   ✅ ${slot.teacherName} - ${slot.subjectName} - ${slot.className} (${slot.period}º horário) - CONFIRMADO SÁBADO`);
            } else {
              console.log(`   ⚠️ ${slot.teacherName} - ${slot.subjectName} - ${slot.className} (${slot.period}º horário) - NÃO CONFIRMADO`);
            }
            
            makeupClasses.push({
              originalTeacherId: slot.teacherId,
              originalTeacherName: slot.teacherName,
              subjectId: slot.subjectId,
              subjectName: slot.subjectName,
              classId: slot.classId,
              className: slot.className,
              gradeName: slot.gradeName,
              period: slot.period,
              originalDay: slot.day,
              makeupDay: 'Sábado',
              reason: 'Professor ausente',
              confirmedSaturday: confirmedSaturday // Flag para indicar presença confirmada
            });
          }
        });
        
        console.log(`📊 Total de aulas dos professores faltosos para reposição: ${makeupClasses.length}`);
        const confirmedCount = makeupClasses.filter(m => m.confirmedSaturday).length;
        const notConfirmedCount = makeupClasses.filter(m => !m.confirmedSaturday).length;
        console.log(`✅ Aulas confirmadas para sábado: ${confirmedCount}`);
        console.log(`⚠️ Aulas NÃO confirmadas: ${notConfirmedCount}`);
        
        // Log detalhado das aulas confirmadas
        console.log('📋 DETALHAMENTO DAS AULAS CONFIRMADAS:');
        makeupClasses.forEach((mc, idx) => {
          console.log(`   ${idx + 1}. ${mc.originalTeacherName} (ID: ${mc.originalTeacherId})`);
          console.log(`      - Disciplina: ${mc.subjectName}`);
          console.log(`      - Turma: ${mc.className}`);
          console.log(`      - Confirmado? ${mc.confirmedSaturday ? '✅ SIM' : '❌ NÃO'}`);
        });
        
        // Alerta visual com resumo
        const confirmedTeachersMap = new Map();
        makeupClasses.forEach(mc => {
          if (mc.confirmedSaturday) {
            if (!confirmedTeachersMap.has(mc.originalTeacherName)) {
              confirmedTeachersMap.set(mc.originalTeacherName, 0);
            }
            confirmedTeachersMap.set(mc.originalTeacherName, confirmedTeachersMap.get(mc.originalTeacherName) + 1);
          }
        });
        
        const notConfirmedTeachersMap = new Map();
        makeupClasses.forEach(mc => {
          if (!mc.confirmedSaturday) {
            if (!notConfirmedTeachersMap.has(mc.originalTeacherName)) {
              notConfirmedTeachersMap.set(mc.originalTeacherName, 0);
            }
            notConfirmedTeachersMap.set(mc.originalTeacherName, notConfirmedTeachersMap.get(mc.originalTeacherName) + 1);
          }
        });
        
        let summaryMessage = '';
        if (confirmedTeachersMap.size > 0) {
          summaryMessage += '✅ CONFIRMADOS PARA SÁBADO:\n';
          confirmedTeachersMap.forEach((count, name) => {
            summaryMessage += `   • ${name}: ${count} aula(s)\n`;
          });
        }
        if (notConfirmedTeachersMap.size > 0) {
          summaryMessage += '\n⚠️ DÉBITOS PENDENTES:\n';
          notConfirmedTeachersMap.forEach((count, name) => {
            summaryMessage += `   • ${name}: ${count} aula(s)\n`;
          });
        }
        
        toast.success(summaryMessage, { duration: 8000 });
        
        // 🎯 SEGUNDO: Processar substituições para o horário emergencial
        emergencySlots = realSlots.map((slot) => {
          if (slot.isAffected) {
            console.log(`🎯 Processando slot afetado:`, {
              period: slot.period,
              day: slot.day,
              teacher: slot.teacherName,
              subject: slot.subjectName,
              class: slot.className
            });
            
            const availableTeacher = findAvailableTeacher(
              slot.period, 
              slot.day, 
              slot.classId || '',
              absentTeacherIds
            );
            
            if (availableTeacher) {
              const priority = availableTeacher.priority || 'unknown';
              console.log(`   → Substituto encontrado: ${availableTeacher.name} (prioridade: ${priority})`);
              
              // Encontrou substituto - buscar de onde ele veio
              const substituteOriginSlot = realSlots.find((s: any) => 
                s.teacherId === availableTeacher.id && 
                s.period === slot.period && 
                s.day === slot.day &&
                s.classId !== slot.classId
              );
              
              // Se o substituto tinha aula própria, essa aula TAMBÉM precisa ser reposta
              if (substituteOriginSlot) {
                console.log(`   → Substituto deixou aula vazia, adicionando para reposição`);
                makeupClasses.push({
                  originalTeacherId: substituteOriginSlot.teacherId,
                  originalTeacherName: substituteOriginSlot.teacherName,
                  subjectId: substituteOriginSlot.subjectId,
                  subjectName: substituteOriginSlot.subjectName,
                  classId: substituteOriginSlot.classId,
                  className: substituteOriginSlot.className,
                  gradeName: substituteOriginSlot.gradeName,
                  period: substituteOriginSlot.period,
                  originalDay: substituteOriginSlot.day,
                  makeupDay: 'Sábado',
                  reason: 'Substituiu outro professor'
                });
              }
              
              return {
                ...slot,
                teacherId: availableTeacher.id,
                teacherName: availableTeacher.name,
                isModified: true,
                substitutePriority: priority,
                substituteOrigin: substituteOriginSlot ? {
                  className: substituteOriginSlot.className || '',
                  gradeName: substituteOriginSlot.gradeName || ''
                } : undefined
              };
            } else {
              // Não encontrou substituto - JANELA
              console.log(`   → Sem substituto, turma ficará com JANELA`);
              
              // Buscar informações do professor ausente original
              const originalTeacher = teachers.find((t: any) => t.id === slot.teacherId);
              const absentTeacherInfo = originalTeacher 
                ? `Professor ausente: ${originalTeacher.name} - ${slot.subjectName}`
                : 'Professor ausente';
              
              return {
                ...slot,
                teacherId: '',
                teacherName: 'JANELA',
                isModified: true,
                isVacant: true,
                // Preservar informações do professor ausente para exibição
                absentTeacherId: slot.teacherId,
                absentTeacherName: originalTeacher?.name || 'Desconhecido',
                absentTeacherSubject: slot.subjectName,
                vacantReason: absentTeacherInfo
              };
            }
          }
          return {
            ...slot,
            isModified: false,
          };
        });
        
        // ✅ IMPORTANTE: makeupClasses deve conter APENAS os professores que REALMENTE tinham aula
        // Se o professor não tinha aula no dia, não há nada para repor no sábado
        console.log('');
        console.log('🔍 Verificando professores ausentes sem aulas neste dia...');
        
        const teachersInMakeupClasses = new Set(makeupClasses.map((mc: any) => mc.originalTeacherId));
        const absentTeachersWithoutClasses = absentTeacherIds.filter(id => !teachersInMakeupClasses.has(id));
        
        if (absentTeachersWithoutClasses.length > 0) {
          console.log(`📋 ${absentTeachersWithoutClasses.length} professor(es) ausente(s) SEM aula neste dia`);
          
          absentTeachersWithoutClasses.forEach(teacherId => {
            const teacher = teachers.find((t: any) => t.id === teacherId);
            if (teacher) {
              console.log(`   ℹ️ ${teacher.name} não tinha aula neste dia - SEM débito para repor`);
            }
          });
        } else {
          console.log('✅ Todos os professores ausentes já estão na lista (tinham aulas)');
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESULTADO DA GERAÇÃO:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📚 Total de slots (realSlots): ${realSlots.length}`);
        console.log(`📚 Total de slots (emergencySlots): ${emergencySlots.length}`);
        console.log(`📅 ${makeupClasses.length} débito(s) REAIS para sábado (apenas professores com aulas)`);
        
        // Estatísticas de substituições
        const substitutionStats = {
          classTeachers: emergencySlots.filter((s: any) => s.substitutePriority === 'class').length,
          availableTeachers: emergencySlots.filter((s: any) => s.substitutePriority === 'available').length,
          janelas: emergencySlots.filter((s: any) => s.isVacant).length,
          unchanged: emergencySlots.filter((s: any) => !s.isModified).length
        };
        
        console.log('📊 Estatísticas de substituições:');
        console.log(`   ✅ ${substitutionStats.classTeachers} aula(s) cobertas por professores da própria turma (reorganizados)`);
        console.log(`   🔄 ${substitutionStats.availableTeachers} aula(s) cobertas por professores externos (repetindo aulas)`);
        console.log(`   ⏰ ${substitutionStats.janelas} JANELA(S) (vão para o final para saída antecipada)`);
        console.log(`   📌 ${substitutionStats.unchanged} aula(s) mantidas sem alteração`);
        
        console.log(`🔍 makeupClasses detalhado:`, JSON.stringify(makeupClasses, null, 2));
        
        // Agrupar por turma para contagem
        const slotsByClass = emergencySlots.reduce((acc: any, slot: any) => {
          const classId = slot.classId || 'unknown';
          if (!acc[classId]) {
            acc[classId] = [];
          }
          acc[classId].push(slot);
          return acc;
        }, {});
        
        console.log(`🏫 Total de turmas: ${Object.keys(slotsByClass).length}`);
        Object.entries(slotsByClass).forEach(([_, slots]: [string, any]) => {
          const slot = slots[0];
          console.log(`   - ${slot.gradeName} - ${slot.className}: ${slots.length} períodos`);
        });
        console.log(`📅 ${makeupClasses.length} aula(s) para reposição no sábado`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        // 🎯 ORDENAÇÃO INTELIGENTE: JANELAS PARA O FINAL POR TURMA
        // Agrupar por turma, ordenar cada turma (aulas primeiro, janelas no final), depois juntar tudo
        console.log('🔄 Reorganizando horário: colocando JANELAS no final de cada turma...');
        
        const slotsByClassForOrdering = emergencySlots.reduce((acc: any, slot: any) => {
          const key = `${slot.classId}_${slot.day}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(slot);
          return acc;
        }, {});
        
        // Ordenar cada turma: aulas normais primeiro (por período), janelas no final
        Object.values(slotsByClassForOrdering).forEach((classSlots: any) => {
          classSlots.sort((a: any, b: any) => {
            // JANELAS vão pro final
            if (a.isVacant && !b.isVacant) return 1;
            if (!a.isVacant && b.isVacant) return -1;
            // Mesmo tipo: ordenar por período
            return a.period - b.period;
          });
        });
        
        // Juntar tudo novamente
        emergencySlots = Object.values(slotsByClassForOrdering).flat() as EmergencySlot[];
        
        console.log('✅ Horário reorganizado! Aulas com conteúdo primeiro, JANELAS no final.');

        // 🎯 COMPACTAÇÃO FINAL: Mover TODAS as janelas para o final por turma
        // Isso permite que alunos saiam mais cedo quando há professores faltando
        console.log('');
        console.log('🔄 Aplicando compactação final dos períodos...');
        emergencySlots = compactScheduleByClass(emergencySlots);
        console.log('✅ Compactação concluída! Períodos vagos movidos para o final.');

        setOriginalSlots(realSlots);
        setEmergencySlots(emergencySlots);
        setMakeupClasses(makeupClasses);
        setEmergencyScheduleDate(selectedDate); // Salvar a data do horário gerado
        
      } else {
        // Buscar horário específico
        console.log('🔍 Procurando horário com ID:', selectedTimetableId);
        console.log('📚 Horários disponíveis:', savedTimetables.map(tt => ({
          _id: tt._id,
          name: tt.name,
          classId: tt.classId
        })));
        
        const timetable = savedTimetables.find((tt: GeneratedTimetable) => tt._id === selectedTimetableId);
        console.log('✅ Horário encontrado?', !!timetable);
        
        if (!timetable) {
          console.error('❌ Horário não encontrado!');
          console.error('   ID procurado:', selectedTimetableId);
          console.error('   Tipo do ID:', typeof selectedTimetableId);
          console.error('   IDs disponíveis:', savedTimetables.map(tt => tt._id));
          toast.error('Horário não encontrado');
          setGenerating(false);
          return;
        }

        console.log('🔍 Horário selecionado:', timetable);
        console.log('📅 Dia atual:', currentDay);
        console.log('📊 Estrutura do horário:', timetable.timetable);
        console.log('📚 Chaves disponíveis:', Object.keys(timetable.timetable || {}));

        // O horário é salvo como { [classId]: TimetableSlot[] }
        // Cada slot tem: { day, period, subjectId, teacherId, startTime, endTime }
        // Precisamos buscar a turma selecionada e filtrar pelo dia
        
        const classTimetable = timetable.timetable?.[selectedClass];
        if (!classTimetable || !Array.isArray(classTimetable)) {
          toast.error('Horário da turma não encontrado');
          setGenerating(false);
          return;
        }

        console.log('📋 Horário completo da turma:', classTimetable);

        // Filtrar slots do dia específico e ordenar por período
        const daySlots = classTimetable
          .filter((slot: any) => slot.day === currentDay)
          .sort((a: any, b: any) => a.period - b.period);
        
        console.log('🎯 Slots filtrados para', currentDay, ':', daySlots);
        
        const selectedClassObj = classes.find((c: Class) => c.id === selectedClass || c._id === selectedClass);
        const selectedClassName = selectedClassObj?.name || 'Desconhecida';
        const selectedGradeName = selectedClassObj?.grade?.name || 'Série Desconhecida';
        
        realSlots = daySlots.map((slot: any) => {
          const teacher = teachers.find((t: Teacher) => t.id === slot.teacherId);
          const subject = subjects.find((s: Subject) => s._id === slot.subjectId || (s as any).id === slot.subjectId);
          
          return {
            period: slot.period,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectId: slot.subjectId,
            subjectName: subject?.name || 'Desconhecido',
            teacherId: slot.teacherId,
            teacherName: teacher?.name || 'Desconhecido',
            day: slot.day,
            isAffected: absentTeacherIds.includes(slot.teacherId),
            classId: selectedClass,
            className: selectedClassName,
            gradeName: selectedGradeName
          };
        });

        if (realSlots.length === 0) {
          toast.error('Nenhuma aula encontrada para este dia');
          setGenerating(false);
          return;
        }

        // Se nenhuma aula foi afetada, avisar
        const affectedSlots = realSlots.filter(slot => slot.isAffected);
        if (affectedSlots.length === 0) {
          toast.error('Estes professores não têm aulas neste dia/turma');
          setGenerating(false);
          return;
        }

        // 🎯 FUNÇÃO AUXILIAR: Encontrar professor disponível (mesma lógica que "todas as turmas")
        const findAvailableTeacherForClass = (period: number, day: string) => {
          // 1. Buscar professores ocupados neste mesmo horário em OUTRAS turmas
          const occupiedTeachers = new Set<string>();
          
          // Usar as turmas disponíveis no horário base
          const allAvailableClassIds = Object.keys(timetable.timetable || {});
          
          for (const cId of allAvailableClassIds) {
            if (cId === selectedClass) continue;
            const classTimetable = timetable.timetable[cId];
            if (!Array.isArray(classTimetable)) continue;
            
            const sameTimeSlots = classTimetable.filter((s: any) => 
              s.period === period && s.day === day
            );
            
            sameTimeSlots.forEach((s: any) => occupiedTeachers.add(s.teacherId));
          }
          
          // 2. Buscar apenas professores que DÃO AULA NESTE DIA na turma selecionada
          const classTimetable = timetable.timetable[selectedClass];
          const teachersInThisDay = new Set<string>();
          
          if (Array.isArray(classTimetable)) {
            classTimetable
              .filter((s: any) => s.day === day)
              .forEach((s: any) => teachersInThisDay.add(s.teacherId));
          }
          
          // 3. Encontrar professor disponível (não ausente, não ocupado, e que dá aula neste dia)
          const availableTeacher = teachers.find((t: any) => 
            !absentTeacherIds.includes(t.id) && 
            !occupiedTeachers.has(t.id) &&
            teachersInThisDay.has(t.id) // ✅ Apenas professores deste dia
          );
          
          return availableTeacher;
        };

        // Gerar horário emergencial (substituições inteligentes)
        const emergencySlots: EmergencySlot[] = realSlots.map((slot) => {
          if (slot.isAffected) {
            // Buscar substituto disponível (da mesma turma e dia)
            const availableTeacher = findAvailableTeacherForClass(slot.period, slot.day);
            
            if (availableTeacher) {
              return {
                ...slot,
                teacherId: availableTeacher.id,
                teacherName: availableTeacher.name,
                isModified: true,
              };
            } else {
              // Sem substituto disponível - JANELA
              return {
                ...slot,
                teacherId: '',
                teacherName: 'JANELA',
                isModified: true,
                isVacant: true
              };
            }
          }
          return {
            ...slot,
            isModified: false,
          };
        });

        // 🎯 ORDENAÇÃO: JANELAS PARA O FINAL (mesmo lógica para turma específica)
        emergencySlots.sort((a, b) => {
          if (a.isVacant && !b.isVacant) return 1;
          if (!a.isVacant && b.isVacant) return -1;
          return a.period - b.period;
        });

        setOriginalSlots(realSlots);
        setEmergencySlots(emergencySlots);
      }
      
      const affectedClassCount = selectedClass === 'all' ? classes.length : 1;
      
      // Não salvar automaticamente - usuário escolhe quando salvar clicando no botão "Salvar"
      
      toast.success(`✅ Horário emergencial gerado! (${affectedClassCount} turma(s))`);

      // Enviar alerta - se "all", envia para todas as turmas
      if (selectedClass === 'all') {
        for (const cls of classes) {
          await api.post('/live-messages/alert-vacant', {
            classId: cls._id,
            className: `${cls.grade?.name} - ${cls.name}`,
            period: 'Vários',
            day: currentDay,
            reason: reason || 'Professor ausente',
          });
        }
        toast.success(`📱 Alerta enviado para ${classes.length} turmas`);
      } else {
        await api.post('/live-messages/alert-vacant', {
          classId: selectedClass,
          className: classes.find((c: any) => c._id === selectedClass)?.name,
          period: 'Vários',
          day: currentDay,
          reason: reason || 'Professor ausente',
        });
        toast.success('📱 Alerta enviado aos professores');
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao gerar horário emergencial');
    } finally {
      setGenerating(false);
    }
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find((t: any) => t.id === teacherId)?.name || 'N/A';
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s: Subject) => s._id === subjectId || s.id === subjectId)?.name || 'N/A';
  };

  const getSubjectColor = (subjectId: string) => {
    return subjects.find((s: Subject) => s._id === subjectId || s.id === subjectId)?.color || '#9CA3AF';
  };

  // Função para salvar horário emergencial
  const handleSaveEmergencySchedule = async () => {
    if (absentTeacherIds.length === 0 || emergencySlots.length === 0) {
      toast.error('Gere um horário emergencial primeiro!');
      return;
    }

    const absentTeachersNames = absentTeacherIds
      .map(id => teachers.find((t: Teacher) => t.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💾 SALVANDO HORÁRIO EMERGENCIAL - VERIFICAÇÃO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('👥 Total de professores ausentes:', absentTeacherIds.length);
    console.log('📝 IDs dos professores:', absentTeacherIds);
    console.log('📝 Nomes dos professores:', absentTeachersNames);
    console.log('📚 Total de slots emergenciais:', emergencySlots.length);
    
    // Verificar quantos slots vagos existem (cada um deve ter info do professor ausente)
    const vacantSlots = emergencySlots.filter(s => s.isVacant);
    console.log('🔵 Total de JANELAS (slots vagos):', vacantSlots.length);
    
    // Verificar se cada janela tem informação do professor ausente
    vacantSlots.forEach((slot, index) => {
      console.log(`   Janela ${index + 1}:`, {
        turma: slot.className,
        periodo: slot.period,
        absentTeacherId: slot.absentTeacherId,
        absentTeacherName: slot.absentTeacherName,
        absentTeacherSubject: slot.absentTeacherSubject
      });
    });
    
    // Verificar se todos os professores ausentes estão representados nos slots
    const representedTeachers = new Set(vacantSlots.map(s => s.absentTeacherId).filter(Boolean));
    const missingTeachers = absentTeacherIds.filter(id => !representedTeachers.has(id));
    
    if (missingTeachers.length > 0) {
      console.warn('⚠️ ATENÇÃO: Professores ausentes NÃO representados nas janelas:');
      missingTeachers.forEach(id => {
        const teacher = teachers.find(t => t.id === id);
        console.warn(`   → ${teacher?.name || id} (pode não ter aulas neste dia)`);
      });
    } else {
      console.log('✅ Todos os professores ausentes estão representados nas janelas.');
    }
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    // Usar nome personalizado ou gerar um automático
    const scheduleName = customScheduleName || 
      `Emergencial - ${absentTeachersNames} - ${new Date(selectedDate).toLocaleDateString('pt-BR')}`;
    
    // Obter dia da semana - usar horário local, não UTC
    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const selectedDateObj = new Date(selectedDate + 'T12:00:00'); // Adiciona meio-dia para evitar problemas de timezone
    const dayOfWeek = weekDays[selectedDateObj.getDay()];

    try {
      setIsSaving(true);
      
      // Preparar dados para salvar
      const scheduleData = {
        name: scheduleName,
        date: selectedDate, // Enviar como YYYY-MM-DD string
        dayOfWeek,
        classId: selectedClass === 'all' ? 'multiple' : selectedClass,
        baseScheduleId: selectedTimetableId,
        absentTeacherIds,
        absentTeachersNames,
        reason,
        originalSlots,
        emergencySlots,
        makeupClasses,
        saturdayRealized, // Estado do checkbox de sábado realizado
        affectedSlotsCount: originalSlots.filter((s: any) => s.isAffected).length,
        affectedClasses: [...new Set(emergencySlots.map(s => s.classId))].filter(Boolean),
      };

      console.log('💾 Salvando horário emergencial:', {
        name: scheduleName,
        date: selectedDate,
        dayOfWeek,
        absentTeachersCount: absentTeacherIds.length,
        emergencySlotsCount: emergencySlots.length,
        vacantSlotsCount: vacantSlots.length,
        makeupClassesCount: makeupClasses.length
      });

      const response = await api.post('/emergency-schedules', scheduleData);
      console.log('✅ Resposta do servidor:', response.data);
      
      toast.success('Horário emergencial salvo com sucesso!');
      
      // Marcar se notificações foram/serão enviadas
      const savedSchedule = {
        ...response.data.data,
        notificationsSent: sendNotifications
      };
      
      // Adicionar à lista de salvos
      setSavedSchedules(prev => [savedSchedule, ...prev]);

      // Enviar notificações automaticamente se marcado
      if (sendNotifications) {
        console.log('📨 Enviando notificações automaticamente...');
        await handleSendNotifications();
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      console.error('❌ Erro completo:', error.response?.data);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Headers:', error.response?.headers);
      toast.error(error.response?.data?.message || 'Erro ao salvar horário emergencial');
    } finally {
      setIsSaving(false);
    }
  };

  // Função para imprimir
  const handlePrint = () => {
    if (emergencySlots.length === 0) {
      toast.error('Gere um horário emergencial primeiro!');
      return;
    }
    
    window.print();
  };

  // Função para visualizar horário salvo
  const handleViewSavedSchedule = (schedule: any) => {
    console.log('👁️ Visualizando horário salvo:', schedule);
    
    // Carregar todos os dados do horário salvo
    const dateStr = schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setSelectedClass(schedule.classId || 'all');
    setSelectedTimetableId(schedule.baseScheduleId);
    setAbsentTeacherIds(schedule.absentTeacherIds || []);
    setReason(schedule.reason || '');
    
    // scheduleType removido - não existe no state
    
    console.log('📋 Original slots do horário salvo:', schedule.originalSlots?.length);
    console.log('⚡ Emergency slots do horário salvo:', schedule.emergencySlots?.length);
    
    // Enriquecer slots com TODAS as informações necessárias
    const enrichedOriginalSlots = (schedule.originalSlots || []).map((slot: any) => {
      // Buscar informações da turma
      const classInfo = classes.find((c: Class) => c.id === slot.classId || c._id === slot.classId);
      const subject = subjects.find((s: Subject) => s._id === slot.subjectId || s.id === slot.subjectId);
      const teacher = teachers.find((t: Teacher) => t.id === slot.teacherId);
      
      return {
        ...slot,
        subjectName: slot.subjectName || subject?.name || getSubjectName(slot.subjectId),
        teacherName: slot.teacherName || teacher?.name || getTeacherName(slot.teacherId),
        className: slot.className || classInfo?.name || 'Desconhecida',
        gradeName: slot.gradeName || classInfo?.grade?.name || 'Série Desconhecida',
        // Preservar horários reais do slot
        startTime: slot.startTime,
        endTime: slot.endTime
      };
    });
    
    const enrichedEmergencySlots = (schedule.emergencySlots || []).map((slot: any) => {
      // Buscar informações da turma
      const classInfo = classes.find((c: Class) => c.id === slot.classId || c._id === slot.classId);
      const subject = subjects.find((s: Subject) => s._id === slot.subjectId || s.id === slot.subjectId);
      const teacher = teachers.find((t: Teacher) => t.id === slot.teacherId);
      
      return {
        ...slot,
        subjectName: slot.subjectName || subject?.name || getSubjectName(slot.subjectId),
        teacherName: slot.teacherName || teacher?.name || getTeacherName(slot.teacherId),
        className: slot.className || classInfo?.name || 'Desconhecida',
        gradeName: slot.gradeName || classInfo?.grade?.name || 'Série Desconhecida',
        // Preservar horários reais do slot
        startTime: slot.startTime,
        endTime: slot.endTime
      };
    });
    
    console.log('✅ Slots enriquecidos - original:', enrichedOriginalSlots.length);
    console.log('✅ Slots enriquecidos - emergency:', enrichedEmergencySlots.length);
    if (enrichedOriginalSlots.length > 0) {
      console.log('📖 Exemplo de slot ORIGINAL enriquecido:', enrichedOriginalSlots[0]);
    }
    if (enrichedEmergencySlots.length > 0) {
      console.log('📖 Exemplo de slot EMERGENCY enriquecido:', enrichedEmergencySlots[0]);
      console.log('📖 Todos os classIds únicos:', [...new Set(enrichedEmergencySlots.map((s: any) => s.classId))]);
      console.log('📖 Todos os dias únicos:', [...new Set(enrichedEmergencySlots.map((s: any) => s.day))]);
    }
    
    setOriginalSlots(enrichedOriginalSlots);
    setEmergencySlots(enrichedEmergencySlots);
    setMakeupClasses(schedule.makeupClasses || []);
    setEmergencyScheduleDate(schedule.date || selectedDate); // Atualizar data do horário emergencial
    setGenerating(false);
    
    // Rolar suavemente para a visualização
    setTimeout(() => {
      const scheduleElement = document.querySelector('.emergency-schedule-view');
      if (scheduleElement) {
        scheduleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    
    toast.success('Horário carregado!');
  };

  // Função para imprimir horário salvo específico
  const handlePrintSavedSchedule = (schedule: any) => {
    handleViewSavedSchedule(schedule);
    setTimeout(() => window.print(), 500);
  };

  // Função para excluir horário salvo
  const handleDeleteSavedSchedule = async (scheduleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este horário emergencial?')) {
      return;
    }

    try {
      console.log('🗑️ Excluindo horário ID:', scheduleId);
      const response = await api.delete(`/emergency-schedules/${scheduleId}`);
      console.log('✅ Resposta da exclusão:', response.data);
      
      toast.success('Horário excluído!');
      
      // Atualizar lista local
      setSavedSchedules(savedSchedules.filter(s => (s._id || s.id) !== scheduleId));
      
      // Invalidar cache do React Query
      queryClient.invalidateQueries({ queryKey: ['generatedTimetables'] });
      
      // Limpar horário se estava visualizando o que foi excluído
      if (selectedTimetableId === scheduleId || emergencySlots.some(slot => slot.classId === scheduleId)) {
        setEmergencySlots([]);
        setOriginalSlots([]);
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao excluir:', error);
      console.error('❌ Detalhes do erro:', error.response?.data);
      
      // Se for 404, remover da lista local (já foi excluído antes)
      if (error.response?.status === 404) {
        console.log('⚠️ Horário não encontrado (404), removendo da lista local e invalidando cache...');
        setSavedSchedules(savedSchedules.filter(s => (s._id || s.id) !== scheduleId));
        
        // Invalidar cache para recarregar dados frescos
        queryClient.invalidateQueries({ queryKey: ['generatedTimetables'] });
        
        toast.success('Horário já havia sido excluído anteriormente');
      } else {
        toast.error(error.response?.data?.message || 'Erro ao excluir horário');
      }
    }
  };

  // Função para enviar notificações aos professores
  const handleSendNotifications = async () => {
    if (absentTeacherIds.length === 0 || emergencySlots.length === 0) {
      toast.error('Gere um horário emergencial primeiro!');
      return;
    }

    try {
      setIsSendingNotifications(true);

      const absentTeachersNames = absentTeacherIds
        .map(id => teachers.find((t: Teacher) => t.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      
      // Obter professores afetados (substitutos)
      const affectedTeacherIds = new Set<string>();
      emergencySlots.forEach(slot => {
        if (slot.isModified && slot.teacherId) {
          affectedTeacherIds.add(slot.teacherId);
        }
      });

      // Criar notificações para cada professor
      const notifications = [];

      // 1. Notificar professores ausentes
      for (const absentTeacherId of absentTeacherIds) {
        const absentNotification = {
          type: 'emergency_schedule',
          title: '🚨 Horário Emergencial - Ausência Registrada',
          message: `Sua ausência em ${new Date(selectedDate).toLocaleDateString('pt-BR')} foi registrada. ${reason ? `Motivo: ${reason}` : ''}`,
          recipientId: absentTeacherId,
          recipientType: 'teacher',
          priority: 'high',
          data: {
            scheduleType: 'emergency',
            date: selectedDate,
            reason,
            affectedClassesCount: [...new Set(emergencySlots.map(s => s.classId))].length,
          }
        };
        notifications.push(absentNotification);
      }

      // 2. Notificar professores substitutos
      for (const teacherId of affectedTeacherIds) {
        const substituteSlots = emergencySlots.filter(s => s.isModified && s.teacherId === teacherId);
        
        const classNames = [...new Set(substituteSlots.map(s => s.className))].filter(Boolean).join(', ');
        
        const substituteNotification = {
          type: 'emergency_schedule',
          title: '⚡ Horário Emergencial - Você foi escalado',
          message: `Você foi escalado para cobrir ${substituteSlots.length} aula(s) em ${new Date(selectedDate).toLocaleDateString('pt-BR')} devido à ausência de ${absentTeachersNames}. Turmas: ${classNames}`,
          recipientId: teacherId,
          recipientType: 'teacher',
          priority: 'high',
          data: {
            scheduleType: 'emergency',
            date: selectedDate,
            absentTeachers: absentTeachersNames,
            substituteSlotsCount: substituteSlots.length,
            classes: classNames,
          }
        };
        notifications.push(substituteNotification);
      }

      console.log('📨 Enviando notificações:', notifications);

      // Enviar todas as notificações
      const promises = notifications.map(notification =>
        api.post('/notifications', notification)
      );

      await Promise.all(promises);

      toast.success(`✅ ${notifications.length} notificação(ões) enviada(s) com sucesso!`);

    } catch (error: any) {
      console.error('Erro ao enviar notificações:', error);
      toast.error(error.response?.data?.message || 'Erro ao enviar notificações');
    } finally {
      setIsSendingNotifications(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - OCULTO NA IMPRESSÃO */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded no-print">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-red-800">
          <AlertTriangle className="text-red-600" />
          Horário Emergencial
        </h1>
        <p className="text-red-700 mt-2">
          Crie horários provisórios rapidamente quando houver ausência de professor
        </p>
      </div>

      {/* Mensagem quando não há horários salvos */}
      {savedSchedules.length === 0 && (
        <div className="card mb-6 no-print bg-yellow-50 border-2 border-yellow-300">
          <div className="flex items-center gap-3">
            <FileText className="text-yellow-600" size={24} />
            <div>
              <h3 className="font-bold text-lg text-yellow-800">
                Nenhum horário emergencial salvo
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Gere e salve um horário emergencial para que ele apareça aqui para consultas futuras.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seção de Atalhos Rápidos - SEMPRE VISÍVEL NO TOPO */}
      {savedSchedules.length > 0 && (
        <div className="card mb-6 no-print bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xl flex items-center gap-2 text-blue-800">
              <FileText className="text-blue-600" size={24} />
              📚 Horários Emergenciais Salvos ({savedSchedules.length})
            </h3>
            <button
              onClick={() => setShowQuickAccess(!showQuickAccess)}
              className="text-sm text-blue-700 hover:text-blue-900 font-bold px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              {showQuickAccess ? '▼ Ocultar' : '▶ Mostrar'}
            </button>
          </div>

          {showQuickAccess && (
            <div className="space-y-3">
              {savedSchedules.slice(0, 5).map((schedule) => (
                <div
                  key={schedule._id || schedule.id}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {schedule.name || 'Horário sem nome'}
                    </h4>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(schedule.date).toLocaleDateString('pt-BR')} ({schedule.dayOfWeek})
                      </span>
                      {schedule.absentTeachersNames && (
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {schedule.absentTeachersNames}
                        </span>
                      )}
                      {schedule.reason && (
                        <span className="flex items-center gap-1">
                          <AlertTriangle size={14} />
                          {schedule.reason}
                        </span>
                      )}
                      {schedule.affectedSlotsCount && (
                        <span className="text-red-600 font-medium">
                          {schedule.affectedSlotsCount} aula(s) afetada(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleViewSavedSchedule(schedule)}
                      className="btn-secondary flex items-center gap-2 py-2 px-3 text-sm"
                      title="Visualizar"
                    >
                      <Eye size={16} />
                      Ver
                    </button>
                    <button
                      onClick={() => handlePrintSavedSchedule(schedule)}
                      className="btn-primary flex items-center gap-2 py-2 px-3 text-sm"
                      title="Imprimir"
                    >
                      <Printer size={16} />
                      Imprimir
                    </button>
                    <button
                      onClick={() => handleDeleteSavedSchedule(schedule._id || schedule.id)}
                      className="btn-danger flex items-center gap-2 py-2 px-3 text-sm"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              {savedSchedules.length > 5 && (
                <button
                  onClick={() => setShowSavedList(true)}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2"
                >
                  Ver todos ({savedSchedules.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário - OCULTO NA IMPRESSÃO */}
        <div className="lg:col-span-2 space-y-6 no-print">
          {/* Informações Básicas */}
          <div className="card">
            <h3 className="font-bold text-lg mb-4">📋 Informações da Emergência</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="inline mr-2" size={18} />
                  Data
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Dia da semana: <strong>{currentDay}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <User className="inline mr-2" size={18} />
                  Turma Afetada
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    const selected = e.target.value;
                    console.log('🔄 Mudando turma para:', selected);
                    setSelectedClass(selected);
                  }}
                  className="input"
                >
                  <option value="">Selecione a turma</option>
                  <option value="all">✨ Todas as Turmas ({classes.length})</option>
                  <optgroup label="Turmas Específicas">
                    {classes.map((c: Class) => (
                      <option key={c.id} value={c.id}>
                        {c.grade?.name} - {c.name} ({c.shift})
                      </option>
                    ))}
                  </optgroup>
                </select>
                {selectedClass === 'all' && (
                  <p className="text-sm text-blue-600 mt-1 font-medium">
                    ℹ️ Mostrará aulas afetadas em todas as turmas
                  </p>
                )}
              </div>

              {/* Seletor de Horário Salvo */}
              {selectedClass && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Clock className="inline mr-2" size={18} />
                    Horário Base
                  </label>
                  <select
                    value={selectedTimetableId}
                    onChange={(e) => {
                      console.log('📅 Horário selecionado ID:', e.target.value);
                      setSelectedTimetableId(e.target.value);
                    }}
                    className="input"
                    disabled={loadingTimetables}
                  >
                    <option value="">
                      {loadingTimetables ? 'Carregando...' : 'Selecione o horário'}
                    </option>
                    {savedTimetables.map((tt: GeneratedTimetable) => {
                      console.log('🔍 Timetable option - _id:', tt._id, 'name:', tt.name);
                      return (
                        <option key={tt._id || tt.name} value={tt._id}>
                          {tt.name || 'Horário sem nome'} - {new Date(tt.createdAt).toLocaleDateString()}
                        </option>
                      );
                    })}
                  </select>
                  {!loadingTimetables && savedTimetables.length === 0 && selectedClass && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ Nenhum horário salvo para esta turma
                    </p>
                  )}
                  {loadingTimetables && (
                    <p className="text-sm text-gray-500 mt-1">
                      🔄 Carregando horários...
                    </p>
                  )}
                  {!loadingTimetables && savedTimetables.length > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ {savedTimetables.length} horário(s) disponível(is)
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Aviso importante sobre múltiplos dias */}
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-blue-900 mb-2">📌 Informação Importante sobre Reposição</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    O sistema considera apenas as aulas <strong>do dia selecionado</strong> para reposição no sábado.
                  </p>
                  <p className="text-sm text-blue-800">
                    Se um professor faltou em <strong>vários dias</strong>, você precisa gerar um horário emergencial 
                    para <strong>cada dia de falta</strong>. As aulas de todos os dias aparecerão no sábado de reposição 
                    somente se você gerar o horário para cada data.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div>
                <label className="block text-sm font-medium mb-3">
                  <User className="inline mr-2" size={18} />
                  Professor(es) Ausente(s)
                </label>
                
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-white">
                  {teachers.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum professor cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                      {teachers.map((t: Teacher) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={absentTeacherIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAbsentTeacherIds([...absentTeacherIds, t.id]);
                                console.log('👨‍🏫 Professor adicionado:', t.name);
                              } else {
                                setAbsentTeacherIds(absentTeacherIds.filter(id => id !== t.id));
                                console.log('👨‍🏫 Professor removido:', t.name);
                              }
                            }}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-700 flex-1">{t.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {absentTeacherIds.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      {absentTeacherIds.length} professor(es) selecionado(s):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {absentTeacherIds.map(id => {
                        const teacher = teachers.find((t: Teacher) => t.id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                            {teacher?.name}
                            <button
                              onClick={() => setAbsentTeacherIds(absentTeacherIds.filter(tid => tid !== id))}
                              className="hover:text-red-200 ml-1"
                              title="Remover"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Professores que confirmaram presença no sábado */}
                {absentTeacherIds.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-3 text-green-700">
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Professores que confirmaram presença no sábado
                      </span>
                    </label>
                    <p className="text-xs text-gray-600 mb-3">
                      Marque os professores faltosos que confirmaram presença para o sábado de reposição. 
                      Suas aulas aparecerão no horário do sábado.
                    </p>
                    
                    <div className="border border-green-300 rounded-lg p-4 bg-green-50">
                      {absentTeacherIds.length === 0 ? (
                        <p className="text-gray-500 text-sm">Selecione professores faltosos primeiro</p>
                      ) : (
                        <div className="space-y-2">
                          {absentTeacherIds.map(tid => {
                            const teacher = teachers.find((t: Teacher) => t.id === tid);
                            if (!teacher) return null;
                            return (
                              <label
                                key={tid}
                                className="flex items-center gap-3 p-2 hover:bg-green-100 rounded cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={confirmedSaturdayTeacherIds.includes(tid)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setConfirmedSaturdayTeacherIds([...confirmedSaturdayTeacherIds, tid]);
                                      console.log('✅ Professor confirmou sábado:', teacher.name);
                                    } else {
                                      setConfirmedSaturdayTeacherIds(confirmedSaturdayTeacherIds.filter(id => id !== tid));
                                      console.log('❌ Professor NÃO confirmou sábado:', teacher.name);
                                    }
                                  }}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700 flex-1">{teacher.name}</span>
                                {confirmedSaturdayTeacherIds.includes(tid) && (
                                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                                    ✓ Confirmado
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <AlertTriangle className="inline mr-2" size={18} />
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Doença, emergência..."
                  className="input"
                />
              </div>
            </div>
            
            {/* Resumo antes de gerar */}
            {absentTeacherIds.length > 0 && selectedClass && selectedTimetableId && (
              <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  📊 Resumo da Geração
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <strong>📅 Data:</strong> {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-gray-700">
                    <strong>👥 Professores ausentes:</strong> {absentTeacherIds.length}
                  </p>
                  {confirmedSaturdayTeacherIds.length > 0 ? (
                    <p className="text-green-700 font-medium">
                      <strong>✅ Confirmados para sábado:</strong> {confirmedSaturdayTeacherIds.length} professor(es)
                    </p>
                  ) : (
                    <p className="text-orange-700 font-medium">
                      <strong>⚠️ Atenção:</strong> Nenhum professor confirmou presença no sábado
                    </p>
                  )}
                  <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                    <p className="text-xs text-gray-600">
                      💡 <strong>Dica:</strong> Apenas as aulas do dia <strong>{currentDay}</strong> irão para o sábado de reposição. 
                      Se o professor faltou em outros dias, gere um horário separado para cada data.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                console.log('🖱️ Botão clicado!');
                console.log('   Estado atual:', {
                  generating,
                  selectedClass,
                  absentTeacherIds,
                  selectedTimetableId,
                  isDisabled: generating || 
                    !selectedClass || 
                    absentTeacherIds.length === 0 ||
                    !selectedTimetableId
                });
                handleGenerateEmergency();
              }}
              disabled={
                generating || 
                !selectedClass || 
                absentTeacherIds.length === 0 ||
                !selectedTimetableId
              }
              className="btn-primary w-full mt-4"
            >
              <Zap size={20} />
              {generating 
                ? 'Gerando...' 
                : selectedClass === 'all'
                  ? `Gerar Horário Emergencial (${classes.length} turmas)`
                  : 'Gerar Horário Emergencial'
              }
            </button>

            {/* Botão REGENERAR HORÁRIO COMPLETO */}
            <button
              type="button"
              onClick={async () => {
                if (!selectedClass || absentTeacherIds.length === 0 || !selectedTimetableId) {
                  toast.error('Selecione turma, professores ausentes e horário base');
                  return;
                }
                
                const absentNames = absentTeacherIds
                  .map(id => teachers.find((t: Teacher) => t.id === id)?.name || 'Desconhecido')
                  .join(', ');
                
                const message = `🔄 Regenerar horário COMPLETO excluindo: ${absentNames}?\n\n` +
                  `Isso vai criar um NOVO horário do zero, redistribuindo todas as aulas SEM esses professores.\n\n` +
                  `⚠️ O horário original permanecerá intacto.`;
                
                if (!confirm(message)) return;
                
                setGenerating(true);
                try {
                  toast.loading('🔄 Gerando horário completo sem os professores faltosos...', { duration: 3000 });
                  
                  // Buscar horário base completo
                  const fullTimetableResponse = await api.get(`/generated-timetables/full/${selectedTimetableId}`);
                  const originalTimetable = fullTimetableResponse.data?.data || fullTimetableResponse.data;
                  
                  if (!originalTimetable || !originalTimetable.timetable) {
                    toast.error('Horário base não encontrado');
                    setGenerating(false);
                    return;
                  }
                  
                  // Buscar configuração do schedule
                  await api.get(`/schedules/${originalTimetable.scheduleId}`);
                  
                  // Criar horário emergencial baseado no original mas SEM os professores faltosos
                  const emergencyTimetable: { [classId: string]: EmergencySlot[] } = {};
                  
                  // Para cada turma, pegar apenas as aulas que NÃO são dos professores faltosos
                  Object.keys(originalTimetable.timetable).forEach(classId => {
                    const classSlots = originalTimetable.timetable[classId] || [];
                    
                    emergencyTimetable[classId] = classSlots
                      .filter((slot: any) => !absentTeacherIds.includes(slot.teacherId))
                      .map((slot: any) => ({
                        ...slot,
                        isModified: false,
                        isVacant: false
                      }));
                  });
                  
                  // Converter para formato de exibição
                  const allSlots: EmergencySlot[] = [];
                  Object.entries(emergencyTimetable).forEach(([classId, slots]) => {
                    const classInfo = classes.find((c: Class) => (c.id || c._id) === classId);
                    slots.forEach(slot => {
                      allSlots.push({
                        ...slot,
                        className: classInfo?.name || 'Desconhecida',
                        gradeName: classInfo?.grade?.name || ''
                      });
                    });
                  });
                  
                  setEmergencySlots(allSlots);
                  setEmergencyScheduleDate(selectedDate);
                  
                  toast.success(`✅ Horário emergencial gerado! ${allSlots.length} aulas mantidas (professores faltosos removidos)`);
                } catch (error: any) {
                  console.error('Erro ao regenerar:', error);
                  toast.error('Erro ao regenerar horário');
                } finally {
                  setGenerating(false);
                }
              }}
              disabled={
                generating ||
                !selectedClass || 
                absentTeacherIds.length === 0 ||
                !selectedTimetableId
              }
              className="btn bg-orange-600 hover:bg-orange-700 text-white w-full mt-2"
              title="Regenera um horário NOVO do zero, excluindo os professores faltosos"
            >
              <RefreshCw size={20} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Regenerando...' : '🔄 Regenerar Horário Completo (Novo)'}
            </button>

            {/* Botões de ação após gerar */}
            {emergencySlots.length > 0 && (
              <>
                {/* Campo para nomear o horário */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Horário (opcional)
                  </label>
                  <input
                    type="text"
                    value={customScheduleName}
                    onChange={(e) => setCustomScheduleName(e.target.value)}
                    placeholder={`Emergencial - ${new Date(selectedDate).toLocaleDateString('pt-BR')}`}
                    className="input w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se deixar em branco, será gerado automaticamente
                  </p>
                </div>

                {/* Checkbox para enviar notificações */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg no-print">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendNotifications}
                      onChange={(e) => setSendNotifications(e.target.checked)}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-blue-900">
                        <Bell size={18} />
                        Notificar professores automaticamente
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Envia notificação para o professor ausente e todos os substitutos escalados
                      </p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 no-print">
                  <button
                    onClick={handleSaveEmergencySchedule}
                    disabled={isSaving}
                    className="btn btn-success flex items-center justify-center gap-2"
                  >
                    <Save size={20} className={isSaving ? 'animate-pulse' : ''} />
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                  
                  <button
                    onClick={handleSendNotifications}
                    disabled={isSendingNotifications}
                    className="btn btn-primary flex items-center justify-center gap-2"
                  >
                    <Send size={20} className={isSendingNotifications ? 'animate-pulse' : ''} />
                    {isSendingNotifications ? 'Enviando...' : 'Notificar'}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="btn btn-outline flex items-center justify-center gap-2"
                  >
                    <Printer size={20} />
                    Imprimir
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Painel de Horários Salvos */}
          {savedSchedules.length > 0 && (
            <div className="card no-print">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <List size={20} />
                  Horários Emergenciais Salvos
                </h3>
                <button
                  onClick={() => setShowSavedList(!showSavedList)}
                  className="text-sm text-primary-600 hover:underline"
                >
                  {showSavedList ? 'Ocultar' : 'Mostrar'} ({savedSchedules.length})
                </button>
              </div>

              {showSavedList && (
                <div className="space-y-3">
                  {savedSchedules.map((schedule, index) => (
                    <div
                      key={schedule._id || index}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            {schedule.name}
                            {schedule.notificationsSent && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                <Bell size={12} />
                                Notificações enviadas
                              </span>
                            )}
                          </h4>
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <p>📅 Data: {new Date(schedule.date).toLocaleDateString('pt-BR')}</p>
                            <p>👤 Professor: {schedule.absentTeacherName}</p>
                            {schedule.reason && <p>📝 Motivo: {schedule.reason}</p>}
                            <p>🏫 Turmas afetadas: {schedule.affectedClasses?.length || 0}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          Salvo em<br/>{new Date(schedule.createdAt || schedule.date).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Painel Lateral com Informações - OCULTO NA IMPRESSÃO */}
        <div className="space-y-6 no-print">
          <div className="card bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
            <h3 className="font-bold text-lg mb-3 text-red-800 flex items-center gap-2">
              <AlertTriangle size={20} />
              Como Funciona
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">1.</span>
                <span>Selecione a turma ou todas as turmas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">2.</span>
                <span>Escolha o horário base</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">3.</span>
                <span>Informe qual(is) professor(es) está(ão) ausente(s) - pode selecionar vários</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">4.</span>
                <span>Opcionalmente adicione o motivo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">5.</span>
                <span>Clique em "Gerar" e veja as substituições</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">6.</span>
                <span>Salve para consultar depois ou imprima</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">7.</span>
                <span>Marque a opção para notificar professores automaticamente</span>
              </li>
            </ul>
          </div>

          <div className="card bg-yellow-50 border-2 border-yellow-200">
            <h3 className="font-bold text-lg mb-3 text-yellow-800 flex items-center gap-2">
              <Info size={20} />
              Legenda
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-200 border border-green-500 rounded"></div>
                <span>Professor substituto encontrado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-200 border border-yellow-500 rounded"></div>
                <span>Janela (professor sem aula neste horário)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-200 border border-red-500 rounded"></div>
                <span>Aula afetada pela ausência</span>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                <p className="font-semibold text-blue-800 mb-1">📌 Compactação de Horários</p>
                <p className="text-xs text-gray-700">
                  As janelas são automaticamente movidas para o final do dia, 
                  permitindo que os alunos saiam mais cedo quando há professores ausentes.
                </p>
              </div>
            </div>
          </div>

          {/* Alerta */}
          <div className="card bg-red-50 border-l-4 border-red-500">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-600" size={20} />
              Importante
            </h3>
            <p className="text-sm text-gray-700">
              Este horário é <strong>temporário</strong> e substitui o horário normal apenas para o dia selecionado.
            </p>
          </div>
        </div>
      </div>

      {/* CAPA E HORÁRIOS - VISÍVEIS NA IMPRESSÃO */}
      {emergencySlots.length > 0 && absentTeacherIds.length > 0 && (
        <div className="only-print page-break-after">
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-red-800 mb-8">
                    🚨 HORÁRIO EMERGENCIAL
                  </h1>
                  
                  <div className="bg-red-50 border-4 border-red-500 p-8 rounded-lg inline-block">
                    <h2 className="text-3xl font-bold text-red-700 mb-6">
                      Professores Ausentes
                    </h2>
                    
                    <div className="bg-white p-6 rounded-lg text-left">
                      <p className="text-2xl mb-4">
                        <strong>📅 Data:</strong> {new Date((emergencyScheduleDate || selectedDate) + 'T12:00:00').toLocaleDateString('pt-BR', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      
                      <div className="mb-4">
                        <strong className="text-2xl block mb-3">👨‍🏫 Professores:</strong>
                        <ul className="space-y-3">
                          {absentTeacherIds.map((teacherId, index) => {
                            const teacher = teachers.find((t: Teacher) => t.id === teacherId);
                            return (
                              <li key={teacherId} className="text-xl pl-6 flex items-center gap-3">
                                <span className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                  {index + 1}
                                </span>
                                {teacher?.name || 'Desconhecido'}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      
                      {reason && (
                        <p className="mt-4 text-xl">
                          <strong>📝 Motivo:</strong> {reason}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-lg text-gray-600 mt-8">
                    Total de aulas afetadas: <strong className="text-red-700 text-2xl">{originalSlots.filter((s: any) => s.isAffected).length}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Horário Emergencial */}
          {emergencySlots.length > 0 && (
            <div className="space-y-8 emergency-schedule-view">
              {(() => {
                // Agrupar slots por turma
                const slotsByClass: { [classId: string]: any[] } = {};
                
                emergencySlots.forEach(slot => {
                  const cId = slot.classId || 'unknown';
                  if (!slotsByClass[cId]) {
                    slotsByClass[cId] = [];
                  }
                  slotsByClass[cId].push(slot);
                });
                
                console.log('📊 Turmas encontradas nos emergencySlots:', Object.keys(slotsByClass));
                console.log('📊 Quantidade de slots por turma:', Object.entries(slotsByClass).map(([k, v]) => `${k}: ${v.length}`));
                
                return Object.entries(slotsByClass).map(([classId, slots]) => {
                  const classInfo = classes.find((c: Class) => c.id === classId || c._id === classId);
                  const className = slots[0]?.className || classInfo?.name || 'Desconhecida';
                  const gradeName = slots[0]?.gradeName || classInfo?.grade?.name || 'Série Desconhecida';
                  
                  // Agrupar slots por dia da semana
                  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
                  const slotsByDay: { [day: string]: any[] } = {};
                  weekDays.forEach(day => {
                    slotsByDay[day] = slots.filter(s => s.day === day);
                  });
                  
                  // SEMPRE mostrar TODOS os 8 períodos, independente de terem slots ou não
                  const allPeriods = [1, 2, 3, 4, 5, 6, 7, 8];
                  
                  // Mapeamento de horários padrão para cada período
                  const periodTimes: { [period: number]: { start: string; end: string } } = {
                    1: { start: '07:00', end: '08:00' },
                    2: { start: '08:00', end: '09:00' },
                    3: { start: '09:15', end: '10:15' },
                    4: { start: '10:15', end: '11:15' },
                    5: { start: '11:15', end: '12:15' },
                    6: { start: '13:00', end: '14:00' },
                    7: { start: '14:00', end: '15:00' },
                    8: { start: '15:00', end: '16:00' }
                  };
                  
                  // Buscar horários reais dos slots (se disponíveis)
                  slots.forEach((slot: any) => {
                    if (slot.period && slot.startTime && slot.endTime) {
                      periodTimes[slot.period] = {
                        start: slot.startTime,
                        end: slot.endTime
                      };
                    }
                  });
                  
                  // Contar slots modificados
                  const modifiedCount = slots.filter(s => s.isModified).length;
                      
                  return (
                    <div key={classId} className="card print-container page-break-after">
                      <div className="mb-6 print-header border-b-4 border-green-600 pb-4">
                        <h2 className="text-2xl font-bold text-center text-gray-800">
                          {gradeName} - {className}
                        </h2>
                        <p className="text-center text-gray-600 mt-2">
                          Horário Emergencial • {new Date((emergencyScheduleDate || selectedDate) + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-center text-sm text-gray-500 mt-1">
                          Professor(es) Ausente(s): <span className="font-bold text-red-700">{absentTeacherIds.map(id => getTeacherName(id)).join(', ')}</span> • 
                          {modifiedCount} substituição{modifiedCount !== 1 ? 'ões' : ''}
                        </p>
                      </div>

                      <div className="space-y-6">
                        {/* Horário Original */}
                        <div>
                          <h3 className="text-lg font-bold mb-3 text-gray-700 text-center">📋 Horário Original</h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                              <thead>
                                <tr className="bg-gray-600 text-white">
                                  <th className="border border-gray-300 p-3 text-left font-bold">Horário</th>
                                  {weekDays.map((day) => (
                                    <th key={day} className="border border-gray-300 p-3 text-center font-bold">
                                      {day}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {allPeriods.map((period) => {
                                  const times = periodTimes[period] || { start: '07:00', end: '08:00' };
                                  
                                  return (
                                    <tr key={`orig-period-${period}`} className="hover:bg-gray-50">
                                      <td className="border border-gray-300 p-3 bg-gray-100 font-semibold">
                                        <div className="text-sm">{period}º</div>
                                        <div className="text-xs text-gray-600">
                                          {times.start} - {times.end}
                                        </div>
                                      </td>
                                      {weekDays.map((day) => {
                                        const originalSlot = originalSlots.find(os => 
                                          os.period === period && os.day === day && os.classId === classId
                                        );
                                        const isAffected = originalSlot?.isAffected;
                                        
                                        return (
                                          <td
                                            key={day}
                                            className={`border border-gray-300 p-2 text-center ${
                                              isAffected ? 'bg-red-100' : ''
                                            }`}
                                            style={{
                                              backgroundColor: originalSlot && !isAffected 
                                                ? `${getSubjectColor(originalSlot.subjectId)}20` 
                                                : isAffected ? '#fee2e2' : 'white',
                                            }}
                                          >
                                            {originalSlot ? (
                                              <div>
                                                <div className="font-semibold text-xs">
                                                  {originalSlot.subjectName || getSubjectName(originalSlot.subjectId)}
                                                </div>
                                                <div className={`text-xs mt-1 ${isAffected ? 'text-red-700 font-bold' : 'text-gray-600'}`}>
                                                  {originalSlot.teacherName || getTeacherName(originalSlot.teacherId)}
                                                </div>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Horário Emergencial */}
                        <div>
                          <h3 className="text-lg font-bold mb-3 text-green-700 text-center">🚨 Horário Emergencial</h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                              <thead>
                                <tr className="bg-green-600 text-white">
                                  <th className="border border-gray-300 p-3 text-left font-bold">Horário</th>
                                  {weekDays.map((day) => (
                                    <th key={day} className="border border-gray-300 p-3 text-center font-bold">
                                      {day}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {allPeriods.map((period) => {
                                  const times = periodTimes[period] || { start: '07:00', end: '08:00' };
                                  
                                  return (
                                    <tr key={`emerg-period-${period}`} className="hover:bg-gray-50">
                                      <td className="border border-gray-300 p-3 bg-gray-100 font-semibold">
                                        <div className="text-sm">{period}º</div>
                                        <div className="text-xs text-gray-600">
                                          {times.start} - {times.end}
                                        </div>
                                      </td>
                                      {weekDays.map((day) => {
                                        const slot = slotsByDay[day]?.find(s => s.period === period);
                                        const isModified = slot?.isModified;
                                        
                                        return (
                                          <td
                                            key={day}
                                            className={`border border-gray-300 p-2 text-center ${
                                              isModified ? 'bg-green-100 ring-2 ring-green-500' : ''
                                            } ${slot?.isVacant ? 'bg-yellow-100' : ''}`}
                                            style={{
                                              backgroundColor: slot && !isModified 
                                                ? `${getSubjectColor(slot.subjectId)}20` 
                                                : slot?.isVacant ? '#fef3c7' 
                                                : isModified ? '#d1fae5' : 'white',
                                            }}
                                          >
                                            {slot ? (
                                              <div>
                                                <div className={`font-semibold text-xs ${isModified ? 'text-green-900' : 'text-gray-900'}`}>
                                                  {slot.subjectName || getSubjectName(slot.subjectId)}
                                                </div>
                                                <div className={`text-xs mt-1 ${isModified ? 'text-green-700 font-bold' : 'text-gray-600'}`}>
                                                  {slot.isVacant ? (
                                                    <div className="space-y-1">
                                                      <div className="font-bold text-orange-700">🔵 JANELA</div>
                                                      {slot.absentTeacherName && (
                                                        <div className="text-[10px] text-red-600 italic">
                                                          Ausente: {slot.absentTeacherName}
                                                        </div>
                                                      )}
                                                      {slot.absentTeacherSubject && (
                                                        <div className="text-[10px] text-gray-500">
                                                          ({slot.absentTeacherSubject})
                                                        </div>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    slot.teacherName || getTeacherName(slot.teacherId)
                                                  )}
                                                </div>
                                                {isModified && !slot.isVacant && (
                                                  <div className="text-xs font-bold text-green-600 mt-1 bg-green-200 px-1 py-0.5 rounded inline-block">
                                                    ✓ SUBSTITUTO
                                                  </div>
                                                )}
                                                {slot.substituteOrigin && (
                                                  <div className="text-xs text-blue-600 mt-1">
                                                    De: {slot.substituteOrigin.gradeName} - {slot.substituteOrigin.className}
                                                  </div>
                                                )}
                                                {slot.isVacant && (
                                                  <div className="text-xs text-yellow-700 mt-1 font-semibold">
                                                    {slot.wasReordered 
                                                      ? '(compactado ao final)' 
                                                      : '(sem substituição)'
                                                    }
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Painel de Reposição no Sábado */}
          {makeupClasses.length > 0 && (
            <div className={`card ${saturdayRealized ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-4 border-green-500' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300'} mt-6 page-break-before print-container`}>
              {saturdayRealized && (
                <div className="mb-4 p-3 bg-green-600 text-white rounded-lg flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-bold text-lg">Sábado Realizado com Sucesso!</p>
                    <p className="text-sm">As aulas confirmadas foram dadas e os débitos foram baixados.</p>
                  </div>
                </div>
              )}
              <h3 className="font-bold text-xl mb-4 text-purple-800 flex items-center gap-2">
                📅 Aulas para Reposição no Sábado
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {makeupClasses.length} aula(s) precisam ser repostas no sábado.
              </p>
              
              {/* Professores com presença confirmada */}
              {makeupClasses.filter(m => m.confirmedSaturday).length > 0 && (
                <>
                  <h4 className="font-bold text-lg mb-3 text-green-700 flex items-center gap-2">
                    ✅ Horário do Sábado ({makeupClasses.filter(m => m.confirmedSaturday).length} aula(s))
                  </h4>
                  <p className="text-sm text-green-600 mb-3">
                    Professores com presença confirmada - essas aulas entram no horário oficial do sábado
                  </p>
                  
                  {/* Horário em formato de grade */}
                  <div className="overflow-x-auto mb-6">
                    {(() => {
                      // Agrupar aulas confirmadas por período
                      const confirmedClasses = makeupClasses.filter(m => m.confirmedSaturday);
                      const periods = [...new Set(confirmedClasses.map(m => m.period))].sort((a, b) => a - b);
                      
                      return (
                        <table className="min-w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-green-600 text-white">
                              <th className="border border-gray-300 p-2 text-center w-24">Horário</th>
                              <th className="border border-gray-300 p-2 text-left">Turmas / Professores / Disciplinas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {periods.map(period => {
                              const periodClasses = confirmedClasses.filter(m => m.period === period);
                              return (
                                <tr key={period} className="hover:bg-green-50">
                                  <td className="border border-gray-300 p-2 text-center font-bold bg-green-100">
                                    {period}º
                                  </td>
                                  <td className="border border-gray-300 p-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {periodClasses.map((makeup, idx) => (
                                        <div key={idx} className="bg-white border border-green-300 rounded p-2 shadow-sm">
                                          <div className="font-bold text-green-700 text-xs mb-1">
                                            {makeup.gradeName} - {makeup.className}
                                          </div>
                                          <div className="text-sm font-medium text-gray-800">
                                            {makeup.subjectName}
                                          </div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            👨‍🏫 {makeup.originalTeacherName}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            📅 Origem: {makeup.originalDay}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                  
                  {/* Lista detalhada alternativa */}
                  <details className="mb-6">
                    <summary className="cursor-pointer text-sm text-green-700 font-medium hover:text-green-800">
                      📋 Ver lista detalhada
                    </summary>
                    <div className="overflow-x-auto mt-3">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-green-600 text-white">
                            <th className="border border-gray-300 p-2 text-left">Professor</th>
                            <th className="border border-gray-300 p-2 text-left">Disciplina</th>
                            <th className="border border-gray-300 p-2 text-left">Turma</th>
                            <th className="border border-gray-300 p-2 text-center">Dia Original</th>
                            <th className="border border-gray-300 p-2 text-center">Horário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {makeupClasses
                            .filter(m => m.confirmedSaturday)
                            .map((makeup, index) => (
                              <tr key={index} className="hover:bg-green-100">
                                <td className="border border-gray-300 p-2 font-medium">{makeup.originalTeacherName}</td>
                                <td className="border border-gray-300 p-2">{makeup.subjectName}</td>
                                <td className="border border-gray-300 p-2">{makeup.gradeName} - {makeup.className}</td>
                                <td className="border border-gray-300 p-2 text-center">{makeup.originalDay}</td>
                                <td className="border border-gray-300 p-2 text-center">{makeup.period}º horário</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              )}
              
              {/* Professores SEM presença confirmada (débitos pendentes) */}
              {makeupClasses.filter(m => !m.confirmedSaturday).length > 0 && (
                <>
                  <h4 className="font-bold text-lg mb-3 text-orange-700 flex items-center gap-2">
                    ⚠️ Débitos Pendentes ({makeupClasses.filter(m => !m.confirmedSaturday).length} aula(s))
                  </h4>
                  <p className="text-sm text-orange-600 mb-3">
                    Professores que ainda não confirmaram presença no sábado
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-orange-600 text-white">
                          <th className="border border-gray-300 p-2 text-left">Professor</th>
                          <th className="border border-gray-300 p-2 text-left">Disciplina</th>
                          <th className="border border-gray-300 p-2 text-left">Turma</th>
                          <th className="border border-gray-300 p-2 text-center">Dia Original</th>
                          <th className="border border-gray-300 p-2 text-center">Horário</th>
                          <th className="border border-gray-300 p-2 text-left">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {makeupClasses
                          .filter(m => !m.confirmedSaturday)
                          .map((makeup, index) => (
                            <tr key={index} className="hover:bg-orange-100">
                              <td className="border border-gray-300 p-2">{makeup.originalTeacherName}</td>
                              <td className="border border-gray-300 p-2">{makeup.subjectName}</td>
                              <td className="border border-gray-300 p-2">{makeup.gradeName} - {makeup.className}</td>
                              <td className="border border-gray-300 p-2 text-center">{makeup.originalDay}</td>
                              <td className="border border-gray-300 p-2 text-center">{makeup.period}º horário</td>
                              <td className="border border-gray-300 p-2">{makeup.reason}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                <p className="text-sm font-semibold text-purple-900">
                  💡 <strong>Importante:</strong> As aulas confirmadas já entram no horário oficial do sábado. 
                  Os débitos pendentes precisam de confirmação de presença dos professores.
                </p>
              </div>
              
              {/* Checkbox para confirmar que o sábado foi realizado */}
              {makeupClasses.filter(m => m.confirmedSaturday).length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-400 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saturdayRealized}
                      onChange={(e) => {
                        setSaturdayRealized(e.target.checked);
                        if (e.target.checked) {
                          toast.success(
                            '✅ Sábado marcado como realizado!\n\n' +
                            `${makeupClasses.filter(m => m.confirmedSaturday).length} aula(s) será(ão) baixada(s) dos débitos dos professores.\n\n` +
                            '💾 Lembre-se de SALVAR o horário para registrar esta alteração!',
                            { duration: 6000 }
                          );
                        } else {
                          toast.info('Sábado desmarcado como realizado.', { duration: 3000 });
                        }
                      }}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-base font-bold text-green-800">
                        ✅ Sábado de Reposição foi Realizado
                      </span>
                      <p className="text-sm text-gray-700 mt-1">
                        Marque esta opção para confirmar que o sábado aconteceu e dar baixa nas {makeupClasses.filter(m => m.confirmedSaturday).length} aula(s) devida(s) dos professores.
                      </p>
                      {saturdayRealized && (
                        <div className="mt-3 p-3 bg-white border border-green-300 rounded">
                          <p className="text-sm font-medium text-green-700">
                            ✓ As seguintes aulas serão baixadas dos débitos:
                          </p>
                          <ul className="mt-2 space-y-1">
                            {Array.from(
                              makeupClasses
                                .filter(m => m.confirmedSaturday)
                                .reduce((acc, m) => {
                                  const key = m.originalTeacherName;
                                  acc.set(key, (acc.get(key) || 0) + 1);
                                  return acc;
                                }, new Map())
                            ).map(([teacher, count]) => (
                              <li key={teacher} className="text-sm text-gray-700">
                                • {teacher}: {count} aula(s)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

      {/* Estilos de impressão */}
      <style>{`
        /* Ocultar na tela, mostrar na impressão */}
        .only-print {
          display: none;
        }
        
        @media print {
          /* Mostrar apenas na impressão */
          .only-print {
            display: block !important;
          }
          
          /* Ocultar na impressão */
          .no-print {
            display: none !important;
          }
          
          /* Quebra de página após cada turma */
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
          
          /* Quebra de página antes do painel de reposição */
          .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
          
          /* Não quebrar a última turma */
          .page-break-after:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          
          .print-container {
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
          }
          
          .print-header {
            margin-bottom: 20px;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          th, td {
            border: 1px solid #333 !important;
            padding: 8px !important;
            font-size: 11px !important;
          }
          
          th {
            background-color: #4a5568 !important;
            color: white !important;
            font-weight: bold;
          }
          
          /* Cores específicas para impressão */
          .bg-red-600 {
            background-color: #dc2626 !important;
          }
          
          .bg-green-600 {
            background-color: #16a34a !important;
          }
          
          .bg-purple-600 {
            background-color: #9333ea !important;
          }
          
          .text-white {
            color: white !important;
          }
          
          /* Margem das páginas */
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
          
          /* Garantir que cada turma ocupe página inteira */
          .emergency-schedule-view > div {
            min-height: 95vh;
          }
        }
      `}</style>
    </div>
  );
}
