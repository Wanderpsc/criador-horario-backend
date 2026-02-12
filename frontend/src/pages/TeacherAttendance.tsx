import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Clock, 
  User, 
  TrendingUp, 
  FileText, 
  Printer,
  Download,
  BarChart3,
  AlertCircle,
  Eraser,
  BookOpen,
  GraduationCap,
  Minimize2,
  Maximize2,
  ChevronUp,
  ChevronDown,
  DollarSign
} from 'lucide-react';

interface ClassAttendance {
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  grade: string;
  status: 'present' | 'absent' | 'pending';
  markedAt?: Date;
}

interface AttendanceRecord {
  _id?: string;
  teacherId: string;
  teacherName: string;
  date: string;
  dayOfWeek: string;
  classes: ClassAttendance[];
  totalScheduledClasses: number;
  totalPresentClasses: number;
  totalAbsentClasses: number;
  totalPendingClasses: number;
  attendanceRate: number;
}

interface AttendanceReport {
  teacherId: string;
  teacherName: string;
  totalScheduledClasses: number;
  totalPresentClasses: number;
  totalAbsentClasses: number;
  attendanceRate: number;
  workload: number;
}

interface SubjectDeficit {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  grade: string;
  teacherId: string;
  teacherName: string;
  scheduledClasses: number;
  givenClasses: number;
  deficit: number; // aulas que faltaram
  dates: string[]; // datas das faltas
}

interface TeacherSubjectWorkload {
  teacherId: string;
  teacherName: string;
  subjects: {
    subjectId: string;
    subjectName: string;
    classId?: string;
    className?: string;
    weeklyHours: number;
    // Cálculos de carga horária
    annualHours: number; // weeklyHours × 40 semanas
    monthlyHours: number; // annualHours ÷ 12 meses
    dailyHours: number; // weeklyHours ÷ dias letivos da semana
  }[];
  totalWeeklyHours: number;
  totalAnnualHours: number;
  totalMonthlyHours: number;
}

interface WorkloadDeficitReport {
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classId?: string;
  className?: string;
  // Cargas horárias teóricas (da lotação)
  expectedWeeklyHours: number;
  expectedMonthlyHours: number;
  expectedAnnualHours: number;
  // Aulas previstas (do horário × dias letivos)
  expectedClasses: number;
  expectedHours: number;
  // Aulas dadas (baseado na frequência)
  givenClasses: number;
  givenHours: number;
  // Déficit ou saldo de aulas
  deficitClasses: number; // negativo = saldo, positivo = déficit
  deficit: number; // em horas
  deficitPercentage: number;
  status: 'ok' | 'warning' | 'critical'; // ok: <5%, warning: 5-10%, critical: >10%
}

export default function TeacherAttendance() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('auto');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    generalReport: true,
    subjectReport: true,
    teacherCards: false
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTeacherForPayment, setSelectedTeacherForPayment] = useState<AttendanceRecord | null>(null);
  const [selectedClassForPayment, setSelectedClassForPayment] = useState<ClassAttendance | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);
  const [paymentReceiptData, setPaymentReceiptData] = useState<any>(null);

  // Calcular datas automáticas baseado no tipo de relatório
  const getDateRangeForReportType = () => {
    const date = new Date(selectedDate + 'T12:00:00');
    
    switch (reportType) {
      case 'daily':
        return { start: selectedDate, end: selectedDate };
      
      case 'weekly': {
        // Início da semana (domingo)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        // Fim da semana (sábado)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        };
      }
      
      case 'monthly': {
        // Primeiro dia do mês
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        // Último dia do mês
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        };
      }
      
      case 'yearly': {
        // Primeiro dia do ano
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        // Último dia do ano
        const endOfYear = new Date(date.getFullYear(), 11, 31);
        return {
          start: startOfYear.toISOString().split('T')[0],
          end: endOfYear.toISOString().split('T')[0]
        };
      }
      
      default:
        return { start: selectedDate, end: selectedDate };
    }
  };

  const dateRange = useMemo(() => {
    const result = getDateRangeForReportType();
    console.log('🔄 DateRange recalculado:', { reportType, selectedDate, result });
    return result;
  }, [reportType, selectedDate]);

  // Forçar refetch quando reportType ou selectedDate mudarem
  useEffect(() => {
    console.log('🔥 Invalidando queries por mudança de período');
    queryClient.invalidateQueries({ queryKey: ['general-report'] });
    queryClient.invalidateQueries({ queryKey: ['subject-report'] });
  }, [reportType, selectedDate, queryClient]);

  // Buscar horários disponíveis
  const { data: timetablesData } = useQuery({
    queryKey: ['generated-timetables'],
    queryFn: async () => {
      const response = await api.get('/generated-timetables');
      return response.data || [];
    }
  });

  const availableTimetables = Array.isArray(timetablesData) ? timetablesData : [];

  // Buscar calendário escolar para pegar dias letivos
  const { data: calendarData } = useQuery({
    queryKey: ['school-calendar'],
    queryFn: async () => {
      try {
        const response = await api.get('/calendar-events');
        return response.data || [];
      } catch (error) {
        console.error('Erro ao buscar calendário:', error);
        return [];
      }
    }
  });

  // Buscar horário completo do timetable selecionado
  const { data: selectedTimetableData } = useQuery({
    queryKey: ['selected-timetable-detail', selectedTimetableId],
    queryFn: async () => {
      if (!selectedTimetableId || selectedTimetableId === 'auto') {
        // Buscar o horário padrão/mais recente
        const timetables = availableTimetables;
        if (timetables.length > 0) {
          const defaultTimetable = timetables.find((t: any) => t.isDefault) || timetables[0];
          const response = await api.get(`/generated-timetables/${defaultTimetable.id}`);
          return response.data;
        }
        return null;
      }
      const response = await api.get(`/generated-timetables/${selectedTimetableId}`);
      return response.data;
    },
    enabled: !!availableTimetables && availableTimetables.length > 0
  });

  // Buscar dados da escola para impressão
  const { data: schoolData } = useQuery({
    queryKey: ['school-info'],
    queryFn: async () => {
      try {
        const response = await api.get('/school');
        return response.data;
      } catch (error) {
        console.error('Erro ao buscar dados da escola:', error);
        return { name: 'Escola', logo: '' };
      }
    }
  });

  // Buscar aulas agendadas para o dia
  const { data: scheduledData, isLoading: loadingScheduled, error: scheduledError } = useQuery({
    queryKey: ['scheduled-classes', selectedDate, selectedTimetableId],
    queryFn: async () => {
      try {
        const params = selectedTimetableId !== 'auto' ? `?scheduleId=${selectedTimetableId}` : '';
        const response = await api.get(`/teacher-attendance/scheduled-classes/${selectedDate}${params}`);
        console.log('👨‍🏫 BACKEND RETORNOU:', response.data.teachers?.length || 0, 'professores para', selectedDate);
        console.log('📋 Detalhes:', response.data);
        return response.data;
      } catch (error) {
        console.error('Erro ao buscar aulas agendadas:', error);
        return { teachers: [], dayOfWeek: '', date: selectedDate };
      }
    },
    enabled: !!selectedDate
  });

  // Buscar registros de frequência já salvos
  const { data: attendanceRecords, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-records', selectedDate, startDate, endDate, reportType],
    queryFn: async () => {
      const params: any = {};
      if (reportType === 'daily') {
        params.date = selectedDate;
      } else {
        params.startDate = startDate || selectedDate;
        params.endDate = endDate || selectedDate;
      }
      const response = await api.get('/teacher-attendance', { params });
      return response.data;
    },
    enabled: !!selectedDate
  });

  const teachers: any[] = scheduledData?.teachers || [];

  // Buscar relatórios com cálculo correto de aulas previstas
  const { data: generalReportData } = useQuery({
    queryKey: ['general-report', dateRange.start, dateRange.end, reportType, selectedDate],
    queryFn: async () => {
      const params: any = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      console.log('📊 Buscando relatório geral:', params);
      const response = await api.get('/teacher-attendance/statistics', { params });
      return response.data || [];
    },
    enabled: !!selectedDate,
    staleTime: 0,
    gcTime: 0
  });

  // Buscar relatório de déficit por disciplina com cálculo correto
  const { data: subjectReportData } = useQuery({
    queryKey: ['subject-report', dateRange.start, dateRange.end, reportType, selectedDate],
    queryFn: async () => {
      const params: any = { 
        bySubject: 'true',
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      console.log('📊 Buscando relatório por disciplina:', params);
      const response = await api.get('/teacher-attendance/statistics', { params });
      return response.data || [];
    },
    enabled: !!selectedDate,
    staleTime: 0,
    gcTime: 0
  });

  // Buscar lotação de professores (teacher-subjects) para exibir cargas horárias
  const { data: teacherWorkloadData } = useQuery({
    queryKey: ['teacher-workload', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) {
          console.log('⚠️ userId não disponível para buscar lotações');
          return [];
        }
        
        // Buscar todas as lotações de professores
        const response = await api.get(`/teacher-subjects/${user.id}`);
        const associations = response.data.data || [];
        
        // Buscar professores e disciplinas para pegar os nomes
        const teachersRes = await api.get(`/teachers/user/${user.id}`);
        const subjectsRes = await api.get(`/subjects/user/${user.id}`);
        const classesRes = await api.get('/classes');
        
        const teachers = teachersRes.data.data || [];
        const subjects = subjectsRes.data.data || [];
        const classes = classesRes.data.data || [];
        
        // Agrupar por professor
        const teacherMap = new Map<string, TeacherSubjectWorkload>();
        
        associations.forEach((assoc: any) => {
          const teacher = teachers.find((t: any) => t.id === assoc.teacherId || t._id === assoc.teacherId);
          const subject = subjects.find((s: any) => s.id === assoc.subjectId || s._id === assoc.subjectId);
          const classItem = classes.find((c: any) => c.id === assoc.classId || c._id === assoc.classId);
          
          if (!teacher || !subject) return;
          
          const teacherId = teacher.id || teacher._id;
          const teacherName = teacher.name;
          
          if (!teacherMap.has(teacherId)) {
            teacherMap.set(teacherId, {
              teacherId,
              teacherName,
              subjects: [],
              totalWeeklyHours: 0,
              totalAnnualHours: 0,
              totalMonthlyHours: 0
            });
          }
          
          const workload = teacherMap.get(teacherId)!;
          
          // Pegar carga horária: primeiro tenta do assoc, depois do subject, senão usa 0
          const weeklyHours = assoc.weeklyHours || subject.weeklyHours || 0;
          
          // Cálculos de carga horária
          const annualHours = weeklyHours * 40; // 40 semanas letivas no ano
          const monthlyHours = annualHours / 12; // Distribuir em 12 meses
          const dailyHours = weeklyHours / 5; // Assumindo 5 dias letivos por semana
          
          workload.subjects.push({
            subjectId: subject.id || subject._id,
            subjectName: subject.name,
            classId: classItem ? (classItem.id || classItem._id) : undefined,
            className: classItem ? classItem.name : undefined,
            weeklyHours,
            annualHours,
            monthlyHours,
            dailyHours
          });
          
          workload.totalWeeklyHours += weeklyHours;
          workload.totalAnnualHours += annualHours;
          workload.totalMonthlyHours += monthlyHours;
        });
        
        // Converter para array e ordenar por nome do professor
        return Array.from(teacherMap.values()).sort((a, b) => 
          a.teacherName.localeCompare(b.teacherName)
        );
      } catch (error) {
        console.error('Erro ao buscar cargas horárias:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 0, // Sempre buscar dados frescos
    gcTime: 0 // Não manter cache
  });

  const teacherWorkload: TeacherSubjectWorkload[] = teacherWorkloadData || [];

  // Calcular dias letivos no período selecionado
  const workingDaysInPeriod = useMemo(() => {
    if (!calendarData || calendarData.length === 0) {
      // Se não tiver calendário, usar estimativa padrão
      if (reportType === 'daily') return 1;
      if (reportType === 'weekly') return 5;
      if (reportType === 'monthly') return 20; // ~4 semanas * 5 dias
      if (reportType === 'yearly') return 200; // 40 semanas * 5 dias
      return 1;
    }

    const start = new Date(dateRange.start + 'T00:00:00');
    const end = new Date(dateRange.end + 'T23:59:59');
    
    // Filtrar eventos de feriado e recesso no período
    const holidays = calendarData.filter((event: any) => 
      (event.type === 'holiday' || event.type === 'break') &&
      new Date(event.date) >= start &&
      new Date(event.date) <= end
    );

    // Contar dias úteis (seg-sex, excluindo feriados)
    let workingDays = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou Sábado
      const dateStr = currentDate.toISOString().split('T')[0];
      const isHoliday = holidays.some((h: any) => h.date.split('T')[0] === dateStr);
      
      if (!isWeekend && !isHoliday) {
        workingDays++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  }, [calendarData, dateRange, reportType]);

  // Calcular aulas previstas baseado no horário selecionado
  const scheduledClassesPerWeek = useMemo(() => {
    if (!selectedTimetableData || !selectedTimetableData.schedule) {
      return new Map<string, number>(); // Map de "teacherId-subjectId-classId" -> quantidade de aulas por semana
    }

    const classCountMap = new Map<string, number>();
    
    // Iterar sobre todos os dias da semana no horário
    Object.keys(selectedTimetableData.schedule).forEach(day => {
      const daySchedule = selectedTimetableData.schedule[day];
      
      // Iterar sobre todas as turmas
      Object.keys(daySchedule).forEach(classId => {
        const classSchedule = daySchedule[classId];
        
        // Iterar sobre todos os períodos
        classSchedule.forEach((period: any) => {
          if (period && period.teacherId && period.subjectId) {
            const key = `${period.teacherId}-${period.subjectId}-${classId}`;
            classCountMap.set(key, (classCountMap.get(key) || 0) + 1);
          }
        });
      });
    });
    
    return classCountMap;
  }, [selectedTimetableData]);

  // Calcular relatório de déficit/saldo baseado na frequência
  const workloadDeficitReport = useMemo(() => {
    if (!teacherWorkload || teacherWorkload.length === 0) {
      return [];
    }

    const report: WorkloadDeficitReport[] = [];

    teacherWorkload.forEach(teacher => {
      teacher.subjects.forEach(subject => {
        // Chave para buscar aulas previstas no horário
        const scheduleKey = `${teacher.teacherId}-${subject.subjectId}-${subject.classId || ''}`;
        const classesPerWeek = scheduledClassesPerWeek.get(scheduleKey) || 0;
        
        // Calcular aulas previstas baseado no horário e dias letivos
        let expectedClasses = 0;
        if (reportType === 'daily') {
          // Aulas previstas no dia (média)
          expectedClasses = classesPerWeek / 5;
        } else if (reportType === 'weekly') {
          // Aulas previstas na semana (do horário)
          expectedClasses = classesPerWeek;
        } else if (reportType === 'monthly') {
          // Aulas previstas no mês (semanas * aulas/semana)  
          const weeksInPeriod = workingDaysInPeriod / 5;
          expectedClasses = classesPerWeek * weeksInPeriod;
        } else if (reportType === 'yearly') {
          // Aulas previstas no ano (40 semanas * aulas/semana)
          const weeksInPeriod = workingDaysInPeriod / 5;
          expectedClasses = classesPerWeek * weeksInPeriod;
        }

        // Buscar frequência do professor para esta disciplina no período
        let givenClasses = 0;
        if (attendanceRecords) {
          const teacherRecords = attendanceRecords.filter(
            (record: AttendanceRecord) => record.teacherId === teacher.teacherId
          );

          // Contar aulas dadas desta disciplina específica
          teacherRecords.forEach((record: AttendanceRecord) => {
            const subjectClasses = record.classes?.filter(
              (cls: ClassAttendance) => 
                cls.subjectId === subject.subjectId &&
                (subject.classId ? cls.classId === subject.classId : true) &&
                cls.status === 'present'
            ) || [];
            givenClasses += subjectClasses.length;
          });
        }

        // Calcular horas (assumindo 1 aula = 50 minutos = 0.83 horas)
        const expectedHours = expectedClasses * 0.83;
        const givenHours = givenClasses * 0.83;

        // Calcular déficit/saldo (positivo = falta dar aulas, negativo = deu aulas a mais)
        const deficitClasses = expectedClasses - givenClasses;
        const deficit = expectedHours - givenHours;
        const deficitPercentage = expectedClasses > 0 ? (deficitClasses / expectedClasses) * 100 : 0;

        let status: 'ok' | 'warning' | 'critical' = 'ok';
        if (Math.abs(deficitPercentage) > 10) {
          status = 'critical';
        } else if (Math.abs(deficitPercentage) > 5) {
          status = 'warning';
        }

        report.push({
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          classId: subject.classId,
          className: subject.className,
          expectedWeeklyHours: subject.weeklyHours,
          expectedMonthlyHours: subject.monthlyHours,
          expectedAnnualHours: subject.annualHours,
          expectedClasses,
          expectedHours,
          givenClasses,
          givenHours,
          deficitClasses,
          deficit,
          deficitPercentage,
          status
        });
      });
    });

    // Ordenar por déficit crítico primeiro
    return report.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (a.status !== 'critical' && b.status === 'critical') return 1;
      if (a.status === 'warning' && b.status === 'ok') return -1;
      if (a.status === 'ok' && b.status === 'warning') return 1;
      return Math.abs(b.deficitClasses) - Math.abs(a.deficitClasses);
    });
  }, [teacherWorkload, scheduledClassesPerWeek, attendanceRecords, reportType, workingDaysInPeriod]);

  // Mesclar dados agendados com registros salvos
  const getMergedTeacherData = () => {
    if (!teachers || teachers.length === 0) return [];

    return teachers.map(teacher => {
      // Buscar registro salvo
      const savedRecord = attendanceRecords?.find(
        (r: AttendanceRecord) => r.teacherId === teacher.teacherId && r.date === selectedDate
      );

      if (savedRecord) {
        // Usar dados salvos
        return savedRecord;
      }

      // Usar dados agendados com status pending
      return {
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName,
        date: selectedDate,
        dayOfWeek: scheduledData?.dayOfWeek || '',
        classes: teacher.classes || [],
        totalScheduledClasses: teacher.classes?.length || 0,
        totalPresentClasses: 0,
        totalAbsentClasses: 0,
        totalPendingClasses: teacher.classes?.length || 0,
        attendanceRate: 0
      };
    });
  };

  const mergedData = getMergedTeacherData();

  // Expandir/Recolher todos os professores
  const toggleAllTeachers = () => {
    if (expandedTeachers.size === mergedData.length) {
      // Se todos estão expandidos, recolher todos
      setExpandedTeachers(new Set());
    } else {
      // Expandir todos
      const allIds = mergedData.map(t => t.teacherId);
      setExpandedTeachers(new Set(allIds));
    }
  };

  // Alternar expansão do professor
  const toggleTeacherExpansion = (teacherId: string) => {
    setExpandedTeachers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
      }
      return newSet;
    });
  };

  // Marcar status de uma aula
  const handleClassStatusChange = async (
    teacherId: string,
    period: number,
    status: 'present' | 'absent'
  ) => {
    try {
      const payload = {
        teacherId,
        date: selectedDate,
        period,
        status,
        scheduleId: scheduledData?.scheduleId // ✅ Adicionar scheduleId específico
      };
      
      console.log('📤 [handleClassStatusChange] Enviando:', payload);
      
      const response = await api.put('/teacher-attendance/class-status', payload);
      
      console.log('✅ [handleClassStatusChange] Resposta:', response.data);

      toast.success(`✅ Aula marcada como ${status === 'present' ? 'presente' : 'ausente'}`);
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      refetchAttendance();
    } catch (error: any) {
      console.error('❌ [handleClassStatusChange] Erro completo:', error);
      console.error('❌ [handleClassStatusChange] Resposta do erro:', error.response?.data);
      console.error('❌ [handleClassStatusChange] Status:', error.response?.status);
      
      // Mostrar detalhes completos do erro
      const errorData = error.response?.data;
      let errorMessage = 'Erro ao atualizar status da aula';
      
      if (errorData) {
        if (errorData.details) {
          console.error('📋 [handleClassStatusChange] Detalhes técnicos:', errorData.details);
          errorMessage = errorData.message || errorMessage;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  // Marcar todas as aulas do professor
  const handleMarkAllClasses = async (
    teacher: AttendanceRecord,
    status: 'present' | 'absent'
  ) => {
    try {
      const updatedClasses = teacher.classes.map(cls => ({
        ...cls,
        status,
        markedAt: new Date()
      }));

      await api.post('/teacher-attendance/daily-record', {
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName,
        date: selectedDate,
        dayOfWeek: scheduledData?.dayOfWeek || new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }),
        classes: updatedClasses
      });

      toast.success(`✅ Todas as aulas de ${teacher.teacherName} marcadas como ${status === 'present' ? 'presente' : 'ausente'}`);
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      refetchAttendance();
    } catch (error: any) {
      console.error('Erro ao marcar todas as aulas:', error);
      toast.error('Erro ao marcar aulas');
    }
  };

  // Limpar registro do professor
  const handleClearTeacherAttendance = async (teacherId: string) => {
    try {
      await api.delete(`/teacher-attendance/teacher/${teacherId}/date/${selectedDate}`);
      
      toast.success('🗑️ Registro de frequência removido');
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      refetchAttendance();
    } catch (error: any) {
      console.error('Erro ao limpar frequência:', error);
      toast.error('Erro ao limpar registro');
    }
  };

  // Abrir modal de pagamento para aula individual
  const handleOpenPaymentModalForClass = (teacher: AttendanceRecord, classData: ClassAttendance) => {
    setSelectedTeacherForPayment(teacher);
    setSelectedClassForPayment(classData);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceDate(selectedDate);
    setShowPaymentModal(true);
  };

  // Fechar modal de pagamento
  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedTeacherForPayment(null);
    setSelectedClassForPayment(null);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceDate(selectedDate);
  };

  // Processar pagamento de aula individual
  const handleProcessPayment = async () => {
    if (!selectedTeacherForPayment || !selectedClassForPayment) return;

    try {
      const response = await api.post('/teacher-attendance/payment-class', {
        teacherId: selectedTeacherForPayment.teacherId,
        teacherName: selectedTeacherForPayment.teacherName,
        paymentDate,
        referenceDate,
        period: selectedClassForPayment.period,
        classData: selectedClassForPayment
      });

      // Preparar dados do recibo
      setPaymentReceiptData({
        paymentDate,
        teacherName: selectedTeacherForPayment.teacherName,
        classData: selectedClassForPayment,
        receiptNumber: response.data.payment?._id || Date.now().toString(),
        generatedAt: new Date().toLocaleString('pt-BR')
      });

      toast.success(`💰 Pagamento registrado para ${selectedClassForPayment.subjectName}`);
      handleClosePaymentModal();
      setShowPaymentReceipt(true);
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      refetchAttendance();
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      toast.error(error.response?.data?.message || 'Erro ao processar pagamento');
    }
  };

  // Imprimir recibo de pagamento
  const handlePrintPaymentReceipt = () => {
    window.print();
  };

  // Gerar relatório por professor - AGORA USA DADOS DO BACKEND COM CÁLCULO CORRETO
  const generateReport = (): AttendanceReport[] => {
    // Usar dados do backend que já vêm com aulas previstas calculadas corretamente
    if (generalReportData && Array.isArray(generalReportData) && generalReportData.length > 0) {
      return generalReportData;
    }
    
    // Fallback: gerar localmente se não houver dados do backend
    if (!attendanceRecords || attendanceRecords.length === 0) return [];

    const reportMap: { [key: string]: AttendanceReport } = {};

    attendanceRecords.forEach((record: AttendanceRecord) => {
      if (!reportMap[record.teacherId]) {
        reportMap[record.teacherId] = {
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          totalScheduledClasses: 0,
          totalPresentClasses: 0,
          totalAbsentClasses: 0,
          attendanceRate: 0,
          workload: 0
        };
      }

      reportMap[record.teacherId].totalScheduledClasses += Number(record.totalScheduledClasses) || 0;
      reportMap[record.teacherId].totalPresentClasses += Number(record.totalPresentClasses) || 0;
      reportMap[record.teacherId].totalAbsentClasses += Number(record.totalAbsentClasses) || 0;
    });

    // Calcular métricas com validação
    Object.values(reportMap).forEach(report => {
      // Garantir que os valores são números válidos
      report.totalScheduledClasses = Number(report.totalScheduledClasses) || 0;
      report.totalPresentClasses = Number(report.totalPresentClasses) || 0;
      report.totalAbsentClasses = Number(report.totalAbsentClasses) || 0;
      
      if (report.totalScheduledClasses > 0) {
        report.attendanceRate = (report.totalPresentClasses / report.totalScheduledClasses) * 100;
        report.workload = report.totalPresentClasses * 0.833; // 50min por aula
      } else {
        report.attendanceRate = 0;
        report.workload = 0;
      }
    });

    return Object.values(reportMap);
  };

  // Gerar relatório de déficit por disciplina/turma - AGORA USA DADOS DO BACKEND
  const generateSubjectDeficitReport = (): SubjectDeficit[] => {
    // Usar dados do backend que já vêm com aulas previstas calculadas corretamente
    if (subjectReportData && Array.isArray(subjectReportData) && subjectReportData.length > 0) {
      return subjectReportData.map((item: any) => ({
        ...item,
        absentClasses: item.absentClasses || 0,
        dates: item.dates || []
      })).sort((a: SubjectDeficit, b: SubjectDeficit) => b.deficit - a.deficit);
    }
    
    // Fallback: gerar localmente se não houver dados do backend
    if (!attendanceRecords || attendanceRecords.length === 0) return [];

    const deficitMap: { [key: string]: SubjectDeficit } = {};

    attendanceRecords.forEach((record: AttendanceRecord) => {
      if (!record.classes || record.classes.length === 0) return;

      record.classes.forEach((cls) => {
        // Chave única: disciplina + turma
        const key = `${cls.subjectId}_${cls.classId}`;

        if (!deficitMap[key]) {
          deficitMap[key] = {
            subjectId: cls.subjectId,
            subjectName: cls.subjectName,
            classId: cls.classId,
            className: cls.className,
            grade: cls.grade,
            teacherId: record.teacherId,
            teacherName: record.teacherName,
            scheduledClasses: 0,
            givenClasses: 0,
            deficit: 0,
            dates: []
          };
        }

        // Contar aulas agendadas e dadas
        deficitMap[key].scheduledClasses += 1;
        
        if (cls.status === 'present') {
          deficitMap[key].givenClasses += 1;
        } else if (cls.status === 'absent') {
          // Adicionar data da falta (sem duplicatas)
          if (!deficitMap[key].dates.includes(record.date)) {
            deficitMap[key].dates.push(record.date);
          }
        }
      });
    });

    // Calcular déficit/saldo
    Object.values(deficitMap).forEach(item => {
      item.deficit = item.scheduledClasses - item.givenClasses;
    });

    // Ordenar por déficit (maior primeiro)
    return Object.values(deficitMap).sort((a, b) => b.deficit - a.deficit);
  };

  const report = generateReport();
  const subjectDeficitReport = generateSubjectDeficitReport();

  // Abrir modal de seleção de impressão
  const handleOpenPrintModal = () => {
    setShowPrintModal(true);
  };

  // Confirmar e imprimir
  const handleConfirmPrint = () => {
    setShowPrintModal(false);
    // Aguardar modal fechar antes de imprimir
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    if (report.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Professor', 'Aulas Previstas', 'Aulas Dadas', 'Faltas', 'Taxa de Presença (%)', 'Carga Horária (h)'];
    const rows = report.map(r => [
      r.teacherName,
      r.totalScheduledClasses,
      r.totalPresentClasses,
      r.totalAbsentClasses,
      r.attendanceRate.toFixed(1),
      r.workload.toFixed(1)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `frequencia_professores_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso!');
  };

  // Loading state
  if (loadingScheduled) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (scheduledError && (!scheduledData || !scheduledData.teachers)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Erro ao carregar aulas</h2>
          <p className="text-red-700 mb-4">
            Não foi possível carregar as aulas agendadas. Verifique se existem horários cadastrados no sistema.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estilos CSS para Impressão */}
      <style>{`
        @media print {
          body { 
            font-family: Arial, sans-serif; 
            font-size: 11pt;
            color: #000;
          }
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          
          /* Ocultar seções não selecionadas */
          ${!printOptions.generalReport ? '.print-general-report { display: none !important; }' : ''}
          ${!printOptions.subjectReport ? '.print-subject-report { display: none !important; }' : ''}
          ${!printOptions.teacherCards ? '.print-teacher-cards { display: none !important; }' : ''}
          
          .card { 
            box-shadow: none !important; 
            border: 1px solid #ddd;
            page-break-inside: avoid;
          }
          table { 
            page-break-inside: auto;
            width: 100%;
            border-collapse: collapse;
          }
          tr { page-break-inside: avoid; }
          th, td { 
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th { 
            background-color: #f0f0f0 !important;
            font-weight: bold;
          }
          
          /* Cabeçalho da escola */
          .print-header {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            border-bottom: 3px solid #000;
            margin-bottom: 20px;
          }
          .print-header img {
            max-height: 80px;
            margin-right: 20px;
          }
          .print-header-text {
            text-align: center;
          }
          .print-header-text h1 {
            font-size: 18pt;
            margin: 0 0 5px 0;
            font-weight: bold;
          }
          .print-header-text p {
            margin: 2px 0;
            font-size: 10pt;
            color: #333;
          }
          
          /* Quebra de página entre seções */
          .print-page-break {
            page-break-before: always;
          }
          
          /* Configuração da página */
          @page {
            margin: 1.5cm;
            size: A4 landscape;
          }
          
          /* Impressão de cores */
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Repetir cabeçalho da tabela */
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
        
        .only-print { display: none; }
      `}</style>

      {/* Modal de Seleção de Impressão */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Printer className="text-purple-600" size={28} />
              Opções de Impressão
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              Selecione os relatórios que deseja imprimir:
            </p>
            
            <div className="space-y-4 mb-6">
              {/* Relatório Geral */}
              <label className="flex items-start gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: printOptions.generalReport ? '#3B82F6' : '#E5E7EB' }}>
                <input
                  type="checkbox"
                  checked={printOptions.generalReport}
                  onChange={(e) => setPrintOptions({...printOptions, generalReport: e.target.checked})}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">Relatório Geral de Frequência</p>
                  <p className="text-sm text-gray-600">Tabela resumida por professor com totais</p>
                </div>
              </label>
              
              {/* Relatório por Disciplina */}
              <label className="flex items-start gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: printOptions.subjectReport ? '#3B82F6' : '#E5E7EB' }}>
                <input
                  type="checkbox"
                  checked={printOptions.subjectReport}
                  onChange={(e) => setPrintOptions({...printOptions, subjectReport: e.target.checked})}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">Déficit/Saldo por Disciplina</p>
                  <p className="text-sm text-gray-600">Detalhamento por disciplina e turma</p>
                </div>
              </label>
              
              {/* Cards dos Professores */}
              <label className="flex items-start gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: printOptions.teacherCards ? '#3B82F6' : '#E5E7EB' }}>
                <input
                  type="checkbox"
                  checked={printOptions.teacherCards}
                  onChange={(e) => setPrintOptions({...printOptions, teacherCards: e.target.checked})}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">Cards Individuais dos Professores</p>
                  <p className="text-sm text-gray-600">Lista detalhada com todas as aulas do dia</p>
                </div>
              </label>
            </div>
            
            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPrint}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento de Aulas */}
      {showPaymentModal && selectedTeacherForPayment && selectedClassForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="text-green-600" size={28} />
              Registrar Pagamento de Aula
            </h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Professor:</strong> {selectedTeacherForPayment.teacherName}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Disciplina:</strong> {selectedClassForPayment.subjectName}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Turma:</strong> {selectedClassForPayment.className}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Período:</strong> {selectedClassForPayment.period}º - {selectedClassForPayment.startTime} às {selectedClassForPayment.endTime}
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Data do Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Data do Pagamento
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quando o pagamento foi realizado
                </p>
              </div>
              
              {/* Data de Referência */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📚 Data de Referência da Aula
                </label>
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Data em que a aula ocorreu
                </p>
              </div>
            </div>
            
            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={handleClosePaymentModal}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <DollarSign size={18} />
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recibo de Pagamento */}
      {showPaymentReceipt && paymentReceiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* Cabeçalho do Recibo */}
            <div className="p-6 bg-gradient-to-r from-green-600 to-blue-600 text-white no-print">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <FileText size={28} />
                Recibo de Pagamento de Aula
              </h3>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handlePrintPaymentReceipt}
                  className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center gap-2"
                >
                  <Printer size={18} />
                  Imprimir Recibo
                </button>
                <button
                  onClick={() => setShowPaymentReceipt(false)}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Conteúdo do Recibo para Impressão */}
            <div className="p-8" id="payment-receipt">
              {/* Cabeçalho da Escola */}
              <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
                {schoolData?.logo && (
                  <img src={schoolData.logo} alt="Logo" className="h-16 mx-auto mb-2" />
                )}
                <h1 className="text-2xl font-bold text-gray-800">{schoolData?.name || 'Sistema Escolar'}</h1>
                <p className="text-sm text-gray-600 mt-1">Recibo de Pagamento de Aula</p>
              </div>

              {/* Informações do Recibo */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500">Nº do Recibo</p>
                  <p className="font-bold text-gray-800">#{paymentReceiptData.receiptNumber.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Data de Emissão</p>
                  <p className="font-bold text-gray-800">{paymentReceiptData.generatedAt}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Data do Pagamento</p>
                  <p className="font-bold text-gray-800">
                    {new Date(paymentReceiptData.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Data da Aula</p>
                  <p className="font-bold text-gray-800">
                    {new Date(referenceDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Dados do Professor */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <User size={18} className="text-blue-600" />
                  Dados do Professor
                </h4>
                <p className="text-sm text-gray-700">
                  <strong>Nome:</strong> {paymentReceiptData.teacherName}
                </p>
              </div>

              {/* Dados da Aula */}
              <div className="bg-green-50 p-4 rounded-lg mb-6 border border-green-200">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <BookOpen size={18} className="text-green-600" />
                  Dados da Aula Paga
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                  <div>
                    <strong>Disciplina:</strong> {paymentReceiptData.classData.subjectName}
                  </div>
                  <div>
                    <strong>Turma:</strong> {paymentReceiptData.classData.className}
                  </div>
                  <div>
                    <strong>Período:</strong> {paymentReceiptData.classData.period}º
                  </div>
                  <div>
                    <strong>Horário:</strong> {paymentReceiptData.classData.startTime} - {paymentReceiptData.classData.endTime}
                  </div>
                </div>
              </div>

              {/* Confirmação */}
              <div className="bg-gray-100 p-4 rounded-lg text-center border-2 border-gray-300">
                <p className="text-sm text-gray-700 mb-2">
                  ✅ <strong>Confirmo o pagamento da aula referente à data acima.</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Este recibo foi gerado automaticamente pelo sistema.
                </p>
              </div>

              {/* Assinatura */}
              <div className="mt-8 pt-6 border-t border-gray-300">
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="border-t border-gray-400 pt-2 mt-16">
                      <p className="text-sm font-medium">Assinatura do Responsável</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-gray-400 pt-2 mt-16">
                      <p className="text-sm font-medium">Assinatura do Professor</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para impressão do recibo */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payment-receipt, #payment-receipt * {
            visibility: visible;
          }
          #payment-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Cabeçalho para Impressão */}
      <div className="only-print print-header">
        {schoolData?.logo && (
          <img src={schoolData.logo} alt="Logo da escola" />
        )}
        <div className="print-header-text">
          <h1>{schoolData?.name || 'Sistema de Controle Escolar'}</h1>
          <p><strong>Relatório de Frequência dos Professores</strong></p>
          <p>Período: {reportType === 'daily' ? selectedDate : `${dateRange.start} a ${dateRange.end}`}</p>
          <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 p-6 rounded-lg no-print">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-900">
          <CheckCircle className="text-blue-600" size={32} />
          Controle de Frequência por Aula
        </h1>
        <p className="text-blue-700 mt-2">
          Registre a presença de cada professor por aula individual do dia
        </p>
      </div>

      {/* Seção de Registro Diário */}
      <div className="card no-print print-teacher-cards">{/* Nota: print-teacher-cards controla se os cards dos professores serão impressos */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="text-blue-600" />
          📝 Registro de Frequência Diária
        </h2>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Data do Registro
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input w-full"
            />
            <p className="text-sm text-gray-500 mt-1">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📋 Horário Base para Cálculo de Déficit
            </label>
            <select
              value={selectedTimetableId}
              onChange={(e) => setSelectedTimetableId(e.target.value)}
              className="input w-full"
            >
              <option value="auto">🤖 Automático (detectar do dia)</option>
              {availableTimetables.map((timetable: any) => (
                <option key={timetable.scheduleId} value={timetable.scheduleId}>
                  {timetable.title}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Usado para comparar aulas previstas vs dadas
            </p>
          </div>
        </div>

        {/* Mensagem informativa sobre o horário usado */}
        {scheduledData?.scheduleId && (
          <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-800">
              📋 <strong>Horário em uso:</strong> {scheduledData.scheduleName}
              {scheduledData.message && ` • ${scheduledData.message}`}
            </p>
          </div>
        )}

        {/* Alerta de dia não cadastrado (mas com aulas disponíveis) */}
        {scheduledData?.warning && mergedData.length > 0 && (
          <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-orange-600 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm text-orange-800 font-semibold mb-1">
                  Atenção: {scheduledData.message}
                </p>
                <p className="text-xs text-orange-700">
                  As aulas abaixo são baseadas no horário padrão da {scheduledData.dayOfWeek}. 
                  Para melhor controle, cadastre este dia no <strong>Calendário Letivo</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerta quando não há aulas */}
        {scheduledData?.message && mergedData.length === 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ {scheduledData.message}
            </p>
          </div>
        )}

        {/* Botão Expandir/Recolher Todos */}
        {mergedData.length > 0 && (
          <>
            {/* Estatísticas dos professores */}
            <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">TOTAL DE PROFESSORES</p>
                <p className="text-2xl font-bold text-blue-900">{mergedData.length}</p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">COM AULAS NESTE DIA</p>
                <p className="text-2xl font-bold text-green-900">
                  {mergedData.filter(t => t.totalScheduledClasses > 0).length}
                </p>
              </div>
              <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded-lg">
                <p className="text-xs text-gray-600 font-medium">SEM AULAS NESTE DIA</p>
                <p className="text-2xl font-bold text-gray-700">
                  {mergedData.filter(t => t.totalScheduledClasses === 0).length}
                </p>
              </div>
            </div>
            
            <div className="mb-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              💡 <strong>Clique nos cards dos professores</strong> para ver e marcar presença/ausência de cada aula individual
            </p>
            <button
              onClick={toggleAllTeachers}
              className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              {expandedTeachers.size === mergedData.length ? (
                <>
                  <Minimize2 size={16} />
                  Recolher Todos
                </>
              ) : (
                <>
                  <Maximize2 size={16} />
                  Expandir Todos
                </>
              )}
            </button>
          </div>
          </>
        )}

        {/* Lista de Professores com Aulas */}
        <div className="space-y-4">
          {mergedData.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600 font-semibold mb-2">Nenhuma aula agendada para este dia</p>
              <p className="text-sm text-gray-500 mb-4">
                {scheduledData?.message || 'Verifique se o dia está cadastrado no calendário escolar'}
              </p>
              
              {/* Se não há horários gerados, mostrar botão para criar */}
              {scheduledData?.message && scheduledData.message.includes('Nenhum horário') && (
                <div className="mt-4">
                  <a
                    href="/#/generate-timetable"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Calendar size={20} />
                    Ir para Gerar Horários
                  </a>
                  <p className="text-xs text-gray-500 mt-2">
                    Crie um horário primeiro para poder registrar a frequência dos professores
                  </p>
                </div>
              )}
              
              {/* Se o dia não está no calendário, mostrar botão para cadastrar */}
              {scheduledData?.warning && !scheduledData.message?.includes('Nenhum horário') && (
                <div className="mt-4">
                  <a
                    href="/#/school-calendar"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Calendar size={20} />
                    Cadastrar no Calendário Letivo
                  </a>
                  <p className="text-xs text-gray-500 mt-2">
                    Cadastre este dia no calendário para associar um horário específico
                  </p>
                </div>
              )}
            </div>
          ) : (
            mergedData.map((teacher: AttendanceRecord) => {
              const isExpanded = expandedTeachers.has(teacher.teacherId);
              const hasAbsent = teacher.totalAbsentClasses > 0;
              const allPresent = teacher.totalPresentClasses === teacher.totalScheduledClasses;

              return (
                <div
                  key={teacher.teacherId}
                  className={`border-2 rounded-lg overflow-hidden transition-all ${
                    allPresent
                      ? 'border-green-400 bg-green-50'
                      : hasAbsent
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {/* Cabeçalho do Professor */}
                  <div
                    className="p-4 cursor-pointer hover:bg-opacity-80 flex items-center gap-3"
                    onClick={() => toggleTeacherExpansion(teacher.teacherId)}
                  >
                    {/* Ícone de Expansão */}
                    <div className="text-blue-600">
                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>

                    <div className="flex items-center justify-between flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <User className="text-gray-600" size={24} />
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">{teacher.teacherName}</h3>
                            <p className="text-sm text-gray-600">
                              {teacher.totalScheduledClasses === 0 ? (
                                <span className="text-gray-500 font-medium">Sem aulas neste dia</span>
                              ) : (
                                <>
                                  {teacher.totalScheduledClasses} aula(s) agendada(s) • 
                                  <span className="text-green-600 font-medium ml-1">{teacher.totalPresentClasses} presentes</span> • 
                                  <span className="text-red-600 font-medium ml-1">{teacher.totalAbsentClasses} ausentes</span> • 
                                  <span className="text-gray-500 ml-1">{teacher.totalPendingClasses} pendentes</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botões de ação - só mostrar se houver aulas */}
                      {teacher.totalScheduledClasses > 0 && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAllClasses(teacher, 'present');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                            title="Marcar todas as aulas deste professor como presente"
                          >
                            <CheckCircle size={16} />
                            Todas Presentes
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAllClasses(teacher, 'absent');
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                            title="Marcar todas as aulas deste professor como ausente"
                          >
                            <XCircle size={16} />
                            Todas Ausentes
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearTeacherAttendance(teacher.teacherId);
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            title="Limpar registros deste professor"
                          >
                            <Eraser size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lista de Aulas (expandível) */}
                  {isExpanded && (
                    <div className="border-t-2 border-gray-200 bg-white p-4">
                      {teacher.classes.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <AlertCircle className="mx-auto text-gray-400 mb-2" size={40} />
                          <p className="text-gray-600 font-medium">
                            Este professor não tem aulas agendadas neste dia
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            De acordo com o horário base selecionado
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-3 bg-blue-50 p-2 rounded">
                            <p className="text-sm text-blue-800">
                              📚 <strong>Marque a presença/ausência de cada aula individualmente:</strong>
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Mostrar TODOS os períodos do dia */}
                            {(scheduledData?.allPeriods || []).map((period: any) => {
                              // Buscar se o professor tem aula neste período
                              const classInPeriod = teacher.classes.find((c: any) => c.period === period.period);
                              
                              if (!classInPeriod) {
                                // Professor não tem aula neste período
                                return (
                                  <div
                                    key={period.period}
                                    className="border-2 rounded-lg p-3 bg-gray-50 border-gray-200 opacity-50"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="bg-gray-400 text-white px-2 py-1 rounded text-sm font-bold">
                                            {period.period}º
                                          </span>
                                          <Clock size={14} className="text-gray-400" />
                                          <span className="text-sm text-gray-500">
                                            {period.startTime} - {period.endTime}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-500 italic mt-2">Sem aula</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Professor TEM aula neste período
                              const cls = classInPeriod;
                              return (
                          <div
                            key={period.period}
                            className={`border-2 rounded-lg p-3 ${
                              cls.status === 'present'
                                ? 'bg-green-50 border-green-400'
                                : cls.status === 'absent'
                                ? 'bg-red-50 border-red-400'
                                : 'bg-gray-50 border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-bold">
                                    {cls.period}º
                                  </span>
                                  <Clock size={14} className="text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    {cls.startTime} - {cls.endTime}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mb-1">
                                  <BookOpen size={14} className="text-blue-600" />
                                  <p className="text-sm font-semibold text-gray-800">{cls.subjectName}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <GraduationCap size={14} className="text-purple-600" />
                                  <p className="text-xs text-gray-600">{cls.className}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleClassStatusChange(teacher.teacherId, cls.period, 'present')}
                                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                  cls.status === 'present'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                                }`}
                              >
                                <CheckCircle size={12} className="inline mr-1" />
                                Presente
                              </button>
                              <button
                                onClick={() => handleClassStatusChange(teacher.teacherId, cls.period, 'absent')}
                                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                  cls.status === 'absent'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                                }`}
                              >
                                <XCircle size={12} className="inline mr-1" />
                                Ausente
                              </button>
                            </div>
                            
                            {/* Botão de Pagamento - apenas para aulas ausentes */}
                            {cls.status === 'absent' && (
                              <button
                                onClick={() => handleOpenPaymentModalForClass(teacher, cls)}
                                className="w-full mt-2 px-2 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded text-xs font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1"
                              >
                                <DollarSign size={12} />
                                Registrar Pagamento
                              </button>
                            )}
                          </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Seção de Relatórios */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="text-purple-600" />
          📊 Relatórios de Frequência
        </h2>

        {/* Filtros de Relatório */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
          <button
            onClick={() => {
              setReportType('daily');
              setStartDate('');
              setEndDate('');
            }}
            className={`btn ${
              reportType === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
            }`}
          >
            <Calendar size={18} className="inline mr-2" />
            Diário
          </button>
          <button
            onClick={() => {
              setReportType('weekly');
              const today = new Date();
              const weekStart = new Date(today);
              weekStart.setDate(today.getDate() - today.getDay() + 1);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 4);
              setStartDate(weekStart.toISOString().split('T')[0]);
              setEndDate(weekEnd.toISOString().split('T')[0]);
            }}
            className={`btn ${
              reportType === 'weekly'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-green-100'
            }`}
          >
            <TrendingUp size={18} className="inline mr-2" />
            Semanal
          </button>
          <button
            onClick={() => {
              setReportType('monthly');
              const today = new Date();
              const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
              const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              setStartDate(monthStart.toISOString().split('T')[0]);
              setEndDate(monthEnd.toISOString().split('T')[0]);
            }}
            className={`btn ${
              reportType === 'monthly'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
            }`}
          >
            <Clock size={18} className="inline mr-2" />
            Mensal
          </button>
          <button
            onClick={() => {
              setReportType('yearly');
              const today = new Date();
              const yearStart = new Date(today.getFullYear(), 0, 1);
              const yearEnd = new Date(today.getFullYear(), 11, 31);
              setStartDate(yearStart.toISOString().split('T')[0]);
              setEndDate(yearEnd.toISOString().split('T')[0]);
            }}
            className={`btn ${
              reportType === 'yearly'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-purple-100'
            }`}
          >
            <BarChart3 size={18} className="inline mr-2" />
            Anual
          </button>
        </div>

        {/* Período do Relatório */}
        {reportType !== 'daily' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3 mb-6 no-print">
          <button
            onClick={handleOpenPrintModal}
            className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <Printer size={20} />
            Imprimir Relatórios
          </button>
          <button
            onClick={handleExportCSV}
            className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Download size={20} />
            Exportar CSV
          </button>
        </div>

        {/* Tabela de Relatório Geral - SEMPRE VISÍVEL */}
        <div className="print-general-report">
          <>
            {/* Título do Relatório Geral */}
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User className="text-blue-600" size={24} />
              Relatório Geral por Professor
            </h3>
            {/* Cabeçalho do Relatório para Impressão */}
            <div className="only-print mb-6">
              <h2 className="text-2xl font-bold text-center mb-2">
                Relatório de Frequência dos Professores
              </h2>
              <p className="text-center text-gray-600">
                Período: {reportType === 'daily' ? selectedDate : `${dateRange.start} a ${dateRange.end}`}
              </p>
              <p className="text-center text-sm text-gray-500">
                Gerado em: {new Date().toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <th className="border border-gray-300 p-3 text-left font-bold">Professor</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Aulas Previstas</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Aulas Dadas</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Faltas</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Taxa (%)</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Carga Horária (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-gray-300 p-8 text-center">
                        <div className="text-gray-500">
                          <FileText className="mx-auto mb-2 text-gray-400" size={48} />
                          <p className="font-medium">Nenhum registro de frequência encontrado</p>
                          <p className="text-sm mt-1">Registre a frequência dos professores para visualizar o relatório</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                  report.map((r, index) => (
                    <tr key={r.teacherId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border border-gray-300 p-3 font-semibold">{r.teacherName}</td>
                      <td className="border border-gray-300 p-3 text-center">{r.totalScheduledClasses}</td>
                      <td className="border border-gray-300 p-3 text-center font-bold text-green-700">
                        {r.totalPresentClasses}
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-bold text-red-700">
                        {r.totalAbsentClasses}
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span className={`font-bold ${
                          r.attendanceRate >= 90 ? 'text-green-600' :
                          r.attendanceRate >= 75 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {r.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-semibold">
                        {r.workload.toFixed(1)}h
                      </td>
                    </tr>
                  )))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-100 font-bold">
                    <td className="border border-gray-300 p-3">TOTAIS</td>
                    <td className="border border-gray-300 p-3 text-center">
                      {report.reduce((sum, r) => sum + r.totalScheduledClasses, 0)}
                    </td>
                    <td className="border border-gray-300 p-3 text-center text-green-700">
                      {report.reduce((sum, r) => sum + r.totalPresentClasses, 0)}
                    </td>
                    <td className="border border-gray-300 p-3 text-center text-red-700">
                      {report.reduce((sum, r) => sum + r.totalAbsentClasses, 0)}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      {report.length > 0
                        ? ((report.reduce((sum, r) => sum + r.attendanceRate, 0) / report.length).toFixed(1))
                        : '0.0'}%
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      {report.reduce((sum, r) => sum + r.workload, 0).toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Resumo Estatístico */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Total de Professores</p>
                    <p className="text-3xl font-bold text-blue-900">{report.length}</p>
                  </div>
                  <User className="text-blue-600" size={40} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Aulas Dadas</p>
                    <p className="text-3xl font-bold text-green-900">
                      {report.reduce((sum, r) => sum + r.totalPresentClasses, 0)}
                    </p>
                  </div>
                  <CheckCircle className="text-green-600" size={40} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 font-medium">Total de Faltas</p>
                    <p className="text-3xl font-bold text-red-900">
                      {report.reduce((sum, r) => sum + r.totalAbsentClasses, 0)}
                    </p>
                  </div>
                  <XCircle className="text-red-600" size={40} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Carga Horária Total</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {report.reduce((sum, r) => sum + r.workload, 0).toFixed(0)}h
                    </p>
                  </div>
                  <Clock className="text-purple-600" size={40} />
                </div>
              </div>
            </div>
          </>
        </div>{/* Fim print-general-report */}

        {/* Tabela de Déficit por Disciplina/Turma - SEMPRE VISÍVEL */}
        <div className="print-subject-report">
          <div className="mt-8 print-page-break">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="text-orange-600" size={24} />
              📊 Déficit/Saldo por Disciplina e Turma
            </h3>
            <p className="text-sm text-gray-600 mb-4 no-print">
              O déficit/saldo é calculado por disciplina em cada turma, considerando as faltas do professor responsável.
            </p>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                        <th className="border border-gray-300 p-3 text-left font-bold">Disciplina</th>
                        <th className="border border-gray-300 p-3 text-left font-bold">Turma</th>
                        <th className="border border-gray-300 p-3 text-left font-bold">Professor</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">Previstas</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">Dadas</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">Déficit</th>
                        <th className="border border-gray-300 p-3 text-left font-bold">Datas das Faltas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectDeficitReport.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-gray-300 p-8 text-center">
                            <div className="text-gray-500">
                              <BookOpen className="mx-auto mb-2 text-gray-400" size={48} />
                              <p className="font-medium">Nenhum déficit/saldo encontrado</p>
                              <p className="text-sm mt-1">Registre a frequência dos professores para visualizar déficits por disciplina</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                      subjectDeficitReport.map((item, index) => (
                        <tr key={`${item.subjectId}_${item.classId}`} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-300 p-3 font-semibold text-blue-800">
                            {item.subjectName}
                          </td>
                          <td className="border border-gray-300 p-3">
                            <div className="font-medium">{item.className}</div>
                            <div className="text-xs text-gray-600">{item.grade}</div>
                          </td>
                          <td className="border border-gray-300 p-3 text-gray-700">
                            {item.teacherName}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {item.scheduledClasses}
                          </td>
                          <td className="border border-gray-300 p-3 text-center font-bold text-green-700">
                            {item.givenClasses}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {item.deficit > 0 ? (
                              <span className="font-bold text-red-600 text-lg">
                                -{item.deficit}
                              </span>
                            ) : item.deficit < 0 ? (
                              <span className="font-bold text-green-600 text-lg">
                                +{Math.abs(item.deficit)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-300 p-3">
                            {item.dates.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.dates.map(date => (
                                  <span key={date} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Sem faltas</span>
                            )}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-orange-100 font-bold">
                        <td colSpan={3} className="border border-gray-300 p-3">TOTAIS</td>
                        <td className="border border-gray-300 p-3 text-center">
                          {subjectDeficitReport.reduce((sum, item) => sum + item.scheduledClasses, 0)}
                        </td>
                        <td className="border border-gray-300 p-3 text-center text-green-700">
                          {subjectDeficitReport.reduce((sum, item) => sum + item.givenClasses, 0)}
                        </td>
                        <td className="border border-gray-300 p-3 text-center text-red-700">
                          {subjectDeficitReport.reduce((sum, item) => sum + (item.deficit > 0 ? item.deficit : 0), 0)}
                        </td>
                        <td className="border border-gray-300 p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Alertas de Déficit Crítico */}
                {subjectDeficitReport.filter(item => item.deficit >= 2).length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-600 rounded">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-bold text-red-900 mb-2">
                          ⚠️ Atenção: {subjectDeficitReport.filter(item => item.deficit >= 2).length} disciplina(s) com déficit crítico (≥2 aulas)
                        </p>
                        <ul className="text-sm text-red-800 space-y-1">
                          {subjectDeficitReport
                            .filter(item => item.deficit >= 2)
                            .slice(0, 5)
                            .map(item => (
                              <li key={`${item.subjectId}_${item.classId}`}>
                                • <strong>{item.subjectName}</strong> na turma <strong>{item.className}</strong>: 
                                <span className="font-bold text-red-600"> {item.deficit} aulas em falta</span>
                              </li>
                            ))}
                        </ul>
                        {subjectDeficitReport.filter(item => item.deficit >= 2).length > 5 && (
                          <p className="text-xs text-red-700 mt-2">
                            ...e mais {subjectDeficitReport.filter(item => item.deficit >= 2).length - 5} disciplina(s)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
        </div>{/* Fim print-subject-report */}
      </div>

      {/* ===== RELATÓRIO DE DÉFICIT/SALDO POR PROFESSOR E DISCIPLINA ===== */}
      <div className="mt-8 mb-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg shadow-lg border-2 border-orange-300 no-print">
        <div className="p-6">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-600 p-3 rounded-lg">
              <BarChart3 className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-orange-900">
                📊 Relatório de Déficit/Saldo de Carga Horária
              </h2>
              <p className="text-sm text-orange-700 mt-1">
                Comparação entre carga horária esperada e aulas efetivamente dadas • Baseado na frequência registrada
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-orange-600 font-semibold">
                Período: {reportType === 'daily' ? 'Diário' : reportType === 'weekly' ? 'Semanal' : reportType === 'monthly' ? 'Mensal' : 'Anual'}
              </div>
              <div className="text-3xl font-bold text-orange-900">
                {workloadDeficitReport.filter(r => r.status === 'critical').length}
              </div>
              <div className="text-xs text-orange-600">Críticos</div>
            </div>
          </div>

          {/* Legenda de Status */}
          <div className="flex gap-3 mb-4 p-3 bg-white rounded-lg border border-orange-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-700">✅ OK (&lt;5%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium text-gray-700">⚠️ Atenção (5-10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-gray-700">🚨 Crítico (&gt;10%)</span>
            </div>
          </div>

          {/* Tabela de Déficit/Saldo */}
          {workloadDeficitReport.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
              <AlertCircle className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-lg font-semibold">Nenhum dado de frequência registrado</p>
              <p className="text-sm mt-2">
                Registre a frequência dos professores para visualizar o relatório de déficit/saldo
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                    <th className="border border-orange-500 p-3 text-left font-bold" rowSpan={2}>Status</th>
                    <th className="border border-orange-500 p-3 text-left font-bold" rowSpan={2}>Professor</th>
                    <th className="border border-orange-500 p-3 text-left font-bold" rowSpan={2}>Disciplina</th>
                    <th className="border border-orange-500 p-3 text-left font-bold" rowSpan={2}>Turma</th>
                    <th className="border border-orange-500 p-3 text-center font-bold" colSpan={2}>📅 Aulas Previstas<br/>(Horário × Dias Letivos)</th>
                    <th className="border border-orange-500 p-3 text-center font-bold" colSpan={2}>✅ Aulas Dadas<br/>(Frequência)</th>
                    <th className="border border-orange-500 p-3 text-center font-bold" colSpan={3}>📊 Déficit / Saldo</th>
                  </tr>
                  <tr className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm">
                    <th className="border border-orange-400 p-2 text-center font-semibold">Qtd</th>
                    <th className="border border-orange-400 p-2 text-center font-semibold">Horas</th>
                    <th className="border border-orange-400 p-2 text-center font-semibold">Qtd</th>
                    <th className="border border-orange-400 p-2 text-center font-semibold">Horas</th>
                    <th className="border border-orange-400 p-2 text-center font-semibold">Aulas</th>
                    <th className="border border-orange-400 p-2 text-center font-semibold">Horas</th>
                    <th className="border border-orange-400 p-2 text-center font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadDeficitReport.map((item, idx) => (
                    <tr 
                      key={`${item.teacherId}-${item.subjectId}-${item.classId || 'no-class'}`}
                      className={
                        item.status === 'critical' ? 'bg-red-50' :
                        item.status === 'warning' ? 'bg-yellow-50' :
                        idx % 2 === 0 ? 'bg-orange-50' : 'bg-white'
                      }
                    >
                      <td className="border border-gray-300 p-3 text-center">
                        {item.status === 'critical' && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-bold">
                            🚨
                          </span>
                        )}
                        {item.status === 'warning' && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white font-bold">
                            ⚠️
                          </span>
                        )}
                        {item.status === 'ok' && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold">
                            ✅
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="font-semibold text-gray-900">{item.teacherName}</div>
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="font-medium text-gray-800">{item.subjectName}</div>
                      </td>
                      <td className="border border-gray-300 p-3">
                        {item.className ? (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                            {item.className}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      {/* Aulas Previstas */}
                      <td className="border border-gray-300 p-3 text-center bg-blue-50">
                        <span className="font-bold text-blue-700 text-lg">
                          {item.expectedClasses.toFixed(0)}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">aulas</div>
                      </td>
                      <td className="border border-gray-300 p-3 text-center bg-blue-50">
                        <span className="font-semibold text-blue-600">
                          {item.expectedHours.toFixed(1)}h
                        </span>
                      </td>
                      {/* Aulas Dadas */}
                      <td className="border border-gray-300 p-3 text-center bg-green-50">
                        <span className="font-bold text-green-700 text-lg">
                          {item.givenClasses}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">aulas</div>
                      </td>
                      <td className="border border-gray-300 p-3 text-center bg-green-50">
                        <span className="font-semibold text-green-600">
                          {item.givenHours.toFixed(1)}h
                        </span>
                      </td>
                      {/* Déficit/Saldo */}
                      <td className="border border-gray-300 p-3 text-center">
                        {item.deficitClasses > 0.5 ? (
                          <span className="font-bold text-red-600 text-lg">
                            -{Math.round(item.deficitClasses)}
                          </span>
                        ) : item.deficitClasses < -0.5 ? (
                          <span className="font-bold text-green-600 text-lg">
                            +{Math.abs(Math.round(item.deficitClasses))}
                          </span>
                        ) : (
                          <span className="text-gray-400">✓</span>
                        )}
                        <div className="text-xs text-gray-500 mt-1">aulas</div>
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        {item.deficit > 0.5 ? (
                          <span className="font-bold text-red-600">
                            -{item.deficit.toFixed(1)}h
                          </span>
                        ) : item.deficit < -0.5 ? (
                          <span className="font-bold text-green-600">
                            +{Math.abs(item.deficit).toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-gray-400">✓</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span className={`font-bold text-lg ${
                          Math.abs(item.deficitPercentage) > 10 ? 'text-red-600' :
                          Math.abs(item.deficitPercentage) > 5 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {item.deficitPercentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-orange-100 to-red-100 font-bold">
                    <td colSpan={4} className="border border-gray-300 p-3 text-right">
                      <span className="text-lg text-gray-900">📊 TOTAIS:</span>
                    </td>
                    {/* Aulas Previstas */}
                    <td className="border border-gray-300 p-3 text-center bg-blue-100">
                      <span className="text-blue-700 font-bold text-lg">
                        {workloadDeficitReport.reduce((sum, item) => sum + item.expectedClasses, 0).toFixed(0)}
                      </span>
                      <div className="text-xs text-gray-600">aulas</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center bg-blue-100">
                      <span className="text-blue-700 font-bold">
                        {workloadDeficitReport.reduce((sum, item) => sum + item.expectedHours, 0).toFixed(1)}h
                      </span>
                    </td>
                    {/* Aulas Dadas */}
                    <td className="border border-gray-300 p-3 text-center bg-green-100">
                      <span className="text-green-700 font-bold text-lg">
                        {workloadDeficitReport.reduce((sum, item) => sum + item.givenClasses, 0)}
                      </span>
                      <div className="text-xs text-gray-600">aulas</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center bg-green-100">
                      <span className="text-green-700 font-bold">
                        {workloadDeficitReport.reduce((sum, item) => sum + item.givenHours, 0).toFixed(1)}h
                      </span>
                    </td>
                    {/* Déficit/Saldo */}
                    <td className="border border-gray-300 p-3 text-center">
                      {(() => {
                        const totalDeficitClasses = workloadDeficitReport.reduce((sum, item) => sum + item.deficitClasses, 0);
                        return totalDeficitClasses > 0.5 ? (
                          <span className="font-bold text-red-600 text-xl">
                            -{Math.round(totalDeficitClasses)}
                          </span>
                        ) : totalDeficitClasses < -0.5 ? (
                          <span className="font-bold text-green-600 text-xl">
                            +{Math.abs(Math.round(totalDeficitClasses))}
                          </span>
                        ) : (
                          <span className="text-gray-400">✓</span>
                        );
                      })()}
                      <div className="text-xs text-gray-600">aulas</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      {(() => {
                        const totalDeficit = workloadDeficitReport.reduce((sum, item) => sum + item.deficit, 0);
                        return totalDeficit > 0.5 ? (
                          <span className="font-bold text-red-600 text-lg">
                            -{totalDeficit.toFixed(1)}h
                          </span>
                        ) : totalDeficit < 0 ? (
                          <span className="font-bold text-green-600 text-lg">
                            +{Math.abs(totalDeficit).toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        );
                      })()}
                    </td>
                    <td className="border border-gray-300 p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Nota Explicativa */}
          <div className="mt-4 p-4 bg-orange-100 border-l-4 border-orange-600 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-orange-900">
                <p className="font-semibold mb-1">
                  ℹ️ Como interpretar este relatório
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>CH Esperada:</strong> Calculada com base na lotação do professor (Semanal × 40 semanas = Anual ÷ 12 = Mensal)</li>
                  <li><strong>Aulas Dadas:</strong> Número de aulas marcadas como "presente" na frequência</li>
                  <li><strong>Déficit:</strong> Valor positivo = faltam horas • Valor negativo = horas extras/saldo</li>
                  <li><strong>Status:</strong> 🚨 Crítico (&gt;10%) • ⚠️ Atenção (5-10%) • ✅ OK (&lt;5%)</li>
                  <li><strong>Atualização:</strong> Relatório atualiza automaticamente ao mudar lotações ou registrar frequência</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ===== FIM RELATÓRIO DE DÉFICIT/SALDO ===== */}

      {/* ===== SEÇÃO PERMANENTE: RELAÇÃO GERAL DE CARGAS HORÁRIAS ===== */}
      <div className="mt-8 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-blue-300 no-print">
        <div className="p-6">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <BookOpen className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-blue-900">
                📚 Relação Geral de Cargas Horárias
              </h2>
              <p className="text-sm text-blue-700 mt-1">
                Lotação de todos os professores por disciplina • Dados da página de <strong>Lotação de Professores</strong>
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 font-semibold">
                Total de Professores
              </div>
              <div className="text-3xl font-bold text-blue-900">
                {teacherWorkload.length}
              </div>
            </div>
          </div>

          {/* Tabela de Cargas Horárias */}
          {teacherWorkload.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-lg font-semibold">Nenhuma lotação de professor cadastrada</p>
              <p className="text-sm mt-2">
                Acesse <strong>Lotação de Professores</strong> para associar professores às disciplinas
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <th className="border border-blue-500 p-4 text-left font-bold" rowSpan={2}>
                      👨‍🏫 Professor
                    </th>
                    <th className="border border-blue-500 p-4 text-left font-bold" rowSpan={2}>
                      📖 Disciplinas Lotadas
                    </th>
                    <th className="border border-blue-500 p-4 text-center font-bold" colSpan={4}>
                      ⏰ Carga Horária por Período
                    </th>
                  </tr>
                  <tr className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    <th className="border border-blue-400 p-2 text-center font-semibold text-sm">
                      📅 Diária
                    </th>
                    <th className="border border-blue-400 p-2 text-center font-semibold text-sm">
                      📆 Semanal
                    </th>
                    <th className="border border-blue-400 p-2 text-center font-semibold text-sm">
                      🗓️ Mensal
                    </th>
                    <th className="border border-blue-400 p-2 text-center font-semibold text-sm">
                      📊 Anual
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teacherWorkload.map((teacher, idx) => (
                    <tr 
                      key={teacher.teacherId}
                      className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}
                    >
                      <td className="border border-gray-300 p-4">
                        <div className="font-semibold text-gray-900">
                          {teacher.teacherName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {teacher.subjects.length} disciplina(s)
                        </div>
                      </td>
                      <td className="border border-gray-300 p-4">
                        <div className="space-y-2">
                          {teacher.subjects.map((subj, subIdx) => (
                            <div 
                              key={`${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                              className="bg-gray-50 p-2 rounded border border-gray-200"
                            >
                              <div className="flex items-center">
                                <span className="font-medium text-gray-800 flex-1">
                                  {subj.subjectName}
                                </span>
                                {subj.className && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {subj.className}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-4 text-center align-top">
                        <div className="space-y-2">
                          {teacher.subjects.map((subj, subIdx) => (
                            <div 
                              key={`daily-${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                              className="bg-blue-50 p-2 rounded"
                            >
                              <span className="font-semibold text-blue-700 text-sm">
                                {subj.dailyHours.toFixed(1)}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-4 text-center align-top">
                        <div className="space-y-2">
                          {teacher.subjects.map((subj, subIdx) => (
                            <div 
                              key={`weekly-${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                              className="bg-indigo-50 p-2 rounded"
                            >
                              <span className="font-semibold text-indigo-700 text-sm">
                                {subj.weeklyHours}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-4 text-center align-top">
                        <div className="space-y-2">
                          {teacher.subjects.map((subj, subIdx) => (
                            <div 
                              key={`monthly-${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                              className="bg-purple-50 p-2 rounded"
                            >
                              <span className="font-semibold text-purple-700 text-sm">
                                {subj.monthlyHours.toFixed(1)}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-4 text-center align-top">
                        <div className="space-y-2">
                          {teacher.subjects.map((subj, subIdx) => (
                            <div 
                              key={`annual-${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                              className="bg-green-50 p-2 rounded"
                            >
                              <span className="font-bold text-green-700">
                                {subj.annualHours}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-indigo-100 to-blue-100 font-bold">
                    <td className="border border-gray-300 p-4 text-right" colSpan={2}>
                      <span className="text-lg text-gray-900">
                        📊 TOTAIS GERAIS:
                      </span>
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      <div className="inline-flex items-center justify-center bg-blue-600 text-white font-bold text-lg px-4 py-2 rounded-lg">
                        <Clock className="mr-2" size={20} />
                        {(teacherWorkload.reduce((sum, t) => sum + t.totalWeeklyHours, 0) / 5).toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Diária</div>
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      <div className="inline-flex items-center justify-center bg-indigo-600 text-white font-bold text-xl px-4 py-2 rounded-lg">
                        <Clock className="mr-2" size={22} />
                        {teacherWorkload.reduce((sum, t) => sum + t.totalWeeklyHours, 0)}h
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Semanal</div>
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      <div className="inline-flex items-center justify-center bg-purple-600 text-white font-bold text-xl px-4 py-2 rounded-lg">
                        <Clock className="mr-2" size={22} />
                        {teacherWorkload.reduce((sum, t) => sum + t.totalMonthlyHours, 0).toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Mensal</div>
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      <div className="inline-flex items-center justify-center bg-green-600 text-white font-bold text-2xl px-6 py-3 rounded-lg">
                        <Clock className="mr-2" size={24} />
                        {teacherWorkload.reduce((sum, t) => sum + t.totalAnnualHours, 0)}h
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Anual</div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Nota Explicativa */}
          <div className="mt-4 p-4 bg-blue-100 border-l-4 border-blue-600 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">
                  ℹ️ Sobre as Cargas Horárias
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Origem dos dados:</strong> Cargas horárias definidas na página de <strong>Lotação de Professores</strong></li>
                  <li><strong>Atualização automática:</strong> Ao alterar lotações, os dados desta seção atualizam automaticamente</li>
                  <li><strong>Cálculo anual:</strong> CH Semanal × 40 semanas letivas = CH Anual</li>
                  <li><strong>Cálculo mensal:</strong> CH Anual ÷ 12 meses = CH Mensal</li>
                  <li><strong>Cálculo diário:</strong> CH Semanal ÷ 5 dias letivos = CH Diária</li>
                  <li>Cada professor pode ter múltiplas disciplinas com cargas horárias específicas por turma</li>
                  <li>Estas informações são usadas para calcular déficits/saldos, pagamentos e controlar frequência</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ===== FIM SEÇÃO PERMANENTE ===== */}

      {/* Estilos de impressão (já definidos no topo, removendo duplicata) */}
    </div>
  );
}