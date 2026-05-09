import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import PontoReport from '../components/PontoReport';
import { 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Printer,
  AlertCircle,
  Eraser,
  BookOpen,
  GraduationCap,
  Minimize2,
  Maximize2,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Search,
  Link2,
  Copy,
  Settings,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  BarChart2,
  Power,
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
  paidAt?: Date | string;
  classPaymentId?: string;
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


export default function TeacherAttendance() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('auto');
  const [saturdayWeekday, setSaturdayWeekday] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTeacherForPayment, setSelectedTeacherForPayment] = useState<AttendanceRecord | null>(null);
  const [selectedClassForPayment, setSelectedClassForPayment] = useState<ClassAttendance | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);
  const [paymentReceiptData, setPaymentReceiptData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Teacher ponto link state
  const [teacherPontoLink, setTeacherPontoLink] = useState<any>(null);
  const [loadingPontoLink, setLoadingPontoLink] = useState(false);
  const [showPontoLinkSection, setShowPontoLinkSection] = useState(false);
  const [pontoLinkCopied, setPontoLinkCopied] = useState(false);
  const [savingPontoSettings, setSavingPontoSettings] = useState(false);
  const [pontoSettings, setPontoSettings] = useState({
    requireGeolocation: false,
    latitude: '',
    longitude: '',
    areaM2: '1000',
    requirePhoto: false,
    graceMinutes: '10',
    activeTimetableId: '',
  });

  // Detectar se a data selecionada é um sábado
  const isSaturday = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return d.getDay() === 6; // 6 = sábado
  }, [selectedDate]);

  // Modo fixo: a página de frequência utiliza sempre o dia selecionado
  const reportType = 'daily' as const;

  // Calcular datas baseado no tipo de relatório (sempre diário)
  const getDateRangeForReportType = () => {
    return { start: selectedDate, end: selectedDate };
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

  // Buscar calendário escolar (dias letivos com feriados e recessos)
  const { data: calendarData } = useQuery({
    queryKey: ['school-calendar', user?.schoolId],
    queryFn: async () => {
      try {
        if (!user?.schoolId) {
          console.log('⚠️ schoolId não disponível para buscar calendário');
          return [];
        }
        const response = await api.get(`/schooldays/school/${user.schoolId}`);
        return response.data || [];
      } catch (error) {
        console.error('Erro ao buscar calendário:', error);
        return [];
      }
    },
    enabled: !!user?.schoolId
  });

  // Auto-popular saturdayWeekday do calendário para qualquer tipo de dia com troca configurada
  useEffect(() => {
    if (calendarData && Array.isArray(calendarData)) {
      const schoolDay = calendarData.find((d: any) => {
        const dDate = new Date(d.date).toISOString().split('T')[0];
        return dDate === selectedDate;
      });
      if (schoolDay?.followWeekday) {
        setSaturdayWeekday(schoolDay.followWeekday);
      } else {
        setSaturdayWeekday('');
      }
    } else if (!isSaturday) {
      setSaturdayWeekday('');
    }
  }, [selectedDate, isSaturday, calendarData]);

  // Buscar horário completo do timetable selecionado
  useQuery({
    queryKey: ['selected-timetable-detail', selectedTimetableId],
    queryFn: async () => {
      if (!selectedTimetableId || selectedTimetableId === 'auto') {
        // Buscar o horário padrão/mais recente
        const timetables = availableTimetables;
        if (timetables.length > 0) {
          const defaultTimetable = timetables.find((t: any) => t.isDefault) || timetables[0];
          const scheduleId = defaultTimetable.scheduleId || defaultTimetable.id || defaultTimetable._id;
          const response = await api.get(`/generated-timetables/${scheduleId}`);
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
    queryKey: ['scheduled-classes', selectedDate, selectedTimetableId, saturdayWeekday],
    queryFn: async () => {
      try {
        const queryParams: string[] = [];
        if (selectedTimetableId !== 'auto') queryParams.push(`scheduleId=${selectedTimetableId}`);
        if (saturdayWeekday) queryParams.push(`followWeekday=${saturdayWeekday}`);
        const qs = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        const response = await api.get(`/teacher-attendance/scheduled-classes/${selectedDate}${qs}`);
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
    queryKey: ['attendance-records', dateRange.start, dateRange.end, reportType],
    queryFn: async () => {
      const params: any = {};
      if (reportType === 'daily') {
        params.date = dateRange.start;
      } else {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      const response = await api.get('/teacher-attendance', { params });
      return response.data;
    },
    enabled: !!selectedDate
  });

  const attendanceList: AttendanceRecord[] = Array.isArray(attendanceRecords)
    ? attendanceRecords
    : Array.isArray((attendanceRecords as any)?.data)
      ? (attendanceRecords as any).data
      : [];

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

  // Calcular total de semanas letivas no ano baseado no calendário escolar

  // Calcular quantos dias da semana têm aula baseado no horário selecionado

  // Buscar lotação de professores (teacher-subjects) para exibir cargas horárias

  // Mesclar dados agendados com registros salvos
  const getMergedTeacherData = () => {
    if (!teachers || teachers.length === 0) return [];

    return teachers.map(teacher => {
      // Buscar registro salvo
      const savedRecord = attendanceList.find(
        (r: AttendanceRecord) => r.teacherId === teacher.teacherId && r.date === selectedDate
      );

      if (savedRecord) {
        // Usar dados salvos
        return savedRecord;
      }

      // Usar dados agendados com status presente (padrão até que se marque falta)
      const defaultClasses = (teacher.classes || []).map((cls: any) => ({ ...cls, status: 'present' as const }));
      return {
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName,
        date: selectedDate,
        dayOfWeek: scheduledData?.dayOfWeek || '',
        classes: defaultClasses,
        totalScheduledClasses: defaultClasses.length,
        totalPresentClasses: defaultClasses.length,
        totalAbsentClasses: 0,
        totalPendingClasses: 0,
        attendanceRate: defaultClasses.length > 0 ? 100 : 0
      };
    }).sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'pt-BR'));
  };

  const mergedData = getMergedTeacherData();

  // Filtrar por busca de professor
  const displayTeachers = searchQuery.trim()
    ? mergedData.filter(t => t.teacherName.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : mergedData;

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
      const payload: any = {
        teacherId,
        date: selectedDate,
        period,
        status,
        scheduleId: scheduledData?.scheduleId // ✅ Adicionar scheduleId específico
      };
      
      // Se é sábado letivo, enviar o dia da semana correspondente
      if (isSaturday && saturdayWeekday) {
        payload.followWeekday = saturdayWeekday;
      }
      
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

  // Gerar relatório por professor - usa dados do backend
  const generateReport = (): AttendanceReport[] => {
    // Usar dados do backend que já vêm com aulas previstas calculadas corretamente
    if (generalReportData && Array.isArray(generalReportData) && generalReportData.length > 0) {
      return generalReportData;
    }
    
    // Fallback: gerar localmente se não houver dados do backend
    if (attendanceList.length === 0) return [];

    const reportMap: { [key: string]: AttendanceReport } = {};

    attendanceList.forEach((record: AttendanceRecord) => {
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

  // Relatório calculado (gerado mas não exibido nesta página — ver TeacherFrequencyReport)
  generateReport();

  // Teacher ponto link helpers
  async function loadTeacherPontoLink() {
    setLoadingPontoLink(true);
    try {
      const r = await api.get('/teacher-ponto/teacher-ponto-link');
      setTeacherPontoLink(r.data);
      setPontoSettings({
        requireGeolocation: r.data.requireGeolocation || false,
        latitude: r.data.latitude ?? '',
        longitude: r.data.longitude ?? '',
        areaM2: String(r.data.areaM2 || 1000),
        requirePhoto: r.data.requirePhoto || false,
        graceMinutes: String(r.data.graceMinutes ?? 10),
        activeTimetableId: r.data.activeTimetableId || '',
      });
    } catch {
      toast.error('Erro ao carregar link de ponto de professores.');
    } finally {
      setLoadingPontoLink(false);
    }
  }

  async function saveTeacherPontoSettings() {
    setSavingPontoSettings(true);
    try {
      const r = await api.put('/teacher-ponto/teacher-ponto-link/settings', {
        requireGeolocation: pontoSettings.requireGeolocation,
        latitude: pontoSettings.latitude !== '' ? parseFloat(pontoSettings.latitude as string) : undefined,
        longitude: pontoSettings.longitude !== '' ? parseFloat(pontoSettings.longitude as string) : undefined,
        areaM2: parseInt(pontoSettings.areaM2 as string) || 1000,
        requirePhoto: pontoSettings.requirePhoto,
        graceMinutes: parseInt(pontoSettings.graceMinutes as string) || 10,
        activeTimetableId: pontoSettings.activeTimetableId || '',
      });
      setTeacherPontoLink(r.data);
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSavingPontoSettings(false);
    }
  }

  function copyTeacherPontoLink() {
    if (!teacherPontoLink?.token) return;
    const url = `${window.location.origin}${window.location.pathname}#/ponto-teacher/${teacherPontoLink.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setPontoLinkCopied(true);
      setTimeout(() => setPontoLinkCopied(false), 2000);
    });
  }

  const [togglingPonto, setTogglingPonto] = useState(false);
  const [showPontoReport, setShowPontoReport] = useState(false);

  async function togglePontoEnabled() {
    setTogglingPonto(true);
    try {
      const r = await api.put('/teacher-ponto/teacher-ponto-link/toggle');
      setTeacherPontoLink(r.data);
      toast.success(r.data.isEnabled ? '✅ Ponto eletrônico ATIVADO' : '🔴 Ponto eletrônico DESATIVADO');
    } catch {
      toast.error('Erro ao alterar estado do ponto eletrônico.');
    } finally {
      setTogglingPonto(false);
    }
  }

  const teacherPontoUrl = teacherPontoLink?.token
    ? `${window.location.origin}${window.location.pathname}#/ponto-teacher/${teacherPontoLink.token}`
    : '';

  // Abrir modal de seleção de impressão

  // Confirmar e imprimir

  // Exportar para CSV

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

      {/* Link de Ponto do Professor */}
      <div className="card no-print border border-green-200">
        <button
          onClick={() => {
            setShowPontoLinkSection(v => {
              const next = !v;
              if (next && !teacherPontoLink) loadTeacherPontoLink();
              return next;
            });
          }}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Link2 className="text-green-600" size={20} />
            <span className="text-lg font-bold text-gray-800">🔗 Ponto Eletrônico de Professor</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">por aula</span>
            {teacherPontoLink && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                teacherPontoLink.isEnabled !== false
                  ? 'bg-green-500 text-white'
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                <Power size={10} />
                {teacherPontoLink.isEnabled !== false ? 'ATIVO' : 'DESATIVADO'}
              </span>
            )}
          </div>
          {showPontoLinkSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {showPontoLinkSection && (
          <div className="mt-4 space-y-4">
            {loadingPontoLink ? (
              <div className="flex items-center gap-2 text-gray-500"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />Carregando...</div>
            ) : !teacherPontoLink ? (
              <button onClick={loadTeacherPontoLink} className="btn btn-primary text-sm">Gerar link de ponto</button>
            ) : (
              <>
                {/* ── TOGGLE LIGAR/DESLIGAR ───────────────────────────── */}
                <div className={`flex items-center justify-between rounded-xl p-4 border-2 ${
                  teacherPontoLink.isEnabled !== false
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div>
                    <p className="font-bold text-gray-800 flex items-center gap-2">
                      <Power size={16} className={teacherPontoLink.isEnabled !== false ? 'text-green-600' : 'text-red-500'} />
                      Ponto Eletrônico
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {teacherPontoLink.isEnabled !== false
                        ? 'Professores podem registrar presença pelo link. O sistema contabiliza automaticamente.'
                        : 'Desativado. Professores não podem registrar. O controle manual continua funcionando normalmente.'}
                    </p>
                  </div>
                  <button
                    onClick={togglePontoEnabled}
                    disabled={togglingPonto}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-60 ${
                      teacherPontoLink.isEnabled !== false
                        ? 'bg-green-600 hover:bg-red-600 text-white'
                        : 'bg-red-500 hover:bg-green-600 text-white'
                    }`}
                    title={teacherPontoLink.isEnabled !== false ? 'Clique para DESATIVAR' : 'Clique para ATIVAR'}
                  >
                    {togglingPonto ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : teacherPontoLink.isEnabled !== false ? (
                      <><ToggleRight size={20} /> Desativar</>
                    ) : (
                      <><ToggleLeft size={20} /> Ativar</>
                    )}
                  </button>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">🌐 Link público para professores</label>
                  <div className="flex gap-2 items-center">
                    <input
                      readOnly
                      value={teacherPontoUrl}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 font-mono truncate"
                    />
                    <button
                      onClick={copyTeacherPontoLink}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${pontoLinkCopied ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                      <Copy size={14} /> {pontoLinkCopied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <a href={teacherPontoUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      Abrir
                    </a>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Compartilhe com os professores. Podem salvar como atalho no celular (Add to Home Screen).</p>
                </div>

                {/* Botão relatório de ponto */}
                <button
                  onClick={() => setShowPontoReport(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  <BarChart2 size={16} />
                  {showPontoReport ? 'Ocultar' : 'Ver'} Relatório de Ponto Eletrônico
                </button>

                {/* ── RELATÓRIO DE PONTO ─────────────────────────────── */}
                {showPontoReport && (
                  <PontoReport date={selectedDate} attendanceList={attendanceList} schoolData={schoolData} />
                )}

                {/* Settings */}
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-1"><Settings size={14} /> Configurações</p>

                  {/* Geo */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={pontoSettings.requireGeolocation}
                        onChange={e => setPontoSettings(s => ({ ...s, requireGeolocation: e.target.checked }))}
                        className="rounded" />
                      <span className="text-sm font-medium text-gray-700">📍 Exigir geolocalização</span>
                    </label>
                    {pontoSettings.requireGeolocation && (
                      <div className="ml-6 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Latitude</label>
                          <input type="number" step="0.000001" value={pontoSettings.latitude}
                            onChange={e => setPontoSettings(s => ({ ...s, latitude: e.target.value }))}
                            placeholder="-3.7172"
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-green-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Longitude</label>
                          <input type="number" step="0.000001" value={pontoSettings.longitude}
                            onChange={e => setPontoSettings(s => ({ ...s, longitude: e.target.value }))}
                            placeholder="-38.5433"
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-green-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Área (m²)</label>
                          <input type="number" min="100" value={pontoSettings.areaM2}
                            onChange={e => setPontoSettings(s => ({ ...s, areaM2: e.target.value }))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-green-400 focus:outline-none" />
                          <p className="text-xs text-gray-400 mt-0.5">Raio ≈ {Math.round(Math.sqrt(parseInt(pontoSettings.areaM2 as string || '1000') / Math.PI))}m</p>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              if (!navigator.geolocation) return;
                              navigator.geolocation.getCurrentPosition(p => {
                                setPontoSettings(s => ({
                                  ...s,
                                  latitude: String(p.coords.latitude),
                                  longitude: String(p.coords.longitude),
                                }));
                                toast.success('Coordenadas capturadas!');
                              }, () => toast.error('Não foi possível obter localização.'));
                            }}
                            className="w-full text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-2 py-1.5 hover:bg-blue-100"
                          >
                            📍 Minha localização
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Photo */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={pontoSettings.requirePhoto}
                      onChange={e => setPontoSettings(s => ({ ...s, requirePhoto: e.target.checked }))}
                      className="rounded" />
                    <span className="text-sm font-medium text-gray-700">📸 Exigir foto ao vivo</span>
                  </label>

                  {/* Tolerância */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 flex-shrink-0">⏱️ Tolerância de entrada (minutos)</label>
                    <input type="number" min="0" max="60" value={pontoSettings.graceMinutes}
                      onChange={e => setPontoSettings(s => ({ ...s, graceMinutes: e.target.value }))}
                      className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-green-400 focus:outline-none" />
                    <span className="text-xs text-gray-400">Após o término da aula</span>
                  </div>

                  {/* Horário de referência para o ponto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📋 Horário de aulas para o ponto eletrônico
                    </label>
                    <select
                      value={pontoSettings.activeTimetableId}
                      onChange={e => setPontoSettings(s => ({ ...s, activeTimetableId: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none bg-white"
                    >
                      <option value="">🤖 Automático (todos os horários)</option>
                      {availableTimetables.map((t: any) => (
                        <option key={t.scheduleId} value={t.scheduleId}>{t.title}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Selecione qual horário de aulas define as aulas do ponto eletrônico dos professores (ex: Horário 030).
                    </p>
                  </div>

                  <button
                    onClick={saveTeacherPontoSettings}
                    disabled={savingPontoSettings}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    {savingPontoSettings ? <><RefreshCw size={14} className="animate-spin" /> Salvando...</> : 'Salvar configurações'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
        </button>

        {showPontoLinkSection && (
          <div className="mt-4 space-y-4">
            {loadingPontoLink ? (
              <div className="flex items-center gap-2 text-gray-500"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />Carregando...</div>
            ) : !teacherPontoLink ? (
              <button onClick={loadTeacherPontoLink} className="btn btn-primary text-sm">Gerar link de ponto</button>
            ) : null}
          </div>
        )}
      </div>

      {/* Seção de Registro Diário */}
      <div className="card no-print print-teacher-cards">{/* Nota: print-teacher-cards controla se os cards dos professores serão impressos */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="text-blue-600" />
          📝 Registro de Frequência Diária
        </h2>

        <div className={`mb-6 grid grid-cols-1 ${isSaturday ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
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
              {isSaturday && (
                <span className="ml-1 text-amber-600 font-semibold">— Sábado Letivo</span>
              )}
            </p>
          </div>

          {isSaturday && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📆 Dia da Semana Correspondente
              </label>
              <select
                value={saturdayWeekday}
                onChange={(e) => setSaturdayWeekday(e.target.value)}
                className={`input w-full ${!saturdayWeekday ? 'border-amber-400 ring-1 ring-amber-300' : 'border-green-400'}`}
              >
                <option value="">Selecione o dia da semana...</option>
                <option value="monday">Segunda-feira</option>
                <option value="tuesday">Terça-feira</option>
                <option value="wednesday">Quarta-feira</option>
                <option value="thursday">Quinta-feira</option>
                <option value="friday">Sexta-feira</option>
              </select>
              <p className="text-xs text-amber-600 mt-1">
                Selecione qual dia da semana este sábado letivo segue
              </p>
            </div>
          )}

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

        {/* Alerta de sábado letivo */}
        {isSaturday && !saturdayWeekday && (
          <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm text-amber-800 font-semibold">
                  📆 Sábado Letivo Detectado
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Selecione o dia da semana correspondente a este sábado letivo para carregar a grade de horários correta.
                </p>
              </div>
            </div>
          </div>
        )}

        {isSaturday && saturdayWeekday && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <p className="text-sm text-green-800">
              📆 <strong>Sábado Letivo</strong> — Usando grade de horários de <strong>
                {{ monday: 'Segunda-feira', tuesday: 'Terça-feira', wednesday: 'Quarta-feira', thursday: 'Quinta-feira', friday: 'Sexta-feira' }[saturdayWeekday]}
              </strong>
            </p>
          </div>
        )}

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

        {/* Campo de busca por professor */}
        {mergedData.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Buscar professor por nome..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-1">
                Mostrando {displayTeachers.length} de {mergedData.length} professor(es)
              </p>
            )}
          </div>
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
          ) : displayTeachers.length === 0 ? (
            <div className="text-center p-8 bg-yellow-50 rounded-lg border-2 border-dashed border-yellow-300">
              <Search className="mx-auto text-yellow-400 mb-3" size={48} />
              <p className="text-yellow-700 font-semibold mb-2">Nenhum professor encontrado para "{searchQuery}"</p>
              <p className="text-sm text-yellow-600">Tente outro termo de busca</p>
            </div>
          ) : (
            displayTeachers.map((teacher: AttendanceRecord) => {
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
                            
                            {/* Pagamento - apenas para aulas ausentes */}
                            {cls.status === 'absent' && (
                              cls.paidAt ? (
                                <div className="w-full mt-2 px-2 py-1.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center justify-center gap-1 border border-green-300">
                                  <DollarSign size={12} />
                                  Pago em {new Date(cls.paidAt).toLocaleDateString('pt-BR')}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenPaymentModalForClass(teacher, cls)}
                                  className="w-full mt-2 px-2 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded text-xs font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1"
                                >
                                  <DollarSign size={12} />
                                  Registrar Pagamento
                                </button>
                              )
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


      {/* Estilos de impressão (já definidos no topo, removendo duplicata) */}
    </div>
  );
}