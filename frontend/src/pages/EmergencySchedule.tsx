import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
}

export default function EmergencySchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [absentTeacherIds, setAbsentTeacherIds] = useState<string[]>([]);
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
  const { data: savedEmergencySchedules = [] } = useQuery({
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

        // Percorrer TODAS as turmas do horário base
        const allClassIds = Object.keys(timetable.timetable || {});
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🚨 PROFESSORES AUSENTES SELECIONADOS:');
        console.log('═══════════════════════════════════════════════════════════');
        absentTeacherIds.forEach((id, index) => {
          const teacher = teachers.find((t: Teacher) => t.id === id);
          console.log(`   ${index + 1}. ${teacher?.name || 'Desconhecido'} (ID: ${id})`);
        });
        console.log(`📅 Data: ${selectedDate} (${currentDay})`);
        console.log(`🏫 Buscando em ${allClassIds.length} turmas`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        let affectedSlotsCount = 0;
        const classesWithAffectedSlots = new Set<string>();

        for (const classId of allClassIds) {
          const classTimetable = timetable.timetable[classId];
          if (!Array.isArray(classTimetable)) continue;

          // Filtrar APENAS os slots do dia selecionado
          const daySlots = classTimetable.filter((slot: any) => slot.day === currentDay);
          
          // Buscar slots dos professores ausentes NESTE DIA ESPECÍFICO
          const affectedSlots = daySlots.filter((slot: any) => absentTeacherIds.includes(slot.teacherId));
          
          // Obter informações da turma
          const classObj = classes.find((c: Class) => c.id === classId);
          const className = classObj?.name || classId;
          const gradeName = classObj?.grade?.name || 'Série Desconhecida';
          
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
            
            realSlots.push({
              period: slot.period,
              startTime: slot.startTime,
              endTime: slot.endTime,
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

        if (affectedSlotsCount === 0) {
          toast.error('Estes professores não têm aulas neste dia em nenhuma turma');
          setGenerating(false);
          return;
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ RESUMO: ${affectedSlotsCount} período(s) afetado(s) em ${classesWithAffectedSlots.size} turma(s)`);
        console.log('═══════════════════════════════════════════════════════════');
        
        // Verificar quais professores ausentes NÃO têm aulas neste dia
        const teachersWithClasses = new Set<string>();
        for (const classId of allClassIds) {
          const classTimetable = timetable.timetable[classId];
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
        const findAvailableTeacher = (period: number, day: string, classId: string, excludeTeacherIds: string[]) => {
          // Buscar todos os slots do mesmo período e dia em OUTRAS turmas
          const occupiedTeachers = new Set<string>();
          
          for (const cId of allClassIds) {
            if (cId === classId) continue; // Pular a turma atual
            const classTimetable = timetable.timetable[cId];
            if (!Array.isArray(classTimetable)) continue;
            
            const sameTimeSlots = classTimetable.filter((s: any) => 
              s.period === period && s.day === day
            );
            
            sameTimeSlots.forEach((s: any) => occupiedTeachers.add(s.teacherId));
          }
          
          // Encontrar professor disponível (não ausente e não ocupado neste horário)
          const availableTeacher = teachers.find((t: any) => 
            !excludeTeacherIds.includes(t.id) && 
            !occupiedTeachers.has(t.id)
          );
          
          return availableTeacher;
        };

        // Gerar substituições inteligentes para slots afetados
        const makeupClasses: any[] = []; // Aulas para reposição no sábado
        
        emergencySlots = realSlots.map((slot) => {
          if (slot.isAffected) {
            const availableTeacher = findAvailableTeacher(
              slot.period, 
              slot.day, 
              slot.classId || '',
              absentTeacherIds
            );
            
            if (availableTeacher) {
              // Encontrou substituto - buscar de onde ele veio
              const substituteOriginSlot = realSlots.find((s: any) => 
                s.teacherId === availableTeacher.id && 
                s.period === slot.period && 
                s.day === slot.day &&
                s.classId !== slot.classId
              );
              
              // Se o substituto tinha aula própria, essa aula precisa ser reposta
              if (substituteOriginSlot) {
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
                substituteOrigin: substituteOriginSlot ? {
                  className: substituteOriginSlot.className || '',
                  gradeName: substituteOriginSlot.gradeName || ''
                } : undefined
              };
            } else {
              // Não encontrou substituto - JANELA (aula precisa ser reposta)
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
                reason: 'Sem substituto disponível'
              });
              
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
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESULTADO DA GERAÇÃO:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📚 Total de slots (realSlots): ${realSlots.length}`);
        console.log(`📚 Total de slots (emergencySlots): ${emergencySlots.length}`);
        
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
        Object.entries(slotsByClass).forEach(([classId, slots]: [string, any]) => {
          const slot = slots[0];
          console.log(`   - ${slot.gradeName} - ${slot.className}: ${slots.length} períodos`);
        });
        console.log(`📅 ${makeupClasses.length} aula(s) para reposição no sábado`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        setOriginalSlots(realSlots);
        setEmergencySlots(emergencySlots);
        setMakeupClasses(makeupClasses);
        
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

        // Gerar horário emergencial (substituições)
        const emergencySlots: EmergencySlot[] = realSlots.map((slot) => {
          if (slot.isAffected) {
            // Substituir professores ausentes
            const substituteTeacher = teachers.find((t: any) => !absentTeacherIds.includes(t.id))?.id || '';
            return {
              ...slot,
              teacherId: substituteTeacher,
              isModified: true,
            };
          }
          return {
            ...slot,
            isModified: false,
          };
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

  const handleNotifyVacancy = async (period: number) => {
    try {
      await api.post('/live-messages/alert-vacant', {
        classId: selectedClass,
        className: classes.find((c: any) => c._id === selectedClass)?.name,
        period,
        day: currentDay,
        reason: reason || 'Horário vago',
      });

      toast.success(`✅ Alerta de vaga no ${period}º horário enviado!`);
    } catch (error) {
      toast.error('Erro ao enviar alerta');
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
    
    const scheduleName = `Emergencial - ${absentTeachersNames} - ${new Date(selectedDate).toLocaleDateString('pt-BR')}`;
    
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
        affectedSlotsCount: originalSlots.filter((s: any) => s.isAffected).length,
        affectedClasses: [...new Set(emergencySlots.map(s => s.classId))].filter(Boolean),
      };

      console.log('💾 Salvando horário emergencial:', scheduleData);
      console.log('📦 Payload completo:', JSON.stringify(scheduleData, null, 2));
      console.log('📊 makeupClasses no payload:', scheduleData.makeupClasses);

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
    
    // 🎯 Definir automaticamente o tipo de horário salvo
    if (schedule.scheduleType) {
      setScheduleType(schedule.scheduleType);
      console.log('✅ Tipo de horário definido automaticamente:', schedule.scheduleType);
    }
    
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
      
      // Limpar horário se estava visualizando o que foi excluído
      if (selectedTimetableId === scheduleId || emergencySlots.some(slot => slot.classId === scheduleId)) {
        setEmergencySlots([]);
        setOriginalSlots([]);
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao excluir:', error);
      console.error('❌ Detalhes do erro:', error.response?.data);
      toast.error(error.response?.data?.message || 'Erro ao excluir horário');
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

            {/* Botões de ação após gerar */}
            {emergencySlots.length > 0 && (
              <>
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
                        <strong>📅 Data:</strong> {new Date(selectedDate).toLocaleDateString('pt-BR', { 
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
                          Horário Emergencial • {new Date(selectedDate).toLocaleDateString('pt-BR')}
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
                                                  {slot.isVacant ? '🔵 JANELA' : (slot.teacherName || getTeacherName(slot.teacherId))}
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
                                                    (vai para o final do dia)
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
          {(() => {
            console.log('🔍 Renderizando painel de reposição...');
            console.log('   makeupClasses.length:', makeupClasses.length);
            console.log('   makeupClasses:', makeupClasses);
            return null;
          })()}
          {makeupClasses.length > 0 && (
            <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 mt-6 page-break-before print-container">
              <h3 className="font-bold text-xl mb-4 text-purple-800 flex items-center gap-2">
                📅 Aulas para Reposição no Sábado
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {makeupClasses.length} aula(s) precisam ser repostas no sábado. Data da reposição a ser agendada.
              </p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-purple-600 text-white">
                      <th className="border border-gray-300 p-2 text-left">Professor</th>
                      <th className="border border-gray-300 p-2 text-left">Disciplina</th>
                      <th className="border border-gray-300 p-2 text-left">Turma</th>
                      <th className="border border-gray-300 p-2 text-center">Dia Original</th>
                      <th className="border border-gray-300 p-2 text-center">Horário</th>
                      <th className="border border-gray-300 p-2 text-left">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {makeupClasses.map((makeup, index) => (
                      <tr key={index} className="hover:bg-purple-100">
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
              
              <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                <p className="text-sm font-semibold text-purple-900">
                  💡 <strong>Importante:</strong> As aulas acima devem ser agendadas para reposição em um sábado letivo.
                </p>
              </div>
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
