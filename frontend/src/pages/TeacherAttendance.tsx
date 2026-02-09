import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/axios';
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
  ChevronDown
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

export default function TeacherAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('auto');
  const queryClient = useQueryClient();

  // Buscar horários disponíveis
  const { data: timetablesData } = useQuery({
    queryKey: ['generated-timetables'],
    queryFn: async () => {
      const response = await api.get('/generated-timetables');
      return response.data || [];
    }
  });

  const availableTimetables = Array.isArray(timetablesData) ? timetablesData : [];

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
      await api.put('/teacher-attendance/class-status', {
        teacherId,
        date: selectedDate,
        period,
        status
      });

      toast.success(`✅ Aula marcada como ${status === 'present' ? 'presente' : 'ausente'}`);
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      refetchAttendance();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status da aula');
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

  // Gerar relatório por professor
  const generateReport = (): AttendanceReport[] => {
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

  // Gerar relatório de déficit por disciplina/turma
  const generateSubjectDeficitReport = (): SubjectDeficit[] => {
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

  // Imprimir relatório
  const handlePrint = () => {
    window.print();
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
      <div className="card no-print">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {teacher.classes.map((cls, index) => (
                          <div
                            key={`${cls.period}-${index}`}
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
                          </div>
                        ))}
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
            onClick={handlePrint}
            className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <Printer size={20} />
            Imprimir
          </button>
          <button
            onClick={handleExportCSV}
            className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Download size={20} />
            Exportar CSV
          </button>
        </div>

        {/* Tabela de Relatório */}
        {report.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded-lg">
            <FileText className="mx-auto text-gray-400 mb-4" size={64} />
            <p className="text-gray-600 text-lg">Nenhum registro de frequência encontrado</p>
            <p className="text-sm text-gray-500 mt-2">
              Registre a frequência dos professores para visualizar o relatório
            </p>
          </div>
        ) : (
          <>
            {/* Cabeçalho do Relatório para Impressão */}
            <div className="only-print mb-6">
              <h2 className="text-2xl font-bold text-center mb-2">
                Relatório de Frequência dos Professores
              </h2>
              <p className="text-center text-gray-600">
                Período: {reportType === 'daily' ? selectedDate : `${startDate} a ${endDate}`}
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
                  {report.map((r, index) => (
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
                  ))}
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

            {/* Tabela de Déficit por Disciplina/Turma */}
            {subjectDeficitReport.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="text-orange-600" size={24} />
                  📊 Déficit/Saldo por Disciplina e Turma
                </h3>
                <p className="text-sm text-gray-600 mb-4">
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
                      {subjectDeficitReport.map((item, index) => (
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
                      ))}
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
            )}
          </>
        )}
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .only-print {
            display: block !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          @page {
            margin: 1.5cm;
            size: A4 landscape;
          }
        }
        
        .only-print {
          display: none;
        }
      `}</style>
    </div>
  );
}
