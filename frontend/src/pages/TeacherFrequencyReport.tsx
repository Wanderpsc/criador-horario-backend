import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Printer, 
  TrendingDown, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

interface SubjectClassDetail {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  predictedClasses: number;
  givenClasses: number;
  deficit: number;
  surplus: number;
}

interface TeacherReport {
  teacherId: string;
  teacherName: string;
  weeklyWorkload: number;
  totalPredictedClasses: number;
  totalGivenClasses: number;
  totalDeficit: number;
  totalSurplus: number;
  subjectClassDetails: SubjectClassDetail[];
}

interface ReportData {
  month: number;
  year: number;
  totalTeachers: number;
  reports: TeacherReport[];
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
    annualHours: number;
    monthlyHours: number;
    dailyHours: number;
  }[];
  totalWeeklyHours: number;
  totalAnnualHours: number;
  totalMonthlyHours: number;
}

const TeacherFrequencyReport: React.FC = () => {
  const { user } = useAuthStore();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'teacher' | 'subject' | 'class'>('teacher');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [timetableData, setTimetableData] = useState<any>(null);
  const [teacherWorkload, setTeacherWorkload] = useState<TeacherSubjectWorkload[]>([]);
  const [workloadPeriod, setWorkloadPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'annual'>('all');

  useEffect(() => {
    loadReport();
  }, [month, year]);

  useEffect(() => {
    loadCalendarAndTimetable();
  }, [user?.schoolId, user?.id]);

  // Recalcular workload quando mês/ano ou dados auxiliares mudam
  useEffect(() => {
    if (timetableData && calendarEvents.length > 0 && user?.id) {
      loadTeacherWorkload(calendarEvents, timetableData);
    }
  }, [month, year, timetableData, calendarEvents]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teacher-frequency-report/deficit-surplus', {
        params: { month, year }
      });
      setReportData(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarAndTimetable = async () => {
    try {
      let calData: any[] = [];
      let ttData: any = null;

      // Buscar calendário escolar
      if (user?.schoolId) {
        const calRes = await api.get(`/schooldays/school/${user.schoolId}`);
        calData = Array.isArray(calRes.data) ? calRes.data : calRes.data?.data || [];
        setCalendarEvents(calData);
      }

      // Buscar horário padrão
      const ttRes = await api.get('/generated-timetables');
      const timetables = ttRes.data || [];
      if (timetables.length > 0) {
        const defaultTt = timetables.find((t: any) => t.isDefault) || timetables[0];
        const scheduleId = defaultTt.scheduleId || defaultTt.id || defaultTt._id;
        console.log('📋 Horário base selecionado:', { scheduleId, name: defaultTt.name });
        if (scheduleId) {
          const detailRes = await api.get(`/generated-timetables/${scheduleId}`);
          ttData = detailRes.data;
          setTimetableData(ttData);
          console.log('📋 Dados do horário:', { keys: Object.keys(ttData || {}), hasData: !!ttData?.data });
        }
      }

      // Carregar workload com os dados locais (não depende do state)
      if (user?.id && calData.length > 0 && ttData) {
        await loadTeacherWorkload(calData, ttData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados auxiliares:', error);
    }
  };

  const loadTeacherWorkload = async (calEvents: any[], ttResp: any) => {
    try {
      if (!user?.id) return;
      const [assocRes, teachersRes, subjectsRes, classesRes] = await Promise.all([
        api.get(`/teacher-subjects/${user.id}`),
        api.get(`/teachers/user/${user.id}`),
        api.get(`/subjects/user/${user.id}`),
        api.get('/classes')
      ]);

      const associations = assocRes.data.data || [];
      const teachers = teachersRes.data.data || [];
      const subjects = subjectsRes.data.data || [];
      const classes = classesRes.data.data || [];

      // Extrair todos os slots do horário base selecionado
      // A API retorna { success: true, data: { classId: [slots] } }
      // Cada slot tem: { day, period, teacherId, subjectId, classId }
      const allSlots: Array<{ day: string; teacherId: string; subjectId: string; classId: string }> = [];
      
      // Tentar múltiplas formas de acessar os dados do horário
      const scheduleData = ttResp?.data || ttResp?.schedule || ttResp;
      console.log('📊 scheduleData keys:', scheduleData ? Object.keys(scheduleData) : 'null');
      
      if (scheduleData && typeof scheduleData === 'object') {
        Object.entries(scheduleData).forEach(([key, classSlots]: [string, any]) => {
          // Ignorar campos de controle da resposta da API
          if (['success', 'message', 'data', 'schedule', '_id', '__v', 'createdAt', 'updatedAt', 'name', 'schoolId', 'userId', 'isDefault', 'scheduleId'].includes(key)) return;
          if (Array.isArray(classSlots)) {
            classSlots.forEach((slot: any) => {
              if (slot && slot.teacherId) {
                allSlots.push({
                  day: slot.day,
                  teacherId: slot.teacherId,
                  subjectId: slot.subjectId || '',
                  classId: slot.classId || key
                });
              }
            });
          }
        });
      }
      
      // Se não encontrou slots no nível raiz, tentar dentro de .data
      if (allSlots.length === 0 && scheduleData?.data && typeof scheduleData.data === 'object') {
        Object.entries(scheduleData.data).forEach(([key, classSlots]: [string, any]) => {
          if (['success', 'message'].includes(key)) return;
          if (Array.isArray(classSlots)) {
            classSlots.forEach((slot: any) => {
              if (slot && slot.teacherId) {
                allSlots.push({
                  day: slot.day,
                  teacherId: slot.teacherId,
                  subjectId: slot.subjectId || '',
                  classId: slot.classId || key
                });
              }
            });
          }
        });
      }
      
      console.log('📊 Total de slots extraídos do horário:', allSlots.length);
      if (allSlots.length > 0) {
        console.log('📊 Exemplo de slot:', allSlots[0]);
      }

      // Mapeamento de followWeekday para nome do dia no horário
      const followWeekdayToDay: Record<string, string> = {
        'monday': 'Segunda', 'tuesday': 'Terça', 'wednesday': 'Quarta',
        'thursday': 'Quinta', 'friday': 'Sexta'
      };
      // Mapeamento de day-of-week (getDay) para nome do dia no horário
      const dowToDay: Record<number, string> = {
        1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 0: 'Domingo'
      };

      // Contar dias letivos do mês selecionado por dia da semana (nome do dia no horário)
      const schoolDaysByDayName: Record<string, number> = {};
      calEvents.forEach((ev: any) => {
        if (ev.dayType !== 'regular' && ev.dayType !== 'saturday') return;
        const d = new Date(typeof ev.date === 'string' ? ev.date + 'T12:00:00' : ev.date);
        if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return;
        // Sábado letivo segue o dia de referência (followWeekday)
        let dayName: string;
        if (ev.dayType === 'saturday' && ev.followWeekday) {
          dayName = followWeekdayToDay[ev.followWeekday] || dowToDay[d.getDay()] || '';
        } else {
          dayName = dowToDay[d.getDay()] || '';
        }
        if (dayName) {
          schoolDaysByDayName[dayName] = (schoolDaysByDayName[dayName] || 0) + 1;
        }
      });

      const teacherMap = new Map<string, TeacherSubjectWorkload>();

      associations.forEach((assoc: any) => {
        const teacher = teachers.find((t: any) => t.id === assoc.teacherId || t._id === assoc.teacherId);
        const subject = subjects.find((s: any) => s.id === assoc.subjectId || s._id === assoc.subjectId);
        const classItem = classes.find((c: any) => c.id === assoc.classId || c._id === assoc.classId);

        if (!teacher || !subject) return;

        const teacherId = teacher.id || teacher._id;
        const teacherName = teacher.name;
        const subjectId = subject.id || subject._id;
        const classId = classItem ? (classItem.id || classItem._id) : undefined;

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

        // Contar aulas SEMANAIS do horário base para esta combinação professor-disciplina-turma
        const teacherSlots = allSlots.filter(s =>
          s.teacherId === teacherId &&
          s.subjectId === subjectId &&
          (classId ? s.classId === classId : true)
        );
        const weeklyHours = teacherSlots.length;

        // Carga horária ANUAL: weeklyHours × 40 semanas letivas
        // Regra: 1 aula/semana = 40, 2 = 80, 3 = 120, 4 = 160, 5 = 200
        // Se não houver slots no horário, usa o campo da disciplina como fallback
        const annualHours = weeklyHours > 0
          ? weeklyHours * 40
          : Math.round(subject.workload || subject.workloadHours || subject.hours || 0);

        // Contar aulas por dia da semana (para cálculo diário e mensal)
        const slotsPerDay: Record<string, number> = {};
        teacherSlots.forEach(s => {
          slotsPerDay[s.day] = (slotsPerDay[s.day] || 0) + 1;
        });

        // DIÁRIA: média de aulas nos dias em que leciona (arredondada para inteiro)
        const daysWithClasses = Object.keys(slotsPerDay).length;
        const dailyHours = daysWithClasses > 0 ? Math.round(weeklyHours / daysWithClasses) : 0;

        // MENSAL: para cada dia da semana com aula, multiplicar pelo nº de dias letivos desse dia no mês
        let monthlyHours = 0;
        Object.entries(slotsPerDay).forEach(([dayName, count]) => {
          monthlyHours += count * (schoolDaysByDayName[dayName] || 0);
        });

        workload.subjects.push({
          subjectId,
          subjectName: subject.name,
          classId,
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

      setTeacherWorkload(
        Array.from(teacherMap.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'pt-BR'))
      );
    } catch (error) {
      console.error('Erro ao buscar cargas horárias:', error);
    }
  };

  // Recarregar workload quando parâmetros mudam (mês, ano, horário, calendário)
  useEffect(() => {
    if (user?.id) {
      loadTeacherWorkload();
    }
  }, [month, year, timetableData, calendarEvents]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!filteredReports || filteredReports.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Professor', 'Carga Horária Semanal', 'Aulas Previstas', 'Aulas Dadas', 'Déficit', 'Saldo'];
    const rows = filteredReports.map(r => [
      r.teacherName,
      r.weeklyWorkload,
      r.totalPredictedClasses,
      r.totalGivenClasses,
      r.totalDeficit,
      r.totalSurplus
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_frequencia_${monthNames[month - 1]}_${year}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso!');
  };

  // Filtrar dados
  const filteredReports = reportData?.reports.filter(report => {
    const teacherMatch = !filterTeacher || report.teacherName.toLowerCase().includes(filterTeacher.toLowerCase());
    const subjectMatch = !filterSubject || report.subjectClassDetails.some(
      detail => detail.subjectName.toLowerCase().includes(filterSubject.toLowerCase())
    );
    const classMatch = !filterClass || report.subjectClassDetails.some(
      detail => detail.className.toLowerCase().includes(filterClass.toLowerCase())
    );
    return teacherMatch && subjectMatch && classMatch;
  }).sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'pt-BR')) || [];

  // Calcular estatísticas gerais
  const totalDeficit = filteredReports.reduce((sum, r) => sum + r.totalDeficit, 0);
  const totalSurplus = filteredReports.reduce((sum, r) => sum + r.totalSurplus, 0);
  const totalPredicted = filteredReports.reduce((sum, r) => sum + r.totalPredictedClasses, 0);
  const totalGiven = filteredReports.reduce((sum, r) => sum + r.totalGivenClasses, 0);

  // Agrupar por disciplina
  const groupBySubject = () => {
    const subjectMap = new Map<string, {
      subjectName: string;
      predicted: number;
      given: number;
      deficit: number;
      surplus: number;
      teachers: Set<string>;
    }>();

    filteredReports.forEach(report => {
      report.subjectClassDetails.forEach(detail => {
        const existing = subjectMap.get(detail.subjectId) || {
          subjectName: detail.subjectName,
          predicted: 0,
          given: 0,
          deficit: 0,
          surplus: 0,
          teachers: new Set()
        };

        existing.predicted += detail.predictedClasses;
        existing.given += detail.givenClasses;
        existing.deficit += detail.deficit;
        existing.surplus += detail.surplus;
        existing.teachers.add(report.teacherName);

        subjectMap.set(detail.subjectId, existing);
      });
    });

    return Array.from(subjectMap.values());
  };

  // Agrupar por turma
  const groupByClass = () => {
    const classMap = new Map<string, {
      className: string;
      predicted: number;
      given: number;
      deficit: number;
      surplus: number;
      subjects: Set<string>;
    }>();

    filteredReports.forEach(report => {
      report.subjectClassDetails.forEach(detail => {
        const existing = classMap.get(detail.classId) || {
          className: detail.className,
          predicted: 0,
          given: 0,
          deficit: 0,
          surplus: 0,
          subjects: new Set()
        };

        existing.predicted += detail.predictedClasses;
        existing.given += detail.givenClasses;
        existing.deficit += detail.deficit;
        existing.surplus += detail.surplus;
        existing.subjects.add(detail.subjectName);

        classMap.set(detail.classId, existing);
      });
    });

    return Array.from(classMap.values());
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="p-6 no-print">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Relatório de Frequência
          </h1>
          <p className="text-gray-600 mt-1">Déficits e Saldos de Aulas por Professor</p>
        </div>
        <div className="flex gap-3 no-print">
          <button
            onClick={handleExportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
            <input
              type="text"
              value={filterTeacher}
              onChange={e => setFilterTeacher(e.target.value)}
              placeholder="Buscar professor..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
            <input
              type="text"
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              placeholder="Buscar disciplina..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
            <input
              type="text"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              placeholder="Buscar turma..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Modo de visualização */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode('teacher')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'teacher'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Por Professor
          </button>
          <button
            onClick={() => setViewMode('subject')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'subject'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Por Disciplina
          </button>
          <button
            onClick={() => setViewMode('class')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'class'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <GraduationCap className="w-4 h-4 inline mr-2" />
            Por Turma
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aulas Previstas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPredicted}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aulas Dadas</p>
                  <p className="text-2xl font-bold text-green-700">{totalGiven}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Déficit Total</p>
                  <p className="text-2xl font-bold text-red-700">{totalDeficit}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Saldo Total</p>
                  <p className="text-2xl font-bold text-purple-700">{totalSurplus}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Visualização por Professor */}
          {viewMode === 'teacher' && (
            <div className="space-y-4">
              {filteredReports.map(report => (
                <div key={report.teacherId} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{report.teacherName}</h3>
                      <p className="text-sm text-gray-600">
                        Carga Horária Semanal: {report.weeklyWorkload}h
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Previsto</p>
                        <p className="text-xl font-bold text-blue-600">{report.totalPredictedClasses}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Dado</p>
                        <p className="text-xl font-bold text-green-600">{report.totalGivenClasses}</p>
                      </div>
                      {report.totalDeficit > 0 && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Déficit</p>
                          <p className="text-xl font-bold text-red-600">-{report.totalDeficit}</p>
                        </div>
                      )}
                      {report.totalSurplus > 0 && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Saldo</p>
                          <p className="text-xl font-bold text-purple-600">+{report.totalSurplus}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalhes por Disciplina/Turma */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Disciplina</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Turma</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Previsto</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Dado</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {report.subjectClassDetails.map((detail, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{detail.subjectName}</td>
                            <td className="px-4 py-2">{detail.className}</td>
                            <td className="px-4 py-2 text-center">{detail.predictedClasses}</td>
                            <td className="px-4 py-2 text-center">{detail.givenClasses}</td>
                            <td className="px-4 py-2 text-center">
                              {detail.predictedClasses > 0 ? (
                                <>
                                  {detail.deficit > 0 && (
                                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                      ❌ -{detail.deficit} aulas ({Math.round((detail.givenClasses / detail.predictedClasses) * 100)}%)
                                    </span>
                                  )}
                                  {detail.surplus > 0 && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                      ✅ +{detail.surplus} aulas ({Math.round((detail.givenClasses / detail.predictedClasses) * 100)}%)
                                    </span>
                                  )}
                                  {detail.deficit === 0 && detail.surplus === 0 && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                      ✓ 100% Em dia
                                    </span>
                                  )}
                                </>
                              ) : detail.givenClasses > 0 ? (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                  ✅ +{detail.givenClasses} aulas extras
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">Sem aulas previstas</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visualização por Disciplina */}
          {viewMode === 'subject' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Disciplina</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Professores</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Previsto</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Dado</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Déficit</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupBySubject().map((subject, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{subject.subjectName}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {subject.teachers.size}
                      </td>
                      <td className="px-6 py-4 text-center">{subject.predicted}</td>
                      <td className="px-6 py-4 text-center">{subject.given}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${subject.deficit > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {subject.deficit > 0 ? `-${subject.deficit}` : '0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${subject.surplus > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                          {subject.surplus > 0 ? `+${subject.surplus}` : '0'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Visualização por Turma */}
          {viewMode === 'class' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Turma</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Disciplinas</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Previsto</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Dado</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Déficit</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupByClass().map((classData, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{classData.className}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {classData.subjects.size}
                      </td>
                      <td className="px-6 py-4 text-center">{classData.predicted}</td>
                      <td className="px-6 py-4 text-center">{classData.given}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${classData.deficit > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {classData.deficit > 0 ? `-${classData.deficit}` : '0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${classData.surplus > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                          {classData.surplus > 0 ? `+${classData.surplus}` : '0'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredReports.length === 0 && !loading && (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Nenhum registro encontrado para este período</p>
              <p className="text-gray-500 text-sm mt-2">
                Tente selecionar outro mês ou ajustar os filtros
              </p>
            </div>
          )}
        </>
      )}

      {/* ===== RELAÇÃO GERAL DE CARGAS HORÁRIAS ===== */}
      <div className="mt-8 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-blue-300">
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
                Lotação de todos os professores por disciplina • {monthNames[month - 1]}/{year} • Dados da página de <strong>Lotação de Professores</strong>
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

          {/* Botões de Período */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'all' as const, label: 'Todos os Períodos', icon: '📊', color: 'gray' },
              { key: 'daily' as const, label: 'Diária', icon: '📅', color: 'blue' },
              { key: 'weekly' as const, label: 'Semanal', icon: '📆', color: 'indigo' },
              { key: 'monthly' as const, label: 'Mensal', icon: '🗓️', color: 'purple' },
              { key: 'annual' as const, label: 'Anual', icon: '📊', color: 'green' },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setWorkloadPeriod(btn.key)}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  workloadPeriod === btn.key
                    ? btn.color === 'gray' ? 'bg-gray-700 text-white shadow-lg'
                      : btn.color === 'blue' ? 'bg-blue-600 text-white shadow-lg'
                      : btn.color === 'indigo' ? 'bg-indigo-600 text-white shadow-lg'
                      : btn.color === 'purple' ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span>{btn.icon}</span> {btn.label}
              </button>
            ))}
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
                    <th className="border border-blue-500 p-4 text-left font-bold" rowSpan={workloadPeriod === 'all' ? 2 : 1}>
                      👨‍🏫 Professor
                    </th>
                    <th className="border border-blue-500 p-4 text-left font-bold" rowSpan={workloadPeriod === 'all' ? 2 : 1}>
                      📖 Disciplinas Lotadas
                    </th>
                    {workloadPeriod === 'all' ? (
                      <th className="border border-blue-500 p-4 text-center font-bold" colSpan={4}>
                        ⏰ Carga Horária por Período
                      </th>
                    ) : workloadPeriod === 'daily' ? (
                      <th className="border border-blue-500 p-4 text-center font-bold">
                        📅 Carga Horária Diária
                      </th>
                    ) : workloadPeriod === 'weekly' ? (
                      <th className="border border-blue-500 p-4 text-center font-bold">
                        📆 Carga Horária Semanal
                      </th>
                    ) : workloadPeriod === 'monthly' ? (
                      <th className="border border-blue-500 p-4 text-center font-bold">
                        🗓️ Carga Horária Mensal — {monthNames[month - 1]}/{year}
                      </th>
                    ) : (
                      <th className="border border-blue-500 p-4 text-center font-bold">
                        📊 Carga Horária Anual
                      </th>
                    )}
                  </tr>
                  {workloadPeriod === 'all' && (
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
                  )}
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
                      {/* Colunas de carga horária conforme período selecionado */}
                      {(workloadPeriod === 'all' || workloadPeriod === 'daily') && (
                        <td className="border border-gray-300 p-4 text-center align-top">
                          <div className="space-y-2">
                            {teacher.subjects.map((subj, subIdx) => (
                              <div 
                                key={`daily-${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                                className={`p-2 rounded ${workloadPeriod === 'daily' ? 'bg-blue-100 border border-blue-300' : 'bg-blue-50'}`}
                              >
                                <span className={`font-semibold text-blue-700 ${workloadPeriod === 'daily' ? 'text-lg' : 'text-sm'}`}>
                                  {subj.dailyHours}h
                                </span>
                              </div>
                            ))}
                          </div>
                          {workloadPeriod === 'daily' && (
                            <div className="mt-2 pt-2 border-t border-blue-300">
                              <span className="font-bold text-blue-800">
                                Total: {teacher.subjects.reduce((s, subj) => s + subj.dailyHours, 0)}h
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                      {(workloadPeriod === 'all' || workloadPeriod === 'weekly') && (
                        <td className="border border-gray-300 p-4 text-center align-top">
                          <div className="space-y-2">
                            {teacher.subjects.map((subj, subIdx) => (
                              <div 
                                key={`weekly-${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                                className={`p-2 rounded ${workloadPeriod === 'weekly' ? 'bg-indigo-100 border border-indigo-300' : 'bg-indigo-50'}`}
                              >
                                <span className={`font-semibold text-indigo-700 ${workloadPeriod === 'weekly' ? 'text-lg' : 'text-sm'}`}>
                                  {subj.weeklyHours}h
                                </span>
                              </div>
                            ))}
                          </div>
                          {workloadPeriod === 'weekly' && (
                            <div className="mt-2 pt-2 border-t border-indigo-300">
                              <span className="font-bold text-indigo-800">
                                Total: {teacher.totalWeeklyHours}h
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                      {(workloadPeriod === 'all' || workloadPeriod === 'monthly') && (
                        <td className="border border-gray-300 p-4 text-center align-top">
                          <div className="space-y-2">
                            {teacher.subjects.map((subj, subIdx) => (
                              <div 
                                key={`monthly-${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                                className={`p-2 rounded ${workloadPeriod === 'monthly' ? 'bg-purple-100 border border-purple-300' : 'bg-purple-50'}`}
                              >
                                <span className={`font-semibold text-purple-700 ${workloadPeriod === 'monthly' ? 'text-lg' : 'text-sm'}`}>
                                  {subj.monthlyHours}h
                                </span>
                              </div>
                            ))}
                          </div>
                          {workloadPeriod === 'monthly' && (
                            <div className="mt-2 pt-2 border-t border-purple-300">
                              <span className="font-bold text-purple-800">
                                Total: {teacher.totalMonthlyHours}h
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                      {(workloadPeriod === 'all' || workloadPeriod === 'annual') && (
                        <td className="border border-gray-300 p-4 text-center align-top">
                          <div className="space-y-2">
                            {teacher.subjects.map((subj, subIdx) => (
                              <div 
                                key={`annual-${subj.subjectId}-${subj.classId || 'no-class'}-${subIdx}`}
                                className={`p-2 rounded ${workloadPeriod === 'annual' ? 'bg-green-100 border border-green-300' : 'bg-green-50'}`}
                              >
                                <span className={`font-bold text-green-700 ${workloadPeriod === 'annual' ? 'text-lg' : ''}`}>
                                  {subj.annualHours}h
                                </span>
                              </div>
                            ))}
                          </div>
                          {workloadPeriod === 'annual' && (
                            <div className="mt-2 pt-2 border-t border-green-300">
                              <span className="font-bold text-green-800">
                                Total: {teacher.totalAnnualHours}h
                              </span>
                            </div>
                          )}
                        </td>
                      )}
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
                    {(workloadPeriod === 'all' || workloadPeriod === 'daily') && (
                      <td className="border border-gray-300 p-4 text-center">
                        <div className={`inline-flex items-center justify-center bg-blue-600 text-white font-bold px-4 py-2 rounded-lg ${workloadPeriod === 'daily' ? 'text-2xl px-6 py-3' : 'text-lg'}`}>
                          <Clock className="mr-2" size={workloadPeriod === 'daily' ? 24 : 20} />
                          {teacherWorkload.reduce((sum, t) => sum + t.subjects.reduce((s, subj) => s + subj.dailyHours, 0), 0)}h
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Diária</div>
                      </td>
                    )}
                    {(workloadPeriod === 'all' || workloadPeriod === 'weekly') && (
                      <td className="border border-gray-300 p-4 text-center">
                        <div className={`inline-flex items-center justify-center bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg ${workloadPeriod === 'weekly' ? 'text-2xl px-6 py-3' : 'text-xl'}`}>
                          <Clock className="mr-2" size={workloadPeriod === 'weekly' ? 24 : 22} />
                          {teacherWorkload.reduce((sum, t) => sum + t.totalWeeklyHours, 0)}h
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Semanal</div>
                      </td>
                    )}
                    {(workloadPeriod === 'all' || workloadPeriod === 'monthly') && (
                      <td className="border border-gray-300 p-4 text-center">
                        <div className={`inline-flex items-center justify-center bg-purple-600 text-white font-bold px-4 py-2 rounded-lg ${workloadPeriod === 'monthly' ? 'text-2xl px-6 py-3' : 'text-xl'}`}>
                          <Clock className="mr-2" size={workloadPeriod === 'monthly' ? 24 : 22} />
                          {teacherWorkload.reduce((sum, t) => sum + t.totalMonthlyHours, 0)}h
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Mensal ({monthNames[month - 1]})</div>
                      </td>
                    )}
                    {(workloadPeriod === 'all' || workloadPeriod === 'annual') && (
                      <td className="border border-gray-300 p-4 text-center">
                        <div className={`inline-flex items-center justify-center bg-green-600 text-white font-bold px-6 py-3 rounded-lg ${workloadPeriod === 'annual' ? 'text-3xl' : 'text-2xl'}`}>
                          <Clock className="mr-2" size={24} />
                          {teacherWorkload.reduce((sum, t) => sum + t.totalAnnualHours, 0)}h
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Anual</div>
                      </td>
                    )}
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
                  ℹ️ Sobre as Cargas Horárias — Use os botões acima para ver cada período separadamente
                </p>
                
                <div className="mb-3 p-2 bg-white/50 rounded border border-blue-300">
                  <p className="text-xs font-semibold text-blue-800 mb-1">📊 Fontes de Dados:</p>
                  <div className="flex gap-4 text-xs flex-wrap">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                      📊 Anual: carga horária da disciplina (Lotação)
                    </span>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded font-medium">
                      📆 Semanal: soma dos slots no horário base
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                      🗓️ Mensal: {monthNames[month - 1]} — dias letivos × aulas/dia
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                      📅 Diária: média de aulas nos dias em que leciona
                    </span>
                  </div>
                </div>

                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Anual:</strong> Vem da carga horária anual de cada disciplina definida em <strong>Lotação de Professores</strong></li>
                  <li><strong>Semanal:</strong> Soma das aulas no horário base selecionado (quantidade real de aulas)</li>
                  <li><strong>Mensal:</strong> Para cada dia da semana com aula, multiplica pelo nº de dias letivos daquele dia no mês (inclui sábados letivos pela referência)</li>
                  <li><strong>Diária:</strong> Média de aulas nos dias da semana em que o professor leciona aquela disciplina</li>
                  <li><strong>Atualização automática:</strong> Ao alterar mês, ano, lotações ou horário base, os dados recalculam automaticamente</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de Impressão */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          h1 {
            color: #1f2937 !important;
            font-size: 24pt;
            margin-bottom: 10pt;
          }
          
          h3 {
            color: #374151 !important;
            font-size: 14pt;
            margin-top: 10pt;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
            font-size: 10pt;
          }
          
          th, td {
            border: 1px solid #d1d5db;
            padding: 6pt;
          }
          
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          
          .shadow {
            box-shadow: none !important;
            border: 1px solid #e5e7eb;
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherFrequencyReport;
