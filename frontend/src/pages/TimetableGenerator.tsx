import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { Download, Share2, Printer, RefreshCw, AlertCircle, CheckCircle, Calendar, Clock, Trash2, Edit, FolderOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Teacher {
  id: string;
  name: string;
  observations?: string;
  isActive?: boolean;
}

interface TeacherSubject {
  _id: string;
  teacherId: string;
  subjectId: string;
  classId?: string;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  gradeId?: string;
  gradeName?: string;
  isActive?: boolean;
}



interface Schedule {
  id: string;
  name: string;
  periods: Array<{
    period: number;
    startTime: string;
    endTime: string;
  }>;
}

interface TimetableSlot {
  day: string;
  period: number;
  subjectId: string;
  teacherId: string;
  classId: string;
}

export default function TimetableGenerator() {
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [generatedTimetables, setGeneratedTimetables] = useState<{ [classId: string]: TimetableSlot[] }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'day-by-day' | 'spreadsheet'>('spreadsheet');
  const [editModalData, setEditModalData] = useState<{ classId: string; day: string; period: number; currentSubjectId: string | null; currentTeacherId: string | null } | null>(null);
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<string>('');
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedTimetablesList, setSavedTimetablesList] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [observations, setObservations] = useState<string>('');

  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  // Traduzir turno
  const translateShift = (shift: string) => {
    const shifts: Record<string, string> = {
      'full': 'Integral',
      'morning': 'Manhã',
      'afternoon': 'Tarde',
      'evening': 'Noite',
      'night': 'Noite'
    };
    return shifts[shift?.toLowerCase()] || shift;
  };

  // Fetch data
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await api.get('/teachers');
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await api.get('/subjects');
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const response = await api.get('/grades');
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await api.get('/classes');
      console.log('🏫 Resposta da API /classes:', response.data);
      const classesData = Array.isArray(response.data.data) ? response.data.data : [];
      console.log('🏫 Classes processadas:', classesData);
      console.log('🏫 Primeira turma:', classesData[0]);
      return classesData;
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await api.get('/schedules');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  // Get authenticated user
  const { user } = useAuthStore();

  // Fetch teacher-subject associations
  const { data: teacherSubjects = [] } = useQuery({
    queryKey: ['teacher-subjects', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('⚠️ UserId não encontrado');
        return [];
      }
      console.log('🔍 Buscando associações para userId:', user.id);
      const response = await api.get(`/teacher-subjects/${user.id}`);
      console.log('📦 Resposta da API teacher-subjects:', response.data);
      console.log('📊 Total de associações recebidas:', (response.data.data || []).length);
      return response.data.data || [];
    },
    enabled: !!user?.id,
  });

  const currentSchedule = schedules.find((s: Schedule) => s.id === selectedSchedule);

  // Carregar lista de horários salvos ao montar o componente
  useEffect(() => {
    loadSavedTimetablesList();
  }, []);

  // Função para carregar lista de horários salvos
  const loadSavedTimetablesList = async () => {
    try {
      const response = await api.get('/generated-timetables');
      console.log('📊 Response completa:', response);
      console.log('📊 Response.data:', response.data);
      const list = response.data.data || response.data || [];
      console.log('📊 Lista de horários salvos:', list);
      console.log('📊 Quantidade:', list.length);
      if (list.length > 0) {
        console.log('📊 Primeiro item COMPLETO:', JSON.stringify(list[0], null, 2));
        console.log('📊 Campos do primeiro item:', Object.keys(list[0]));
        console.log('📊 Title do primeiro:', list[0].title);
      }
      setSavedTimetablesList(list);
    } catch (error: any) {
      console.error('Erro ao carregar lista:', error);
    }
  };

  // Debug logs
  useEffect(() => {
    console.log('📊 Dados carregados:', {
      teachers: teachers.length,
      subjects: subjects.length,
      grades: grades.length,
      classes: classes.length,
      schedules: schedules.length
    });
  }, [teachers, subjects, grades, classes, schedules]);

  // Função para gerar horários para TODAS as turmas SEM CONFLITOS
  const generateTimetable = () => {
    if (!selectedSchedule) {
      toast.error('Selecione um tipo de horário');
      return;
    }

    if (!currentSchedule || !currentSchedule.periods || currentSchedule.periods.length === 0) {
      toast.error('O horário selecionado não possui períodos configurados');
      return;
    }

    if (subjects.length === 0) {
      toast.error('Cadastre disciplinas antes de gerar o horário');
      return;
    }

    if (teachers.length === 0) {
      toast.error('Cadastre professores antes de gerar o horário');
      return;
    }

    if (classes.length === 0) {
      toast.error('Cadastre turmas antes de gerar o horário');
      return;
    }

    setIsGenerating(true);
    setConflicts([]);

    try {
      // Filtrar turmas se necessário
      const classesToGenerate = selectedClassFilter === 'all' 
        ? classes 
        : classes.filter((c: any) => c.id === selectedClassFilter);

      if (classesToGenerate.length === 0) {
        toast.error('Nenhuma turma selecionada para gerar horário');
        setIsGenerating(false);
        return;
      }

      const allTimetables: { [classId: string]: TimetableSlot[] } = {};
      const newConflicts: string[] = [];
      
      // Controle global: [day][period][teacherId] = true (professor ocupado)
      const globalTeacherSchedule: { [day: string]: { [period: number]: Set<string> } } = {};
      
      // Controle de turmas: [classId][day][period] = true (turma ocupada)
      const classSchedule: { [classId: string]: { [day: string]: Set<number> } } = {};
      
      // Inicializar estruturas de controle
      weekDays.forEach(day => {
        globalTeacherSchedule[day] = {};
        currentSchedule.periods.forEach((p: { period: number; startTime: string; endTime: string }) => {
          globalTeacherSchedule[day][p.period] = new Set();
        });
      });
      
      classesToGenerate.forEach((c: any) => {
        classSchedule[c.id] = {};
        weekDays.forEach(day => {
          classSchedule[c.id][day] = new Set();
        });
      });

      const activeTeachers = teachers.filter((teacher: Teacher) => teacher.isActive !== false);

      console.log('🎯 GERAÇÃO DE HORÁRIOS SEM CONFLITOS');
      console.log('📊 Turmas:', classesToGenerate.length);
      console.log('🎯 Filtro:', selectedClassFilter === 'all' ? 'Todas' : 'Turma específica');
      console.log('📚 Disciplinas:', subjects.length);
      console.log('👨‍🏫 Professores ativos:', activeTeachers.length);
      console.log('⏰ Períodos por dia:', currentSchedule.periods.length);
      console.log('📅 Total de slots disponíveis por turma:', weekDays.length * currentSchedule.periods.length);

      if (teacherSubjects.length === 0) {
        toast.error('⚠️ Nenhuma associação professor-disciplina encontrada!\nConfigure em "Lotação de Professores"');
        setIsGenerating(false);
        return;
      }

      // ALGORITMO PRINCIPAL: Processar cada turma
      for (const currentClass of classesToGenerate) {
        console.log(`\n🏫 Processando turma: ${currentClass.grade?.name} ${currentClass.name}`);
        
        const classTimetable: TimetableSlot[] = [];
        const classSubjects = currentClass.subjects || [];
        
        if (classSubjects.length === 0) {
          newConflicts.push(`❌ ${currentClass.grade?.name} ${currentClass.name}: Sem disciplinas associadas`);
          continue;
        }

        // Criar lista de aulas necessárias baseada na carga horária semanal
        const neededLessons: { subjectId: string; count: number }[] = [];
        
        classSubjects.forEach((subject: any) => {
          // Pegar carga horária da associação turma-componente
          const weeklyHours = currentClass.subjectWeeklyHours?.[subject.id] || subject.weeklyHours || 2;
          neededLessons.push({
            subjectId: subject.id,
            count: weeklyHours
          });
          console.log(`  📖 ${subject.name}: ${weeklyHours} aulas/semana`);
        });

        // Total de aulas necessárias para esta turma
        const totalLessonsNeeded = neededLessons.reduce((sum, l) => sum + l.count, 0);
        const totalSlotsAvailable = weekDays.length * currentSchedule.periods.length;
        
        console.log(`  📊 Aulas necessárias: ${totalLessonsNeeded} | Slots disponíveis: ${totalSlotsAvailable}`);
        
        if (totalLessonsNeeded > totalSlotsAvailable) {
          newConflicts.push(`⚠️ ${currentClass.grade?.name} ${currentClass.name}: ${totalLessonsNeeded} aulas necessárias, mas apenas ${totalSlotsAvailable} slots disponíveis`);
        }

        // Criar pool de aulas a serem distribuídas
        const lessonPool: string[] = [];
        neededLessons.forEach(lesson => {
          for (let i = 0; i < lesson.count; i++) {
            lessonPool.push(lesson.subjectId);
          }
        });

        // Embaralhar para distribuição mais uniforme
        for (let i = lessonPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [lessonPool[i], lessonPool[j]] = [lessonPool[j], lessonPool[i]];
        }

        let lessonIndex = 0;

        // Distribuir aulas pelos dias e períodos
        for (const day of weekDays) {
          for (const periodInfo of currentSchedule.periods) {
            // Verificar se ainda há aulas para alocar
            if (lessonIndex >= lessonPool.length) break;

            // Verificar se turma já está ocupada neste horário
            if (classSchedule[currentClass.id][day].has(periodInfo.period)) {
              console.log(`  ⏭️ ${day} ${periodInfo.period}º: Turma já ocupada`);
              continue;
            }

            const subjectId = lessonPool[lessonIndex];
            const subject = classSubjects.find((s: any) => s.id === subjectId);

            if (!subject) {
              console.log(`  ❌ Disciplina ${subjectId} não encontrada`);
              lessonIndex++;
              continue;
            }

            // Buscar professores disponíveis para esta disciplina E TURMA
            const eligibleTeachers = activeTeachers.filter((teacher: Teacher) => {
              const hasAssignment = teacherSubjects.some((ts: TeacherSubject) => {
                const match = ts.teacherId === teacher.id && 
                              ts.subjectId === subjectId &&
                              ts.classId === currentClass.id;
                
                if (ts.teacherId === teacher.id && ts.subjectId === subjectId) {
                  console.log(`    🔍 Prof. ${teacher.name} - Disciplina: ${subject.name} - Turma ts.classId: "${ts.classId}" vs turma atual: "${currentClass.id}" - Match: ${match}`);
                }
                
                return match;
              });
              return hasAssignment;
            });

            console.log(`  📋 Professores elegíveis para ${subject.name} na turma ${currentClass.name}: ${eligibleTeachers.map((t: Teacher) => t.name).join(', ') || 'NENHUM'}`);

            if (eligibleTeachers.length === 0) {
              newConflicts.push(`❌ ${currentClass.grade?.name} ${currentClass.name} - ${day} ${periodInfo.period}º: Sem professor para "${subject.name}"`);
              lessonIndex++;
              continue;
            }

            // Tentar encontrar professor disponível (SEM CONFLITO)
            let selectedTeacher: Teacher | null = null;
            
            for (const candidate of eligibleTeachers) {
              if (!globalTeacherSchedule[day][periodInfo.period].has(candidate.id)) {
                selectedTeacher = candidate;
                break;
              }
            }

            if (!selectedTeacher) {
              // NENHUM professor disponível - PULAR este slot e tentar em outro horário
              console.log(`  ⏭️ ${day} ${periodInfo.period}º: Nenhum professor disponível para ${subject.name}`);
              continue; // NÃO incrementar lessonIndex - tentar alocar em outro horário
            }

            // SUCESSO - Alocar a aula
            classTimetable.push({
              day,
              period: periodInfo.period,
              subjectId: subject.id,
              teacherId: selectedTeacher.id,
              classId: currentClass.id
            });

            // Marcar ocupações
            globalTeacherSchedule[day][periodInfo.period].add(selectedTeacher.id);
            classSchedule[currentClass.id][day].add(periodInfo.period);

            console.log(`  ✅ ${day} ${periodInfo.period}º: ${subject.name} - Prof. ${selectedTeacher.name}`);
            
            lessonIndex++; // Próxima aula
          }
        }

        // Verificar se todas as aulas foram alocadas
        if (lessonIndex < lessonPool.length) {
          const missingCount = lessonPool.length - lessonIndex;
          newConflicts.push(`⚠️ ${currentClass.grade?.name} ${currentClass.name}: ${missingCount} aula(s) não puderam ser alocadas por falta de professores disponíveis`);
        }

        allTimetables[currentClass.id] = classTimetable;
        console.log(`  ✅ Total alocado: ${classTimetable.length}/${lessonPool.length} aulas`);
      }

      setGeneratedTimetables(allTimetables);
      setConflicts(newConflicts);

      if (newConflicts.length === 0) {
        toast.success(`✅ Horários gerados para ${classes.length} turmas sem nenhum conflito!`, { duration: 4000 });
      } else {
        toast(`⚠️ ${newConflicts.length} aviso(s) encontrado(s)`, { icon: '⚠️', duration: 5000 });
      }
      
      console.log('🎉 GERAÇÃO CONCLUÍDA');
      
    } catch (error: any) {
      toast.error('Erro ao gerar horários: ' + error.message);
      console.error('❌ Erro detalhado:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper para obter dados de um slot específico de uma turma
  const getSlotData = (classId: string, day: string, period: number) => {
    const classTimetable = generatedTimetables[classId] || [];
    return classTimetable.find(
      (slot) => slot.day === day && slot.period === period
    );
  };

  // Função para imprimir
  const handlePrint = () => {
    window.print();
  };

  // Função para download em PDF
  const handleDownload = async () => {
    try {
      toast.loading('Gerando PDF...');
      
      // Aguardar um momento para garantir que o toast aparece
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const printContainers = document.querySelectorAll('.print-container');
      if (printContainers.length === 0) {
        toast.dismiss();
        toast.error('Nenhum horário para gerar PDF');
        return;
      }

      // Importar jsPDF dinamicamente
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;

      for (const container of Array.from(printContainers)) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        const canvas = await html2canvas(container as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190; // largura em mm (A4 = 210mm, com margem de 10mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      }

      pdf.save(`horarios-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.dismiss();
      toast.success('PDF gerado com sucesso!');
    } catch (error: any) {
      toast.dismiss();
      toast.error('Erro ao gerar PDF: ' + error.message);
      console.error('Erro ao gerar PDF:', error);
    }
  };

  // Salvar horários no banco de dados
  const handleSave = async () => {
    console.log('💾 Tentando salvar horários...');
    console.log('  - selectedSchedule:', selectedSchedule);
    console.log('  - generatedTimetables:', Object.keys(generatedTimetables).length, 'turmas');
    console.log('  - saveTitle:', saveTitle);

    if (!selectedSchedule || Object.keys(generatedTimetables).length === 0) {
      toast.error('Nenhum horário para salvar');
      console.log('❌ Validação falhou: sem horário ou sem turmas');
      return;
    }

    if (!saveTitle.trim()) {
      toast.error('Digite um título para o horário');
      console.log('❌ Validação falhou: sem título');
      return;
    }

    setIsSaving(true);
    try {
      console.log('📤 Enviando para API...');
      const response = await api.post('/generated-timetables', {
        scheduleId: selectedSchedule,
        timetables: generatedTimetables,
        title: saveTitle.trim()
      });
      
      console.log('✅ Resposta da API:', response.data);
      toast.success('✅ Horários salvos com sucesso!', {
        duration: 4000,
        position: 'top-center',
      });
      setShowSaveDialog(false);
      setSaveTitle('');
      loadSavedTimetablesList();
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      console.error('  - Erro completo:', error.response?.data || error.message);
      toast.error('Erro ao salvar horários: ' + (error.response?.data?.message || error.message), {
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Carregar horários salvos por título
  const handleLoadByTitle = async (title: string) => {
    try {
      console.log('📂 Carregando horário:', title);
      
      // Usar a rota /metadata para buscar rapidamente o scheduleId
      const metadataResponse = await api.get('/generated-timetables/metadata');
      console.log('📋 Metadados recebidos:', metadataResponse.data);
      
      const allTimetables = metadataResponse.data?.data || metadataResponse.data;
      console.log('📋 Total de horários nos metadados:', allTimetables.length);
      
      // Encontrar um horário com este título
      const timetableWithTitle = allTimetables.find((tt: any) => tt.title === title);
      console.log('🔍 Horário encontrado:', timetableWithTitle);
      
      if (!timetableWithTitle) {
        toast.error('Horário não encontrado');
        return;
      }

      const scheduleId = timetableWithTitle.scheduleId;
      console.log('✅ scheduleId encontrado:', scheduleId);
      
      // Definir automaticamente o scheduleId
      setSelectedSchedule(scheduleId);
      console.log('✅ setSelectedSchedule chamado com:', scheduleId);
      
      // Agora buscar os horários completos
      console.log('📥 Buscando horários completos de:', `/generated-timetables/${scheduleId}/by-title/${encodeURIComponent(title)}`);
      const response = await api.get(`/generated-timetables/${scheduleId}/by-title/${encodeURIComponent(title)}`);
      
      console.log('📥 Response status:', response.status);
      console.log('📥 response.data:', response.data);
      
      const loadedTimetables = response.data.data || response.data;
      
      console.log('📦 loadedTimetables recebidos:', loadedTimetables);
      console.log('📦 Número de chaves:', Object.keys(loadedTimetables).length);
      
      if (Object.keys(loadedTimetables).length === 0) {
        toast('Nenhum horário encontrado', { icon: 'ℹ️' });
        return;
      }

      setGeneratedTimetables(loadedTimetables);
      console.log('✅ setGeneratedTimetables chamado com', Object.keys(loadedTimetables).length, 'turmas');
      toast.success('✅ Horários carregados!');
    } catch (error: any) {
      toast.error('Erro ao carregar horários');
      console.error('❌ Erro completo:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
    }
  };

  // Deletar conjunto de horários
  const handleDelete = async (title: string) => {
    if (!confirm(`Deseja realmente excluir "${title}"?`)) {
      return;
    }

    try {
      console.log('🗑️ Excluindo:', title);
      const response = await api.delete(`/generated-timetables/by-title/${encodeURIComponent(title)}`);
      console.log('✅ Resposta:', response.data);
      toast.success(`✅ ${response.data.deletedCount} horário(s) excluído(s)!`);
      loadSavedTimetablesList();
    } catch (error: any) {
      console.error('❌ Erro ao excluir:', error);
      toast.error('Erro ao excluir horários');
    }
  };

  // Carregar horários salvos (mantido para compatibilidade)
  const handleLoad = async () => {
    if (!selectedSchedule) {
      toast.error('Selecione um horário primeiro');
      return;
    }

    try {
      const response = await api.get(`/generated-timetables/${selectedSchedule}`);
      const loadedTimetables = response.data.data || response.data;
      
      if (Object.keys(loadedTimetables).length === 0) {
        toast('Nenhum horário salvo encontrado', { icon: 'ℹ️' });
        return;
      }

      setGeneratedTimetables(loadedTimetables);
      toast.success('✅ Horários carregados com sucesso!');
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast('Nenhum horário salvo para este tipo', { icon: 'ℹ️' });
      } else {
        toast.error('Erro ao carregar horários');
        console.error('Erro ao carregar:', error);
      }
    }
  };

  // Abrir modal de edição
  const openEditModal = (classId: string, day: string, period: number) => {
    const slot = getSlotData(classId, day, period);
    setEditModalData({
      classId,
      day,
      period,
      currentSubjectId: slot?.subjectId || null,
      currentTeacherId: slot?.teacherId || null
    });
    setSelectedSubjectForEdit(slot?.subjectId || '');
    setSelectedTeacherForEdit(slot?.teacherId || '');
  };

  // Função para compartilhar
  const handleShare = () => {
    toast.success('Função de compartilhamento em desenvolvimento');
  };

  // Fechar modal de edição
  const closeEditModal = () => {
    setEditModalData(null);
    setSelectedSubjectForEdit('');
    setSelectedTeacherForEdit('');
  };

  // Aplicar edição da célula
  const applyEdit = () => {
    if (!editModalData) return;

    const { classId, day, period } = editModalData;

    if (!selectedSubjectForEdit || !selectedTeacherForEdit) {
      toast.error('Selecione a disciplina e o professor');
      return;
    }

    setGeneratedTimetables(prev => {
      const newClassTimetable = [...(prev[classId] || [])];
      const existingIndex = newClassTimetable.findIndex(
        slot => slot.day === day && slot.period === period
      );

      if (existingIndex >= 0) {
        newClassTimetable[existingIndex] = {
          ...newClassTimetable[existingIndex],
          subjectId: selectedSubjectForEdit,
          teacherId: selectedTeacherForEdit
        };
      } else {
        newClassTimetable.push({
          classId,
          day,
          period,
          subjectId: selectedSubjectForEdit,
          teacherId: selectedTeacherForEdit
        });
      }

      return {
        ...prev,
        [classId]: newClassTimetable
      };
    });

    closeEditModal();
    toast.success('Horário atualizado!');
  };

  // Remover aula da célula
  const removeSlot = () => {
    if (!editModalData) return;

    const { classId, day, period } = editModalData;

    setGeneratedTimetables(prev => {
      const newClassTimetable = (prev[classId] || []).filter(
        slot => !(slot.day === day && slot.period === period)
      );

      return {
        ...prev,
        [classId]: newClassTimetable
      };
    });

    closeEditModal();
    toast.success('Aula removida!');
  };

  // Função para detectar conflitos de horário
  const detectConflicts = (classId: string, day: string, period: number, slot: TimetableSlot | undefined): boolean => {
    if (!slot) return false;

    // Verificar se o mesmo professor está em outra turma no mesmo horário
    const allSlots = Object.values(generatedTimetables).flat();
    const conflictingSlots = allSlots.filter(
      s => s.day === day && 
           s.period === period && 
           s.teacherId === slot.teacherId && 
           s.classId !== classId
    );

    if (conflictingSlots.length > 0) {
      return true;
    }

    // Verificar se a mesma turma tem duas aulas no mesmo horário (não deveria acontecer)
    const classSlotsAtSameTime = generatedTimetables[classId]?.filter(
      s => s.day === day && s.period === period
    ) || [];

    if (classSlotsAtSameTime.length > 1) {
      return true;
    }

    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl shadow-lg p-8 no-print">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Calendar size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Gerador de Horário de Aulas</h1>
            <p className="text-primary-100 mt-2">
              Crie horários otimizados automaticamente, sem conflitos
            </p>
          </div>
        </div>
      </div>

      {/* Configuração */}
      <div className="card no-print">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="text-primary-600" />
          Configuração do Horário
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Horário *
          </label>
          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="input max-w-md"
            required
          >
            <option value="">Selecione o tipo de horário</option>
            {schedules.length === 0 ? (
              <option disabled>Nenhum horário configurado</option>
            ) : (
              schedules.map((schedule: Schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name} ({schedule.periods?.length || 0} períodos)
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Turmas *
          </label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="input max-w-md"
          >
            <option value="all">✨ Todas as Turmas ({classes.length})</option>
            <optgroup label="Turmas Específicas">
              {classes.map((classItem: any) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.grade?.name || 'Sem série'} - {classItem.name}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="text-sm text-gray-500 mt-2">
            {selectedClassFilter === 'all' 
              ? `ℹ️ Serão gerados horários para todas as ${classes.length} turmas cadastradas`
              : `ℹ️ Será gerado horário apenas para a turma selecionada`
            }
          </p>
        </div>

        {/* Campo de Observações */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="input min-h-[100px] resize-y"
            placeholder="Digite aqui observações importantes para a geração do horário (ex: Professor X não pode dar aula às quartas-feiras, evitar aulas de Educação Física no último período, etc.)..."
            rows={4}
          />
          <p className="text-sm text-gray-500 mt-2">
            💡 Estas observações serão consideradas durante a geração do horário
          </p>
        </div>

        {/* Lista de Horários Salvos */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FolderOpen size={20} className="text-primary-600" />
            Horários Salvos
          </h3>
          {savedTimetablesList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedTimetablesList.map((saved: any, index: number) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{saved.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(saved.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleLoadByTitle(saved.title)}
                      className="flex-1 btn btn-primary text-sm py-1 px-3 flex items-center justify-center gap-1"
                    >
                      <FolderOpen size={16} />
                      Abrir
                    </button>
                    <button
                      onClick={() => handleDelete(saved.title)}
                      className="btn bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 flex items-center justify-center gap-1"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FolderOpen size={48} className="mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Nenhum horário salvo ainda</p>
              <p className="text-xs mt-1">Gere e salve horários para visualizá-los aqui</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={generateTimetable}
            disabled={!selectedSchedule || isGenerating}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating 
              ? 'Gerando...' 
              : selectedClassFilter === 'all'
                ? `Gerar Horários (${classes.length} turmas)`
                : 'Gerar Horário (1 turma)'
            }
          </button>

          <button
            onClick={handleLoad}
            disabled={!selectedSchedule}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={20} />
            Carregar Salvos
          </button>

          {Object.keys(generatedTimetables).length > 0 && (
            <>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setViewMode('spreadsheet')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'spreadsheet'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📊 Planilha
                </button>
                <button
                  onClick={() => setViewMode('day-by-day')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'day-by-day'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📅 Dia a Dia
                </button>
              </div>

              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={isSaving}
                className="btn btn-primary flex items-center gap-2"
              >
                <Download size={20} className={isSaving ? 'animate-pulse' : ''} />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>

              <button onClick={handlePrint} className="btn btn-outline flex items-center gap-2">
                <Printer size={20} />
                Imprimir
              </button>
              <button onClick={handleDownload} className="btn btn-outline flex items-center gap-2">
                <Download size={20} />
                Download PDF
              </button>
              <button onClick={handleShare} className="btn btn-outline flex items-center gap-2">
                <Share2 size={20} />
                Compartilhar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alertas de conflitos */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded no-print">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-red-800">Conflitos Detectados</h3>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {conflicts.map((conflict, index) => (
                  <li key={index}>• {conflict}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {conflicts.length === 0 && Object.keys(generatedTimetables).length > 0 && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded no-print">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <h3 className="font-bold text-green-800">Horário Válido!</h3>
              <p className="text-sm text-green-700">Nenhum conflito detectado</p>
            </div>
          </div>
        </div>
      )}

      {/* Horários de Todas as Turmas */}
      {Object.keys(generatedTimetables).length > 0 && currentSchedule && (
        <>
          {/* Visualização em Planilha */}
          {viewMode === 'spreadsheet' && (
            <div className="space-y-8">
              {classes.map((currentClass: any) => {
                return (
                  <div key={currentClass.id} className="card print-container">
                    <div className="mb-6 print-header border-b-4 border-primary-600 pb-4">
                      <h2 className="text-2xl font-bold text-center text-primary-700">
                        {currentClass.grade?.name || 'Série'} - {currentClass.name}
                      </h2>
                      <p className="text-center text-gray-600">
                        {translateShift(currentClass.shift)} • {currentSchedule.name}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-primary-600 text-white">
                            <th className="border border-gray-300 p-3 text-left font-bold">Horário</th>
                            {weekDays.map((day) => (
                              <th key={day} className="border border-gray-300 p-3 text-center font-bold">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSchedule.periods.map((periodInfo: { period: number; startTime: string; endTime: string }) => (
                            <tr key={periodInfo.period} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-3 bg-gray-100 font-semibold">
                                <div className="text-sm">{periodInfo.period}º Horário</div>
                                <div className="text-xs text-gray-600">
                                  {periodInfo.startTime} - {periodInfo.endTime}
                                </div>
                              </td>
                              {weekDays.map((day) => {
                                const slot = getSlotData(currentClass.id, day, periodInfo.period);
                                const subject = slot ? subjects.find((s: Subject) => s.id === slot.subjectId) : null;
                                const teacher = slot ? teachers.find((t: Teacher) => t.id === slot.teacherId) : null;
                                
                                // Debug: mostrar se não encontrar
                                if (slot && !subject) {
                                  console.log(`⚠️ Disciplina não encontrada: slot.subjectId="${slot.subjectId}" | Disciplinas disponíveis:`, subjects.map(s => s.id));
                                }
                                if (slot && !teacher) {
                                  console.log(`⚠️ Professor não encontrado: slot.teacherId="${slot.teacherId}" | Professores disponíveis:`, teachers.map(t => t.id));
                                }
                                
                                const hasConflict = detectConflicts(currentClass.id, day, periodInfo.period, slot);

                                return (
                                  <td
                                    key={day}
                                    className={`border border-gray-300 p-3 text-center relative group ${hasConflict ? 'ring-4 ring-red-500' : ''}`}
                                    style={{
                                      backgroundColor: hasConflict 
                                        ? '#fee2e2' // bg-red-100
                                        : subject?.color ? `${subject.color}20` : 'white',
                                    }}
                                    title={hasConflict ? '⚠️ CONFLITO DE HORÁRIO DETECTADO!' : ''}
                                  >
                                    {/* Botão de editar (aparece ao passar o mouse) */}
                                    <button
                                      onClick={() => openEditModal(currentClass.id, day, periodInfo.period)}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-lg no-print"
                                      title="Editar"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    
                                    {hasConflict && (
                                      <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-bl">
                                        ⚠️
                                      </div>
                                    )}
                                    {subject && teacher ? (
                                      <div className={hasConflict ? 'relative' : ''}>
                                        <div className={`font-semibold text-sm ${hasConflict ? 'text-red-900' : 'text-gray-900'}`}>
                                          {subject.name}
                                        </div>
                                        <div className={`text-xs mt-1 ${hasConflict ? 'text-red-700 font-bold' : 'text-gray-600'}`}>
                                          {teacher.name}
                                        </div>
                                        {hasConflict && (
                                          <div className="text-xs font-bold text-red-600 mt-1">
                                            ⚠️ CONFLITO
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visualização Dia a Dia */}
          {viewMode === 'day-by-day' && (
        <div className="space-y-8">
          {classes.map((currentClass: any) => (
            <div key={currentClass.id} className="card print-container">
              <div className="mb-6 print-header border-b-4 border-primary-600 pb-4">
                <h2 className="text-2xl font-bold text-center text-primary-700">
                  {currentClass.grade?.name || 'Série'} - {currentClass.name}
                </h2>
                <p className="text-center text-gray-600">
                  {translateShift(currentClass.shift)} • {currentSchedule.name}
                </p>
              </div>

              <div className="space-y-6">
                {weekDays.map((day) => (
                  <div key={day} className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-primary-600 text-white p-3 font-bold text-center text-lg">
                      {day}
                    </div>
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border-b border-gray-300 p-3 text-left w-32">Horário</th>
                          <th className="border-b border-gray-300 p-3 text-left">Disciplina</th>
                          <th className="border-b border-gray-300 p-3 text-left">Professor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSchedule.periods.map((periodInfo: { period: number; startTime: string; endTime: string }) => {
                          const slot = getSlotData(currentClass.id, day, periodInfo.period);
                          const subject = slot ? subjects.find((s: Subject) => s.id === slot.subjectId) : null;
                          const teacher = slot ? teachers.find((t: Teacher) => t.id === slot.teacherId) : null;
                          const hasConflict = detectConflicts(currentClass.id, day, periodInfo.period, slot);

                          return (
                            <tr 
                              key={periodInfo.period} 
                              className={`hover:bg-gray-50 ${hasConflict ? 'bg-red-50 ring-2 ring-red-500' : ''}`}
                              title={hasConflict ? '⚠️ CONFLITO DE HORÁRIO DETECTADO!' : ''}
                            >
                              <td className="border-b border-gray-200 p-3 bg-gray-50">
                                <div className="text-sm font-bold">{periodInfo.period}º</div>
                                <div className="text-xs text-gray-600">
                                  {periodInfo.startTime} - {periodInfo.endTime}
                                </div>
                              </td>
                              <td 
                                className={`border-b border-gray-200 p-3 ${hasConflict ? 'ring-2 ring-red-500' : ''}`}
                                style={{
                                  backgroundColor: hasConflict 
                                    ? '#fee2e2' 
                                    : subject?.color ? `${subject.color}20` : 'white',
                                }}
                              >
                                <div className={`font-semibold ${hasConflict ? 'text-red-900' : 'text-gray-900'}`}>
                                  {subject?.name || '-'}
                                  {hasConflict && (
                                    <span className="ml-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                      ⚠️ CONFLITO
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={`border-b border-gray-200 p-3 ${hasConflict ? 'text-red-700 font-bold' : ''}`}>
                                <div className="text-sm">
                                  {teacher?.name || '-'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* Instruções */}
      {Object.keys(generatedTimetables).length === 0 && (
        <div className="card bg-blue-50 border-l-4 border-blue-500 no-print">
          <h3 className="font-bold text-blue-900 mb-3">Como usar:</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Selecione a <strong>Turma</strong> para a qual deseja gerar o horário</li>
            <li>2. Escolha o <strong>Tipo de Horário</strong> (Parcial, Integral, etc.)</li>
            <li>3. Clique em <strong>Gerar Horário</strong></li>
            <li>4. O sistema criará automaticamente um horário otimizado</li>
            <li>5. Use os botões de <strong>Imprimir</strong>, <strong>Download</strong> ou <strong>Compartilhar</strong></li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="text-xs text-blue-900">
              💡 <strong>Dica:</strong> O sistema evita automaticamente conflitos de horários e considera as observações cadastradas de cada professor.
            </p>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {Object.keys(generatedTimetables).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="text-3xl font-bold">{subjects.length}</div>
            <div className="text-sm opacity-90">Componentes</div>
          </div>
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="text-3xl font-bold">{teachers.length}</div>
            <div className="text-sm opacity-90">Professores</div>
          </div>
          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="text-3xl font-bold">
              {Object.values(generatedTimetables).reduce((total, timetable) => total + timetable.length, 0)}
            </div>
            <div className="text-sm opacity-90">Aulas Agendadas</div>
          </div>
          <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="text-3xl font-bold">{conflicts.length}</div>
            <div className="text-sm opacity-90">Conflitos</div>
          </div>
        </div>
      )}

      {/* Diálogo de Salvar */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Salvar Horários</h3>
            <p className="text-sm text-gray-600 mb-4">
              Digite um título para identificar este conjunto de horários:
            </p>
            <input
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              placeholder="Ex: Horário 2025 - 1º Semestre"
              className="input w-full mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveTitle('');
                }}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !saveTitle.trim()}
                className="btn btn-primary"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Célula */}
      {editModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Editar Horário</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Turma:</strong> {classes.find((c: any) => c.id === editModalData.classId)?.name}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Horário:</strong> {editModalData.day} - {editModalData.period}º período
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplina *
                </label>
                <select
                  value={selectedSubjectForEdit}
                  onChange={(e) => setSelectedSubjectForEdit(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Selecione a disciplina</option>
                  {subjects
                    .filter((s: Subject) => s.isActive !== false)
                    .map((subject: Subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professor *
                </label>
                <select
                  value={selectedTeacherForEdit}
                  onChange={(e) => setSelectedTeacherForEdit(e.target.value)}
                  className="input w-full"
                  disabled={!selectedSubjectForEdit}
                >
                  <option value="">Selecione o professor</option>
                  {teachers
                    .filter((t: Teacher) => {
                      if (!selectedSubjectForEdit) return false;
                      // Filtrar professores que podem lecionar a disciplina selecionada
                      const canTeach = teacherSubjects.some(
                        (ts: TeacherSubject) => 
                          ts.teacherId === t.id && ts.subjectId === selectedSubjectForEdit
                      );
                      return canTeach && t.isActive !== false;
                    })
                    .map((teacher: Teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                </select>
                {selectedSubjectForEdit && teachers.filter((t: Teacher) => {
                  const canTeach = teacherSubjects.some(
                    (ts: TeacherSubject) => 
                      ts.teacherId === t.id && ts.subjectId === selectedSubjectForEdit
                  );
                  return canTeach && t.isActive !== false;
                }).length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Nenhum professor habilitado para esta disciplina
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {editModalData.currentSubjectId && (
                <button
                  onClick={removeSlot}
                  className="btn btn-outline text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Remover
                </button>
              )}
              <div className="flex-1"></div>
              <button
                onClick={closeEditModal}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={applyEdit}
                disabled={!selectedSubjectForEdit || !selectedTeacherForEdit}
                className="btn btn-primary"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
