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
  Download,
  X,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import WorkloadCharts from '../components/WorkloadCharts';
import { loadPrintHeader, buildPrintHeaderHtml, printHeaderCss, printFooterCss, buildPrintFooterHtml, type PrintHeaderData } from '../utils/printHeader';

interface AbsenceDate {
  date: string;
  period: number | null;
  paymentStatus: 'pending' | 'filled' | 'paid' | null;
  paymentDate: string | null;
  substituteTeacherName: string | null;
}

interface FutureDate {
  date: string;
  periodsCount: number;
}

interface SubjectClassDetail {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  predictedClasses: number;
  givenClasses: number;
  deficit: number;
  surplus: number;
  absenceDates?: AbsenceDate[];
  futureDates?: FutureDate[];
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
  // Pagamento de Aulas
  coveredBySubstitute?: Array<{
    date: string;
    period: number;
    startTime: string;
    endTime: string;
    className: string;
    subjectName: string;
    substituteTeacherName: string;
    status: string;
    filledViaLink: boolean;
    paymentId: string;
  }>;
  givenAsSubstitute?: Array<{
    date: string;
    period: number;
    startTime: string;
    endTime: string;
    className: string;
    subjectName: string;
    absentTeacherName: string;
    status: string;
    filledViaLink: boolean;
    paymentId: string;
  }>;
  totalCoveredClasses?: number;
  totalSubstituteClasses?: number;
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
  // Modo de período: mensal fixo ou intervalo customizado
  const [periodMode, setPeriodMode] = useState<'monthly' | 'custom'>('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
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
  // Controle de linhas expandidas na tabela por professor (key = teacherId_detailIdx)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Print states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<'all' | 'select'>('all');
  const [selectedTeachersToPrint, setSelectedTeachersToPrint] = useState<Set<string>>(new Set());
  const [printSearchTerm, setPrintSearchTerm] = useState('');
  const [printSection, setPrintSection] = useState<'frequency' | 'workload' | 'both'>('both');

  useEffect(() => {
    loadReport();
  }, [month, year, periodMode, customStart, customEnd]);

  useEffect(() => {
    loadCalendarAndTimetable();
  }, [user?.schoolId, user?.id]);

  // Recalcular workload quando mês/ano ou dados auxiliares mudam
  useEffect(() => {
    if (user?.id) {
      loadTeacherWorkload(calendarEvents, timetableData);
    }
  }, [month, year, timetableData, calendarEvents]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> =
        periodMode === 'custom' && customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : { month, year };
      const response = await api.get('/teacher-frequency-report/deficit-surplus', { params });
      setReportData(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarAndTimetable = async () => {
    let calData: any[] = [];
    let ttData: any = null;

    // Buscar calendário escolar (independente)
    try {
      const schoolScope = user?.schoolId || user?.id;
      if (schoolScope) {
        const calRes = await api.get(`/schooldays/school/${schoolScope}`);
        calData = Array.isArray(calRes.data) ? calRes.data : calRes.data?.data || [];
        setCalendarEvents(calData);
      }
    } catch (error) {
      console.error('Erro ao carregar calendário:', error);
    }

    // Buscar horário padrão (independente)
    try {
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
    } catch (error) {
      console.error('Erro ao carregar horário:', error);
    }

    // Carregar workload SEMPRE, independente de calendário/horário
    if (user?.id) {
      await loadTeacherWorkload(calData, ttData);
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
      
      // Extrair dados do horário — navegar pela estrutura da resposta
      const extractSlots = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        Object.entries(obj).forEach(([key, val]: [string, any]) => {
          // Chaves de controle da API — pular
          if (['success', 'message', '_id', '__v', 'createdAt', 'updatedAt', 'name', 'schoolId', 'userId', 'isDefault', 'scheduleId', 'title', 'school'].includes(key)) return;
          // Se 'data' contiver o objeto de turmas, descer nele
          if (key === 'data' && typeof val === 'object' && !Array.isArray(val)) {
            extractSlots(val);
            return;
          }
          if (key === 'schedule' && typeof val === 'object' && !Array.isArray(val)) {
            extractSlots(val);
            return;
          }
          // Array de slots por turma
          if (Array.isArray(val)) {
            val.forEach((slot: any) => {
              if (slot && slot.teacherId && slot.day) {
                allSlots.push({
                  day: slot.day,
                  teacherId: String(slot.teacherId),
                  subjectId: String(slot.subjectId || ''),
                  classId: String(slot.classId || key)
                });
              }
            });
          }
        });
      };
      extractSlots(ttResp);
      
      console.log('📊 Total de slots extraídos do horário:', allSlots.length);
      if (allSlots.length > 0) {
        console.log('📊 Exemplo de slot:', allSlots[0]);
        // Log de IDs únicos para debug
        const uniqueTeachers = [...new Set(allSlots.map(s => s.teacherId))];
        const uniqueSubjects = [...new Set(allSlots.map(s => s.subjectId))];
        console.log('📊 Professores no horário:', uniqueTeachers.length, uniqueTeachers.slice(0, 3));
        console.log('📊 Disciplinas no horário:', uniqueSubjects.length);
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

      // Log dos IDs dos professores/disciplinas da lotação vs horário para diagnóstico
      if (associations.length > 0 && allSlots.length > 0) {
        const firstAssoc = associations[0];
        const firstTeacher = teachers.find((t: any) => t.id === firstAssoc.teacherId || t._id === firstAssoc.teacherId);
        console.log('🔍 Debug IDs - Lotação teacherId:', firstAssoc.teacherId, 
          '-> Teacher id:', firstTeacher?.id, '_id:', firstTeacher?._id);
        console.log('🔍 Debug IDs - Lotação subjectId:', firstAssoc.subjectId);
        console.log('🔍 Debug IDs - Slot exemplo teacherId:', allSlots[0].teacherId, 'subjectId:', allSlots[0].subjectId);
      }

      associations.forEach((assoc: any) => {
        const teacher = teachers.find((t: any) => 
          String(t.id) === String(assoc.teacherId) || String(t._id) === String(assoc.teacherId)
        );
        const subject = subjects.find((s: any) => 
          String(s.id) === String(assoc.subjectId) || String(s._id) === String(assoc.subjectId)
        );
        const classItem = classes.find((c: any) => 
          String(c.id) === String(assoc.classId) || String(c._id) === String(assoc.classId)
        );

        if (!teacher || !subject) return;

        const teacherId = String(teacher.id || teacher._id);
        const teacherName = teacher.name;
        const subjectId = String(subject.id || subject._id);
        const classId = classItem ? String(classItem.id || classItem._id) : undefined;

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

        // Contar aulas SEMANAIS — prioridade correta:
        // 1. assoc.weeklyHours (override explícito na lotação)
        // 2. classItem.subjectWeeklyHours[subjectId] (horas definidas na turma)
        // 3. Slots do horário gerado (contagem real)
        // 4. subject.weeklyHours (padrão da disciplina)
        // 5. Fallback: 2

        const teacherSlots = allSlots.filter(s =>
          String(s.teacherId) === teacherId &&
          String(s.subjectId) === subjectId &&
          (classId ? String(s.classId) === classId : true)
        );

        // Buscar horas específicas da turma para esta disciplina
        const classSubjectHours = classId && classItem?.subjectWeeklyHours
          ? (classItem.subjectWeeklyHours[subjectId] || classItem.subjectWeeklyHours[assoc.subjectId])
          : undefined;

        // Carga horária SEMANAL — da lotação ou do horário base (sempre inteiro)
        let weeklyHours: number;
        if (assoc.weeklyHours !== undefined && assoc.weeklyHours > 0) {
          weeklyHours = Math.round(assoc.weeklyHours);          // 1. Override da lotação
        } else if (classSubjectHours !== undefined && classSubjectHours > 0) {
          weeklyHours = Math.round(classSubjectHours);          // 2. Horas da turma
        } else if (teacherSlots.length > 0) {
          weeklyHours = teacherSlots.length;                    // 3. Slots do horário (já inteiro)
        } else {
          weeklyHours = Math.round(subject.weeklyHours || 2);   // 4/5. Disciplina ou fallback
        }

        // Contar aulas por dia da semana no horário base (para cálculo diário e mensal)
        const slotsPerDay: Record<string, number> = {};
        teacherSlots.forEach(s => {
          slotsPerDay[s.day] = (slotsPerDay[s.day] || 0) + 1;
        });

        // Carga horária DIÁRIA — aulas desta disciplina por dia letivo (inteiro)
        const daysWithClasses = Object.keys(slotsPerDay).length;
        let dailyHours: number;
        if (daysWithClasses > 0) {
          // Do horário base: média de aulas por dia arredondada para inteiro
          dailyHours = Math.ceil(weeklyHours / daysWithClasses);
        } else if (weeklyHours > 0) {
          // Sem horário base: estimar usando dias letivos da semana
          const workingDays = Object.keys(schoolDaysByDayName).length || 5;
          dailyHours = Math.ceil(weeklyHours / workingDays);
        } else {
          dailyHours = 0;
        }

        // Carga horária MENSAL — baseada no horário base × dias letivos do mês (inteiro)
        let monthlyHours = 0;
        if (Object.keys(slotsPerDay).length > 0) {
          // Com horário base: para cada dia da semana com aula, multiplicar pelo nº de dias letivos desse dia no mês
          Object.entries(slotsPerDay).forEach(([dayName, count]) => {
            monthlyHours += count * (schoolDaysByDayName[dayName] || 0);
          });
        } else if (weeklyHours > 0) {
          // Sem horário base: estimar via nº semanas no mês
          const totalSchoolDays = Object.values(schoolDaysByDayName).reduce((a, b) => a + b, 0);
          const weekdaysWithSchool = Object.keys(schoolDaysByDayName).length || 5;
          monthlyHours = Math.round(weeklyHours * totalSchoolDays / weekdaysWithSchool);
        }

        // Carga horária ANUAL — semanal × 40 semanas letivas (inteiro)
        const annualHours = weeklyHours * 40;

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

      const result = Array.from(teacherMap.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'pt-BR'));
      
      // Resumo de diagnóstico
      console.log('📊 RESUMO WORKLOAD:');
      console.log('   Associações:', associations.length, '| Professores:', teachers.length, '| Slots horário:', allSlots.length);
      console.log('   Dias letivos no mês:', schoolDaysByDayName);
      console.log('   Professores com carga calculada:', result.length);
      if (result.length > 0) {
        const first = result[0];
        console.log('   Exemplo:', first.teacherName, '- semanal:', first.totalWeeklyHours, 
          '| disciplinas:', first.subjects.map(s => s.subjectName + '(' + s.weeklyHours + 'h/sem, ' + s.dailyHours + 'h/dia)').join(', '));
      }

      setTeacherWorkload(result);
    } catch (error) {
      console.error('Erro ao buscar cargas horárias:', error);
    }
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

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Rótulo legível do período selecionado
  const periodLabel = periodMode === 'custom' && customStart && customEnd
    ? `${new Date(customStart + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(customEnd + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : `${monthNames[month - 1]}/${year}`;

  const handleOpenPrintModal = () => {
    setShowPrintModal(true);
    setPrintMode('all');
    setSelectedTeachersToPrint(new Set());
    setPrintSearchTerm('');
    setPrintSection('both');
  };

  const handleExecutePrint = async () => {
    const headerData = await loadPrintHeader();
    const headerHtml = buildPrintHeaderHtml(headerData);

    // Determine which teachers to include
    const teachersForFrequency = printMode === 'all'
      ? filteredReports
      : filteredReports.filter(r => selectedTeachersToPrint.has(r.teacherId));

    const teachersForWorkload = printMode === 'all'
      ? teacherWorkload
      : teacherWorkload.filter(t => selectedTeachersToPrint.has(t.teacherId));

    if (teachersForFrequency.length === 0 && teachersForWorkload.length === 0) {
      toast.error('Nenhum professor selecionado para impressão');
      return;
    }

    // Build frequency section HTML
    let frequencyHtml = '';
    if (printSection === 'frequency' || printSection === 'both') {
      const buildSituationCell = (d: SubjectClassDetail) => {
        if (d.deficit > 0) return '<span style="color:#dc2626;font-weight:bold;">-' + d.deficit + '</span>';
        if (d.surplus > 0) return '<span style="color:#7c3aed;font-weight:bold;">+' + d.surplus + '</span>';
        return '<span style="color:#16a34a;">✓ Em dia</span>';
      };

      const buildDeficitLabel = (report: TeacherReport) => {
        let extra = '';
        if (report.totalDeficit > 0) extra += ' | Déficit: <strong style="color:#dc2626;">-' + report.totalDeficit + '</strong>';
        if (report.totalSurplus > 0) extra += ' | Saldo: <strong style="color:#7c3aed;">+' + report.totalSurplus + '</strong>';
        return extra;
      };

      const buildDetailRows = (details: SubjectClassDetail[]) => {
        return details.map((d, i) => {
          const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
          return '<tr style="background:' + bg + ';">'
            + '<td style="border:1px solid #e5e7eb;padding:4px 8px;">' + d.subjectName + '</td>'
            + '<td style="border:1px solid #e5e7eb;padding:4px 8px;">' + d.className + '</td>'
            + '<td style="border:1px solid #e5e7eb;padding:4px 8px;text-align:center;">' + d.predictedClasses + '</td>'
            + '<td style="border:1px solid #e5e7eb;padding:4px 8px;text-align:center;">' + d.givenClasses + '</td>'
            + '<td style="border:1px solid #e5e7eb;padding:4px 8px;text-align:center;">' + buildSituationCell(d) + '</td>'
            + '</tr>';
        }).join('');
      };

      const teacherBlocks = teachersForFrequency.map((report, idx) => {
        const pageBreak = printMode === 'select' && idx < teachersForFrequency.length - 1
          ? '<div style="page-break-after:always;"></div>' : '';
        return '<div style="margin-bottom:20px;' + (printMode === 'select' ? 'page-break-inside:avoid;' : '') + '">'
          + '<div style="background:#f0f4ff;padding:10px 14px;border-radius:6px;margin-bottom:6px;border-left:4px solid #3b82f6;">'
          + '<strong style="font-size:13pt;color:#1e3a5f;">' + report.teacherName + '</strong>'
          + '<span style="margin-left:12px;font-size:10pt;color:#555;">Carga Semanal: ' + report.weeklyWorkload + 'h</span>'
          + '<span style="margin-left:12px;font-size:10pt;">'
          + 'Previsto: <strong>' + report.totalPredictedClasses + '</strong> | '
          + 'Dado: <strong style="color:#16a34a;">' + report.totalGivenClasses + '</strong>'
          + buildDeficitLabel(report)
          + '</span></div>'
          + '<table style="width:100%;border-collapse:collapse;font-size:9pt;">'
          + '<thead><tr style="background:#e0e7ff;">'
          + '<th style="border:1px solid #c7d2fe;padding:5px 8px;text-align:left;">Disciplina</th>'
          + '<th style="border:1px solid #c7d2fe;padding:5px 8px;text-align:left;">Turma</th>'
          + '<th style="border:1px solid #c7d2fe;padding:5px 8px;text-align:center;">Previsto</th>'
          + '<th style="border:1px solid #c7d2fe;padding:5px 8px;text-align:center;">Dado</th>'
          + '<th style="border:1px solid #c7d2fe;padding:5px 8px;text-align:center;">Situação</th>'
          + '</tr></thead><tbody>'
          + buildDetailRows(report.subjectClassDetails)
          + '</tbody></table></div>' + pageBreak;
      }).join('');

      frequencyHtml = '<h2 style="font-size:16pt;color:#1e3a5f;margin:20px 0 10px;border-bottom:2px solid #1e3a5f;padding-bottom:6px;">'
        + 'Relatório de Frequência — ' + periodLabel
        + '</h2>' + teacherBlocks;
    }

    // Build workload section HTML
    let workloadHtml = '';
    if (printSection === 'workload' || printSection === 'both') {
      const buildSubjectsList = (subjects: TeacherSubjectWorkload['subjects']) => {
        return subjects.map(s => {
          const cls = s.className ? ' <span style="font-size:8pt;color:#3b82f6;">(' + s.className + ')</span>' : '';
          return '<div style="margin-bottom:3px;">' + s.subjectName + cls + '</div>';
        }).join('');
      };

      const buildHoursColumn = (subjects: TeacherSubjectWorkload['subjects'], field: 'dailyHours' | 'weeklyHours' | 'monthlyHours' | 'annualHours', total: number) => {
        const rows = subjects.map(s => '<div style="margin-bottom:3px;">' + s[field] + 'h</div>').join('');
        return rows + '<div style="border-top:1px solid #999;margin-top:4px;padding-top:3px;font-weight:bold;">' + total + 'h</div>';
      };

      const workloadRows = teachersForWorkload.map((t, idx) => {
        const bg = idx % 2 === 0 ? '#eff6ff' : '#fff';
        const dailyTotal = t.subjects.reduce((s, subj) => s + subj.dailyHours, 0);
        return '<tr style="background:' + bg + ';">'
          + '<td style="border:1px solid #d1d5db;padding:6px 8px;vertical-align:top;">'
          + '<strong>' + t.teacherName + '</strong>'
          + '<br/><span style="font-size:8pt;color:#666;">' + t.subjects.length + ' disciplina(s)</span></td>'
          + '<td style="border:1px solid #d1d5db;padding:6px 8px;vertical-align:top;">' + buildSubjectsList(t.subjects) + '</td>'
          + '<td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;vertical-align:top;">' + buildHoursColumn(t.subjects, 'dailyHours', dailyTotal) + '</td>'
          + '<td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;vertical-align:top;">' + buildHoursColumn(t.subjects, 'weeklyHours', t.totalWeeklyHours) + '</td>'
          + '<td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;vertical-align:top;">' + buildHoursColumn(t.subjects, 'monthlyHours', t.totalMonthlyHours) + '</td>'
          + '<td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;vertical-align:top;">' + buildHoursColumn(t.subjects, 'annualHours', t.totalAnnualHours) + '</td>'
          + '</tr>';
      }).join('');

      const totDailyAll = teachersForWorkload.reduce((sum, t) => sum + t.subjects.reduce((s, subj) => s + subj.dailyHours, 0), 0);
      const totWeeklyAll = teachersForWorkload.reduce((sum, t) => sum + t.totalWeeklyHours, 0);
      const totMonthlyAll = teachersForWorkload.reduce((sum, t) => sum + t.totalMonthlyHours, 0);
      const totAnnualAll = teachersForWorkload.reduce((sum, t) => sum + t.totalAnnualHours, 0);

      workloadHtml = (printSection === 'both' ? '<div style="page-break-before:always;"></div>' : '')
        + '<h2 style="font-size:16pt;color:#1e3a5f;margin:20px 0 10px;border-bottom:2px solid #1e3a5f;padding-bottom:6px;">'
        + 'Relação Geral de Cargas Horárias — ' + periodLabel + '</h2>'
        + '<table style="width:100%;border-collapse:collapse;font-size:9pt;"><thead>'
        + '<tr style="background:#1e3a8a;color:#fff;">'
        + '<th style="border:1px solid #3b82f6;padding:8px;text-align:left;">Professor</th>'
        + '<th style="border:1px solid #3b82f6;padding:8px;text-align:left;">Disciplinas Lotadas</th>'
        + '<th style="border:1px solid #3b82f6;padding:8px;text-align:center;">Diária</th>'
        + '<th style="border:1px solid #3b82f6;padding:8px;text-align:center;">Semanal</th>'
        + '<th style="border:1px solid #3b82f6;padding:8px;text-align:center;">Mensal</th>'
        + '<th style="border:1px solid #3b82f6;padding:8px;text-align:center;">Anual</th>'
        + '</tr></thead><tbody>'
        + workloadRows
        + '</tbody><tfoot>'
        + '<tr style="background:#e0e7ff;font-weight:bold;">'
        + '<td colspan="2" style="border:1px solid #d1d5db;padding:8px;text-align:right;">TOTAIS GERAIS:</td>'
        + '<td style="border:1px solid #d1d5db;padding:8px;text-align:center;">' + totDailyAll + 'h</td>'
        + '<td style="border:1px solid #d1d5db;padding:8px;text-align:center;">' + totWeeklyAll + 'h</td>'
        + '<td style="border:1px solid #d1d5db;padding:8px;text-align:center;">' + totMonthlyAll + 'h</td>'
        + '<td style="border:1px solid #d1d5db;padding:8px;text-align:center;">' + totAnnualAll + 'h</td>'
        + '</tr></tfoot></table>';
    }

    // Open print window
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Popup bloqueado. Permita popups para imprimir.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Relatório de Frequência — ${periodLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 20px; }
  ${printHeaderCss}
  ${printFooterCss}
  @media print {
    @page { size: A4; margin: 12mm; }
    body { padding: 0; }
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-footer {
    margin-top: 30px;
    padding-top: 10px;
    border-top: 1px solid #d1d5db;
    text-align: center;
    font-size: 8pt;
    color: #9ca3af;
  }
</style>
</head><body>
  ${headerHtml}
  ${frequencyHtml}
  ${workloadHtml}
  <div class="print-footer">
    Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    — Sistema Criador de Horário de Aula © ${new Date().getFullYear()}
  </div>
  ${buildPrintFooterHtml()}
</body></html>`);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);

    setShowPrintModal(false);
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeachersToPrint(prev => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
      }
      return next;
    });
  };

  const selectAllTeachersForPrint = () => {
    const allIds = new Set<string>();
    filteredReports.forEach(r => allIds.add(r.teacherId));
    teacherWorkload.forEach(t => allIds.add(t.teacherId));
    setSelectedTeachersToPrint(allIds);
  };

  const deselectAllTeachersForPrint = () => {
    setSelectedTeachersToPrint(new Set());
  };

  // Merge teacher lists for print selection
  const allTeachersForPrintSelection = React.useMemo(() => {
    const map = new Map<string, string>();
    filteredReports.forEach(r => map.set(r.teacherId, r.teacherName));
    teacherWorkload.forEach(t => map.set(t.teacherId, t.teacherName));
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [filteredReports, teacherWorkload]);

  const filteredTeachersForPrint = printSearchTerm
    ? allTeachersForPrintSelection.filter(t => t.name.toLowerCase().includes(printSearchTerm.toLowerCase()))
    : allTeachersForPrintSelection;

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
            onClick={handleOpenPrintModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        {/* Toggle modo de período */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-semibold text-gray-700">Período:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setPeriodMode('monthly')}
              className={`px-4 py-1.5 text-sm font-medium transition ${
                periodMode === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📅 Mês / Ano
            </button>
            <button
              onClick={() => setPeriodMode('custom')}
              className={`px-4 py-1.5 text-sm font-medium transition border-l border-gray-300 ${
                periodMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📆 Intervalo de Datas
            </button>
          </div>
          {periodMode === 'custom' && customStart && customEnd && (
            <span className="text-sm text-blue-700 font-medium bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {periodLabel}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Seletores de período */}
          {periodMode === 'monthly' ? (
            <>
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
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  min={customStart}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </>
          )}
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
                          <th className="px-4 py-2 text-left font-semibold text-gray-700 w-6"></th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Disciplina</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Turma</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Previsto</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Dado</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {report.subjectClassDetails.map((detail, idx) => {
                          const rowKey = `${report.teacherId}_${idx}`;
                          const isExpanded = expandedRows.has(rowKey);
                          const hasAbsences = (detail.absenceDates?.length ?? 0) > 0;
                          const hasFuture = (detail.futureDates?.length ?? 0) > 0;
                          const canExpand = detail.deficit > 0;
                          return (
                            <React.Fragment key={idx}>
                              <tr
                                className={`hover:bg-gray-50 ${canExpand ? 'cursor-pointer' : ''}`}
                                onClick={() => {
                                  if (!canExpand) return;
                                  setExpandedRows(prev => {
                                    const next = new Set(prev);
                                    if (next.has(rowKey)) next.delete(rowKey);
                                    else next.add(rowKey);
                                    return next;
                                  });
                                }}
                              >
                                <td className="px-4 py-2 text-center text-gray-400">
                                  {canExpand && (
                                    <span className="text-xs select-none">{isExpanded ? '▲' : '▼'}</span>
                                  )}
                                </td>
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
                              {isExpanded && canExpand && (
                                <tr>
                                  <td colSpan={6} className="px-0 py-0 bg-gray-50 border-t border-gray-200">
                                    <div className="px-6 py-4 space-y-4">

                                      {/* Ausências passadas registradas */}
                                      {hasAbsences ? (
                                        <div>
                                          <p className="text-xs font-semibold text-red-700 uppercase mb-2 flex items-center gap-1">
                                            <span>🚫</span> Ausências Registradas — {detail.subjectName} / {detail.className}
                                          </p>
                                          <table className="w-full text-xs border-collapse">
                                            <thead>
                                              <tr className="bg-red-100 text-red-800">
                                                <th className="px-3 py-1.5 text-left font-semibold">Data da Ausência</th>
                                                <th className="px-3 py-1.5 text-center font-semibold">Período</th>
                                                <th className="px-3 py-1.5 text-left font-semibold">Substituto</th>
                                                <th className="px-3 py-1.5 text-center font-semibold">Status Pagamento</th>
                                                <th className="px-3 py-1.5 text-left font-semibold">Data do Pagamento</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-100">
                                              {detail.absenceDates!.map((abs, aIdx) => (
                                                <tr key={aIdx} className="bg-white hover:bg-red-50">
                                                  <td className="px-3 py-1.5 font-medium text-gray-800">
                                                    {new Date(abs.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                  </td>
                                                  <td className="px-3 py-1.5 text-center text-gray-700">
                                                    {abs.period != null ? `${abs.period}º` : '—'}
                                                  </td>
                                                  <td className="px-3 py-1.5 text-gray-700">
                                                    {abs.substituteTeacherName || <span className="text-gray-400 italic">Sem substituto</span>}
                                                  </td>
                                                  <td className="px-3 py-1.5 text-center">
                                                    {abs.paymentStatus === 'paid' ? (
                                                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">✅ Pago</span>
                                                    ) : abs.paymentStatus === 'filled' ? (
                                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">🔵 Preenchido</span>
                                                    ) : abs.paymentStatus === 'pending' ? (
                                                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">⏳ Pendente</span>
                                                    ) : (
                                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full italic">Sem registro</span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-1.5 text-gray-700">
                                                    {abs.paymentDate
                                                      ? new Date(abs.paymentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                      : <span className="text-gray-400 italic">—</span>}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500 italic flex items-center gap-1">
                                          <span>ℹ️</span> Nenhuma ausência explicitamente registrada no período analisado.
                                        </p>
                                      )}

                                      {/* Aulas futuras (ainda não ministradas) */}
                                      {hasFuture && (
                                        <div>
                                          <p className="text-xs font-semibold text-blue-700 uppercase mb-2 flex items-center gap-1">
                                            <span>📆</span> Aulas Agendadas (ainda não ministradas) — {detail.futureDates!.reduce((s, d) => s + d.periodsCount, 0)} aula(s)
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {detail.futureDates!.map((fd, fIdx) => (
                                              <span key={fIdx} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg">
                                                {new Date(fd.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                {fd.periodsCount > 1 ? ` (${fd.periodsCount}×)` : ''}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Seção Pagamento de Aulas */}
                  {((report.coveredBySubstitute && report.coveredBySubstitute.length > 0) ||
                    (report.givenAsSubstitute && report.givenAsSubstitute.length > 0)) && (
                    <div className="mt-4 border-t pt-4">
                      {report.coveredBySubstitute && report.coveredBySubstitute.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-semibold text-orange-700 uppercase mb-1 flex items-center gap-1">
                            <span>🔄</span> Aulas Cobertas por Substituto ({report.totalCoveredClasses})
                          </h5>
                          <table className="w-full text-xs">
                            <thead className="bg-orange-50">
                              <tr>
                                <th className="px-3 py-1 text-left text-orange-800">Data</th>
                                <th className="px-3 py-1 text-left text-orange-800">Disciplina</th>
                                <th className="px-3 py-1 text-left text-orange-800">Turma</th>
                                <th className="px-3 py-1 text-left text-orange-800">Substituto</th>
                                <th className="px-3 py-1 text-center text-orange-800">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100">
                              {report.coveredBySubstitute.map((c, i) => (
                                <tr key={i} className="hover:bg-orange-50">
                                  <td className="px-3 py-1">{new Date(c.date).toLocaleDateString('pt-BR')}</td>
                                  <td className="px-3 py-1">{c.subjectName}</td>
                                  <td className="px-3 py-1">{c.className}</td>
                                  <td className="px-3 py-1">{c.substituteTeacherName}</td>
                                  <td className="px-3 py-1 text-center">
                                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                                      c.status === 'paid' ? 'bg-green-100 text-green-800' :
                                      c.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {c.status === 'paid' ? 'Pago' : c.status === 'filled' ? 'Preenchido' : 'Pendente'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {report.givenAsSubstitute && report.givenAsSubstitute.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-indigo-700 uppercase mb-1 flex items-center gap-1">
                            <span>💼</span> Aulas Dadas como Substituto ({report.totalSubstituteClasses})
                          </h5>
                          <table className="w-full text-xs">
                            <thead className="bg-indigo-50">
                              <tr>
                                <th className="px-3 py-1 text-left text-indigo-800">Data</th>
                                <th className="px-3 py-1 text-left text-indigo-800">Disciplina</th>
                                <th className="px-3 py-1 text-left text-indigo-800">Turma</th>
                                <th className="px-3 py-1 text-left text-indigo-800">Prof. Ausente</th>
                                <th className="px-3 py-1 text-center text-indigo-800">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-100">
                              {report.givenAsSubstitute.map((g, i) => (
                                <tr key={i} className="hover:bg-indigo-50">
                                  <td className="px-3 py-1">{new Date(g.date).toLocaleDateString('pt-BR')}</td>
                                  <td className="px-3 py-1">{g.subjectName}</td>
                                  <td className="px-3 py-1">{g.className}</td>
                                  <td className="px-3 py-1">{g.absentTeacherName}</td>
                                  <td className="px-3 py-1 text-center">
                                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                                      g.status === 'paid' ? 'bg-green-100 text-green-800' :
                                      g.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {g.status === 'paid' ? 'Pago' : g.status === 'filled' ? 'Preenchido' : 'Pendente'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
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
                Lotação de todos os professores por disciplina • {periodLabel} • Dados da página de <strong>Lotação de Professores</strong>
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
                        🗓️ Carga Horária — {periodLabel}
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

      {/* Gráficos de Análise */}
      <WorkloadCharts
        teacherWorkload={teacherWorkload}
        filteredReports={filteredReports}
        monthName={monthNames[month - 1]}
        year={year}
      />

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

      {/* Modal de Impressão */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Printer className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Opções de Impressão</h2>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-white/80 hover:text-white transition p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Seção a imprimir */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📄 O que imprimir?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'both' as const, label: 'Frequência + Carga Horária', icon: '📊' },
                    { key: 'frequency' as const, label: 'Só Frequência', icon: '📋' },
                    { key: 'workload' as const, label: 'Só Carga Horária', icon: '⏰' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setPrintSection(opt.key)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition text-center ${
                        printSection === opt.key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{opt.icon}</div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo de seleção */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  👥 Quais professores?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrintMode('all')}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      printMode === 'all'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-gray-900">Todos os Professores</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Imprime relatório completo de todos os {allTeachersForPrintSelection.length} professores, sem cortes entre eles
                    </p>
                  </button>
                  <button
                    onClick={() => setPrintMode('select')}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      printMode === 'select'
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-gray-900">Selecionar por Nome</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Escolha um ou mais professores para imprimir individualmente (cada um em página separada)
                    </p>
                  </button>
                </div>
              </div>

              {/* Lista de seleção de professores */}
              {printMode === 'select' && (
                <div className="border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Selecione os professores ({selectedTeachersToPrint.size} de {allTeachersForPrintSelection.length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllTeachersForPrint}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Selecionar Todos
                      </button>
                      <button
                        onClick={deselectAllTeachersForPrint}
                        className="text-xs px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Busca */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={printSearchTerm}
                      onChange={e => setPrintSearchTerm(e.target.value)}
                      placeholder="Buscar professor..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                  </div>

                  {/* Lista */}
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredTeachersForPrint.map(teacher => (
                      <label
                        key={teacher.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                          selectedTeachersToPrint.has(teacher.id)
                            ? 'bg-indigo-100 border border-indigo-300'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeachersToPrint.has(teacher.id)}
                          onChange={() => toggleTeacherSelection(teacher.id)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">{teacher.name}</span>
                      </label>
                    ))}
                    {filteredTeachersForPrint.length === 0 && (
                      <p className="text-center text-sm text-gray-400 py-4">Nenhum professor encontrado</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
              <p className="text-xs text-gray-500">
                💡 O cabeçalho institucional configurado em Configurações será incluído automaticamente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecutePrint}
                  disabled={printMode === 'select' && selectedTeachersToPrint.size === 0}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherFrequencyReport;
