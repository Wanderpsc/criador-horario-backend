import { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  subjects?: string[];
}

interface AttendanceRecord {
  _id?: string;
  teacherId: string;
  teacherName: string;
  date: string;
  status: 'present' | 'absent';
  scheduledClasses: number;
  givenClasses: number;
  timestamp: string;
}

interface AttendanceReport {
  teacherId: string;
  teacherName: string;
  totalScheduledClasses: number;
  totalGivenClasses: number;
  totalAbsences: number;
  attendanceRate: number;
  deficit: number;
  surplus: number;
  workload: number; // horas semanais
}

export default function TeacherAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: AttendanceRecord }>({});
  const queryClient = useQueryClient();

  // Buscar professores
  const { data: teachersData, isLoading: loadingTeachers, error: teachersError } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await api.get('/teachers');
      return response.data;
    }
  });

  // Buscar horário base para o dia
  const { data: timetableData } = useQuery({
    queryKey: ['timetable-for-attendance', selectedDate],
    queryFn: async () => {
      const response = await api.get('/timetables');
      return response.data;
    }
  });

  // Buscar registros de frequência
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

  const teachers: Teacher[] = teachersData || [];

  // Carregar registros existentes quando a data mudar
  useEffect(() => {
    if (attendanceRecords && Array.isArray(attendanceRecords)) {
      const recordsMap: { [key: string]: AttendanceRecord } = {};
      
      attendanceRecords.forEach((record: AttendanceRecord) => {
        if (record.date === selectedDate) {
          recordsMap[record.teacherId] = record;
        }
      });
      
      setAttendanceData(recordsMap);
      console.log('📋 Registros carregados para', selectedDate, ':', Object.keys(recordsMap).length, 'professor(es)');
    }
  }, [attendanceRecords, selectedDate]);

  // Loading state - APÓS todos os hooks
  if (loadingTeachers) {
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
  if (teachersError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-red-800">Erro ao carregar dados</h2>
          </div>
          <p className="text-red-700 mb-4">
            Não foi possível carregar os dados dos professores. Verifique sua conexão ou tente novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  // Calcular classes agendadas para cada professor no dia
  const getScheduledClasses = (teacherId: string) => {
    if (!timetableData || timetableData.length === 0) return 0;
    
    const dayOfWeek = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayMap: { [key: string]: string } = {
      'segunda-feira': 'Segunda',
      'terça-feira': 'Terça',
      'quarta-feira': 'Quarta',
      'quinta-feira': 'Quinta',
      'sexta-feira': 'Sexta',
      'sábado': 'Sábado'
    };
    
    const targetDay = dayMap[dayOfWeek.toLowerCase()];
    let count = 0;
    
    timetableData.forEach((timetable: any) => {
      if (timetable.slots) {
        timetable.slots.forEach((slot: any) => {
          if (slot.teacherId === teacherId && slot.day === targetDay) {
            count++;
          }
        });
      }
    });
    
    return count;
  };

  // Marcar presença
  const handleAttendanceChange = (teacherId: string, status: 'present' | 'absent') => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const scheduledClasses = getScheduledClasses(teacherId);
    const givenClasses = status === 'present' ? scheduledClasses : 0;

    setAttendanceData(prev => ({
      ...prev,
      [teacherId]: {
        teacherId,
        teacherName: teacher.name,
        date: selectedDate,
        status,
        scheduledClasses,
        givenClasses,
        timestamp: new Date().toISOString()
      }
    }));
  };

  // Limpar marcação (excluir registro)
  const handleClearAttendance = async (teacherId: string) => {
    try {
      // Remover do estado local
      setAttendanceData(prev => {
        const newData = { ...prev };
        delete newData[teacherId];
        return newData;
      });

      // Se já foi salvo no banco, deletar
      const existingRecord = attendanceRecords?.find(
        (r: AttendanceRecord) => r.teacherId === teacherId && r.date === selectedDate
      );

      if (existingRecord) {
        console.log('🗑️ Deletando registro:', { teacherId, date: selectedDate });
        await api.delete(`/teacher-attendance/teacher/${teacherId}/date/${selectedDate}`);
        
        toast.success('🗑️ Registro de frequência removido');
        queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
        refetchAttendance();
      } else {
        toast.success('✨ Marcação limpa');
      }
    } catch (error: any) {
      console.error('Erro ao limpar frequência:', error);
      toast.error('Erro ao limpar registro: ' + (error.response?.data?.message || error.message));
    }
  };

  // Salvar frequência do dia
  const handleSaveAttendance = async () => {
    try {
      const records = Object.values(attendanceData);
      
      if (records.length === 0) {
        toast.error('Marque a presença de pelo menos um professor');
        return;
      }

      await api.post('/teacher-attendance/bulk', { records, date: selectedDate });
      
      toast.success(`✅ Frequência de ${records.length} professor(es) salva!`);
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      refetchAttendance();
      setAttendanceData({});
    } catch (error: any) {
      console.error('Erro ao salvar frequência:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar frequência');
    }
  };

  // Gerar relatório
  const generateReport = (): AttendanceReport[] => {
    if (!attendanceRecords || attendanceRecords.length === 0) return [];

    const reportMap: { [key: string]: AttendanceReport } = {};

    attendanceRecords.forEach((record: AttendanceRecord) => {
      if (!reportMap[record.teacherId]) {
        reportMap[record.teacherId] = {
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          totalScheduledClasses: 0,
          totalGivenClasses: 0,
          totalAbsences: 0,
          attendanceRate: 0,
          deficit: 0,
          surplus: 0,
          workload: 0
        };
      }

      reportMap[record.teacherId].totalScheduledClasses += record.scheduledClasses;
      reportMap[record.teacherId].totalGivenClasses += record.givenClasses;
      
      if (record.status === 'absent') {
        reportMap[record.teacherId].totalAbsences++;
      }
    });

    // Calcular métricas
    Object.keys(reportMap).forEach(teacherId => {
      const report = reportMap[teacherId];
      report.attendanceRate = report.totalScheduledClasses > 0 
        ? (report.totalGivenClasses / report.totalScheduledClasses) * 100 
        : 0;
      report.deficit = report.totalScheduledClasses - report.totalGivenClasses;
      report.surplus = report.totalGivenClasses - report.totalScheduledClasses;
      report.workload = report.totalGivenClasses * 0.833; // média 50min por aula
    });

    return Object.values(reportMap);
  };

  const report = generateReport();

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

    const headers = ['Professor', 'Aulas Previstas', 'Aulas Dadas', 'Faltas', 'Taxa de Presença (%)', 'Déficit', 'Saldo', 'Carga Horária (h)'];
    const rows = report.map(r => [
      r.teacherName,
      r.totalScheduledClasses,
      r.totalGivenClasses,
      r.totalAbsences,
      r.attendanceRate.toFixed(1),
      r.deficit > 0 ? r.deficit : 0,
      r.surplus > 0 ? r.surplus : 0,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 p-6 rounded-lg no-print">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-900">
          <CheckCircle className="text-blue-600" size={32} />
          Controle de Frequência dos Professores
        </h1>
        <p className="text-blue-700 mt-2">
          Registre a presença diária e acompanhe relatórios de frequência e carga horária
        </p>
      </div>

      {/* Seção de Registro Diário */}
      <div className="card no-print">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="text-blue-600" />
          📝 Registro de Frequência Diária
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 Data do Registro
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input max-w-xs"
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

        {/* Lista de Professores */}
        <div className="space-y-3 mb-6">
          <h3 className="font-bold text-lg text-gray-800 mb-3">👥 Professores</h3>
          
          {teachers.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">Nenhum professor cadastrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teachers.map((teacher) => {
                const scheduledClasses = getScheduledClasses(teacher.id);
                const attendance = attendanceData[teacher.id];
                
                return (
                  <div
                    key={teacher.id}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      attendance?.status === 'present'
                        ? 'bg-green-50 border-green-400'
                        : attendance?.status === 'absent'
                        ? 'bg-red-50 border-red-400'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{teacher.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {scheduledClasses} aula(s) prevista(s)
                        </p>
                      </div>
                      <User className="text-gray-400" size={20} />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAttendanceChange(teacher.id, 'present')}
                        className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                          attendance?.status === 'present'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                        }`}
                      >
                        <CheckCircle size={16} className="inline mr-1" />
                        Presente
                      </button>
                      <button
                        onClick={() => handleAttendanceChange(teacher.id, 'absent')}
                        className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                          attendance?.status === 'absent'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                        }`}
                      >
                        <XCircle size={16} className="inline mr-1" />
                        Ausente
                      </button>
                      <button
                        onClick={() => handleClearAttendance(teacher.id)}
                        className="px-3 py-2 rounded-md font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        title="Limpar marcação"
                      >
                        <Eraser size={16} className="inline" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botão Salvar */}
        <button
          onClick={handleSaveAttendance}
          disabled={Object.keys(attendanceData).length === 0}
          className="btn btn-primary w-full md:w-auto flex items-center gap-2"
        >
          <FileText size={20} />
          💾 Salvar Frequência do Dia ({Object.keys(attendanceData).length} registro(s))
        </button>
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
                    <th className="border border-gray-300 p-3 text-center font-bold">Déficit</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Saldo</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Carga Horária (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((r, index) => (
                    <tr key={r.teacherId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border border-gray-300 p-3 font-semibold">{r.teacherName}</td>
                      <td className="border border-gray-300 p-3 text-center">{r.totalScheduledClasses}</td>
                      <td className="border border-gray-300 p-3 text-center font-bold text-green-700">
                        {r.totalGivenClasses}
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-bold text-red-700">
                        {r.totalAbsences}
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
                      <td className="border border-gray-300 p-3 text-center">
                        {r.deficit > 0 ? (
                          <span className="font-bold text-red-600">-{r.deficit}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        {r.surplus > 0 ? (
                          <span className="font-bold text-green-600">+{r.surplus}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
                      {report.reduce((sum, r) => sum + r.totalGivenClasses, 0)}
                    </td>
                    <td className="border border-gray-300 p-3 text-center text-red-700">
                      {report.reduce((sum, r) => sum + r.totalAbsences, 0)}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      {report.length > 0
                        ? ((report.reduce((sum, r) => sum + r.attendanceRate, 0) / report.length).toFixed(1))
                        : '0.0'}%
                    </td>
                    <td className="border border-gray-300 p-3 text-center text-red-600">
                      -{report.reduce((sum, r) => sum + (r.deficit > 0 ? r.deficit : 0), 0)}
                    </td>
                    <td className="border border-gray-300 p-3 text-center text-green-600">
                      +{report.reduce((sum, r) => sum + (r.surplus > 0 ? r.surplus : 0), 0)}
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
                      {report.reduce((sum, r) => sum + r.totalGivenClasses, 0)}
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
                      {report.reduce((sum, r) => sum + r.totalAbsences, 0)}
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
