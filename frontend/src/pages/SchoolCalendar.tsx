import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, Plus, Edit2, Trash2, Download, FileText, AlertTriangle, Printer, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import { schoolDayAPI, scheduleAPI, emergencyScheduleAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { loadPrintHeader, buildPrintHeaderHtml, printHeaderCss, printFooterCss, buildPrintFooterHtml, type PrintHeaderData } from '../utils/printHeader';

interface SchoolDay {
  id: string;
  date: string;
  dayType: 'regular' | 'saturday' | 'holiday' | 'recess';
  scheduleId?: string;
  isCompleted: boolean;
  notes?: string;
  schedule?: any;
  followWeekday?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
}

interface Statistics {
  totalDays: number;
  completedDays: number;
  remainingDays: number;
  regularDays: number;
  saturdayDays: number;
  holidays: number;
  recessDays: number;
  completionRate: number;
}

// Lista de observações pré-definidas (ordenadas alfabeticamente, sem duplicatas)
const PREDEFINED_NOTES = [
  '1º SIMULA + SAEB',
  '1º SIMULA X - ENEM',
  '1º SIMULA X SAEB',
  '1º SIMULADO ENEM',
  '1° SIMULADO SAEB',
  '1° MINITESTE',
  '1ª RECUPERAÇÃO PARALELA',
  '2º SIMULA + SAEB',
  '2º SIMULA X - ENEM',
  '2º SIMULA X SAEB',
  '2º SIMULADO ENEM',
  '2° MINITESTE',
  '2ª RECUPERAÇÃO PARALELA',
  '3º SIMULA + SAEB',
  '3º SIMULA X - ENEM',
  '3º SIMULA X SAEB',
  '3º SIMULADO ENEM',
  '3° SIMULADO SAEB',
  '3° MINITESTE',
  '3ª RECUPERAÇÃO PARALELA',
  '4º SIMULA + SAEB',
  '4° SIMULADO SAEB',
  '4° MINITESTE',
  '5º SIMULA + SAEB',
  '5° MINITESTE',
  '6º SIMULA + SAEB',
  '6° MINITESTE',
  '7° MINITESTE',
  '8° MINITESTE',
  '9° MINITESTE',
  '10° MINITESTE',
  'ASSEMBLEIA ESCOLAR',
  'AVALIAÇÃO DIAGNÓSTICA DE ENTRADA',
  'CARNAVAL',
  'CONFRATERNIZAÇÃO UNIVERSAL',
  'CONFIRMAÇÃO DA MATRÍCULA PRESENCIAL',
  'CORPUS CHRISTI',
  'DIA DA INDEPENDÊNCIA DO BRASIL',
  'DIA DE FINADOS',
  'DIA DO PIAUÍ',
  'DIA DO PROFESSOR',
  'DIA DO SERVIDOR PÚBLICO',
  'DIA DO TRABALHO',
  'DIA NACIONAL DE ZUMBI E DA CONSCIÊNCIA NEGRA',
  'DIRETRIZES GERAIS: CONSCIENTIZAÇÃO DO CURRÍCULO',
  'FERIADO MUNICIPAL',
  'FERIADOS / DIAS SANTIFICADOS',
  'FÉRIAS COLETIVAS',
  'INÍCIO DAS AULAS 1º PERÍODO',
  'INÍCIO DO 1º TRIMESTRE',
  'INÍCIO DO 2º TRIMESTRE',
  'INÍCIO DO 3º TRIMESTRE',
  'LANÇAMENTO FINAL NO iSEDUC',
  'MINITESTE',
  'NATAL',
  'NM1-1ºT',
  'NM1-2ºT',
  'NM1-3ºT',
  'NM2-1ºT',
  'NM2-2ºT',
  'NM2-3ºT',
  'NM3-1ºT',
  'NM3-2ºT',
  'NM3-3ºT',
  'NOSSA SENHORA APARECIDA',
  'NOSSA SENHORA DA CONCEIÇÃO',
  'PAIXÃO DE CRISTO',
  'PLANEJAMENTO PEDAGÓGICO',
  'PROCLAMAÇÃO DA REPÚBLICA',
  'PROVAS FINAIS',
  'QUIZ ACELERA - LP e MAT',
  'QUIZ FÍSICA',
  'RECUPERAÇÃO FINAL',
  'REPOSIÇÃO DE AULAS',
  'REUNIÃO DO COMITÊ DE MEDIAÇÃO DE CONFLITO ESCOLAR',
  'REUNIÃO ORDINÁRIA DO CONSELHO DE CLASSE',
  'REUNIÃO ORDINÁRIA DO CONSELHO ESCOLAR',
  'SÁBADO LETIVO',
  'SEMANA PRESENTE',
  'SIMULADO SAEB',
  'TÉRMINO DAS ATIVIDADES 1º PERÍODO',
  'TÉRMINO DAS ATIVIDADES 2º PERÍODO',
  'TÉRMINO DO 1º TRIMESTRE',
  'TÉRMINO DO 2º TRIMESTRE',
  'TÉRMINO DO 3º TRIMESTRE',
  'TIRADENTES'
];

const SchoolCalendar: React.FC = () => {
  const { user } = useAuthStore();
  const [schoolDays, setSchoolDays] = useState<SchoolDay[]>([]);
  const [yearSchoolDays, setYearSchoolDays] = useState<SchoolDay[]>([]); // Todos os dias do ano para cálculos acumulados
  const [schedules, setSchedules] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingDay, setEditingDay] = useState<SchoolDay | null>(null);
  const [emergencySchedules, setEmergencySchedules] = useState<any[]>([]);
  const [searchNote, setSearchNote] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    dayType: 'regular' as const,
    scheduleId: '',
    notes: '',
    followWeekday: '' as '' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday',
  });

  useEffect(() => {
    if (user?.schoolId) {
      loadData();
    }
  }, [user, selectedMonth]);

  const loadData = async () => {
    try {
      if (!user) {
        console.log('❌ loadData: Usuário não autenticado');
        return;
      }

      // Usar schoolId se existir, senão usar o próprio ID do usuário (para escolas)
      const schoolId = user.schoolId || (user.role === 'school' ? user.id : null);

      console.log('🔍 loadData - Debug:', { 
        userId: user.id, 
        userRole: user.role, 
        userSchoolId: user.schoolId, 
        calculatedSchoolId: schoolId 
      });

      if (!schoolId) {
        toast.error('Usuário sem escola associada');
        return;
      }

      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      console.log('📅 Buscando dados do calendário:', {
        schoolId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      const [daysRes, yearDaysRes, schedulesRes, statsRes, emergencyRes] = await Promise.all([
        schoolDayAPI.getAll(schoolId, {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }),
        schoolDayAPI.getAll(schoolId, {
          startDate: `${selectedMonth.getFullYear()}-01-01`,
          endDate: `${selectedMonth.getFullYear()}-12-31`,
        }),
        scheduleAPI.getAll(),
        schoolDayAPI.getStatistics(schoolId, {
          startDate: `${selectedMonth.getFullYear()}-01-01`,
          endDate: `${selectedMonth.getFullYear()}-12-31`,
        }),
        emergencyScheduleAPI.getAll(),
      ]);
      
      console.log('✅ Dados carregados com sucesso');

      setSchoolDays(daysRes.data.data || []);
      setYearSchoolDays(yearDaysRes.data.data || []);
      setSchedules(schedulesRes.data.data || []);
      setStatistics(statsRes.data.data || {
        totalDays: 0,
        completedDays: 0,
        remainingDays: 0,
        regularDays: 0,
        saturdayDays: 0,
        holidays: 0,
        recessDays: 0,
        completionRate: 0
      });
      
      // Filtrar horários emergenciais do mês atual
      const emergencyData = emergencyRes.data.data || [];
      const monthEmergencies = emergencyData.filter((schedule: any) => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });
      setEmergencySchedules(monthEmergencies);
    } catch (error: any) {
      console.error('❌ Erro ao carregar calendário:', error);
      console.error('❌ URL da requisição:', error.config?.url);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      console.error('❌ Headers:', error.response?.headers);
      
      const errorMsg = error.response?.data?.message || error.message || 'Erro desconhecido';
      toast.error('Erro ao carregar calendário: ' + errorMsg);
    }
  };

  const handleSave = async () => {
    try {
      // Validar campos obrigatórios
      if (!formData.date || !formData.dayType) {
        toast.error('Data e Tipo são obrigatórios');
        return;
      }

      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Usar schoolId se existir, senão usar o próprio ID do usuário (para escolas)
      const schoolId = user.schoolId || (user.role === 'school' ? user.id : null);

      if (!schoolId) {
        toast.error('Usuário sem escola associada');
        return;
      }

      const data = {
        ...formData,
        schoolId,
        scheduleId: formData.scheduleId || undefined,
        followWeekday: formData.followWeekday || undefined,
      };

      if (editingDay) {
        const updateData = {
          ...formData,
          scheduleId: formData.scheduleId || undefined,
          followWeekday: formData.followWeekday || undefined,
        };
        await schoolDayAPI.update(editingDay.id, updateData);
        toast.success('Dia letivo atualizado com sucesso!');
      } else {
        await schoolDayAPI.create(data);
        toast.success('Dia letivo criado com sucesso!');
      }

      setShowModal(false);
      setEditingDay(null);
      setFormData({ date: '', dayType: 'regular', scheduleId: '', notes: '', followWeekday: '' });
      setSelectedNotes([]);
      setSearchNote('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar dia letivo');
    }
  };

  const handleToggleCompleted = async (day: SchoolDay) => {
    try {
      await schoolDayAPI.update(day.id, { isCompleted: !day.isCompleted });
      toast.success(day.isCompleted ? 'Dia marcado como pendente' : 'Dia marcado como cumprido');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar dia letivo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este dia letivo?')) return;

    try {
      await schoolDayAPI.delete(id);
      toast.success('Dia letivo excluído com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir dia letivo');
    }
  };

  const handleDeleteEmergencySchedule = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este horário emergencial?')) return;

    try {
      await emergencyScheduleAPI.delete(id);
      toast.success('Horário emergencial excluído com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir horário emergencial');
    }
  };

  const getDaysInMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(new Date(0));
    }

    // Add all days in month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getSchoolDayForDate = (date: Date): SchoolDay | undefined => {
    if (date.getTime() === 0) return undefined;
    const dateStr = date.toISOString().split('T')[0];
    return schoolDays.find(day => day.date === dateStr);
  };

  const getDayTypeColor = (dayType: string, isCompleted: boolean, isPast: boolean) => {
    // Se o dia já passou e não foi cumprido, deixar mais escuro/opaco
    if (isPast && !isCompleted && (dayType === 'regular' || dayType === 'saturday')) {
      return 'bg-gray-300 border-gray-600 opacity-80';
    }
    
    const colors = {
      regular: isCompleted 
        ? 'bg-blue-300 border-blue-600 shadow-md' 
        : 'bg-blue-50 border-blue-300',
      saturday: isCompleted 
        ? 'bg-purple-300 border-purple-600 shadow-md' 
        : 'bg-purple-50 border-purple-300',
      holiday: 'bg-red-200 border-red-500 shadow-sm',
      recess: 'bg-yellow-200 border-yellow-500 shadow-sm'
    };
    return colors[dayType as keyof typeof colors] || 'bg-gray-100 border-gray-300';
  };

  const getDayTypeLabel = (dayType: string) => {
    switch (dayType) {
      case 'regular':
        return 'Regular';
      case 'saturday':
        return 'Sábado Letivo';
      case 'holiday':
        return 'Feriado';
      case 'recess':
        return 'Recesso';
      default:
        return dayType;
    }
  };

  const getWeekdayLabel = (weekday: string) => {
    switch (weekday) {
      case 'monday':
        return 'Segunda';
      case 'tuesday':
        return 'Terça';
      case 'wednesday':
        return 'Quarta';
      case 'thursday':
        return 'Quinta';
      case 'friday':
        return 'Sexta';
      default:
        return weekday;
    }
  };

  const getEmergencyScheduleForDate = (date: Date) => {
    if (date.getTime() === 0) return null;
    const dateStr = date.toISOString().split('T')[0];
    return emergencySchedules.find(schedule => {
      const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
      return scheduleDate === dateStr;
    });
  };

  // Calcular estatísticas do mês atual
  const getMonthStatistics = () => {
    const year = selectedMonth.getFullYear();
    const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
    const yearMonthPrefix = `${year}-${month}`;

    const monthDays = schoolDays.filter(day => day.date.startsWith(yearMonthPrefix));

    const regularDays = monthDays.filter(d => d.dayType === 'regular').length;
    const saturdayDays = monthDays.filter(d => d.dayType === 'saturday').length;
    const totalSchoolDays = regularDays + saturdayDays;
    const completedSchoolDays = monthDays.filter(d => 
      (d.dayType === 'regular' || d.dayType === 'saturday') && d.isCompleted
    ).length;

    return { regularDays, saturdayDays, totalSchoolDays, completedSchoolDays };
  };

  // Calcular estatísticas acumuladas do ano até o mês atual
  const getYearToDateStatistics = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;

    const ytdDays = yearSchoolDays.filter(day => {
      const [dayYear, dayMonth] = day.date.split('-').map(Number);
      return dayYear === year && dayMonth <= month;
    });

    const regularDays = ytdDays.filter(d => d.dayType === 'regular').length;
    const saturdayDays = ytdDays.filter(d => d.dayType === 'saturday').length;
    const totalSchoolDays = regularDays + saturdayDays;

    return { regularDays, saturdayDays, totalSchoolDays };
  };

  // Verificar se um dia já passou
  const isDayPast = (date: Date): boolean => {
    if (date.getTime() === 0) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const handlePrint = async () => {
    const header = await loadPrintHeader();
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const monthName = selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const days = getDaysInMonth();
    const monthStats = getMonthStatistics();
    const ytdStats = getYearToDateStatistics();
    const weekdayLabels: Record<string, string> = {
      monday: 'Segunda-feira',
      tuesday: 'Terça-feira',
      wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira',
      friday: 'Sexta-feira',
    };

    const calendarRows = buildCalendarRows(days, schoolDays, weekdayLabels);
    const saturdayRefHtml = buildSaturdayRefHtml(schoolDays, weekdayLabels);

    const printHtml = buildPrintPage(
      `Calendário Letivo — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`,
      [{ monthTitle: '', calendarRows, saturdayRefHtml, stats: monthStats }],
      ytdStats,
      false,
      false,
      header
    );

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  const handlePrintAllMonths = async () => {
    try {
      if (!user) return;
      const schoolId = user.schoolId || (user.role === 'school' ? user.id : null);
      if (!schoolId) return;

      const header = await loadPrintHeader();
      toast.loading('Carregando dados de todos os meses...');
      const year = selectedMonth.getFullYear();

      // Fetch all school days for the year
      const yearRes = await schoolDayAPI.getAll(schoolId, {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      });
      const allDays: SchoolDay[] = yearRes.data.data || [];

      const weekdayLabels: Record<string, string> = {
        monday: 'Segunda-feira',
        tuesday: 'Terça-feira',
        wednesday: 'Quarta-feira',
        thursday: 'Quinta-feira',
        friday: 'Sexta-feira',
      };

      const months: { monthTitle: string; calendarRows: string; saturdayRefHtml: string; stats: ReturnType<typeof getMonthStatistics> }[] = [];

      for (let m = 0; m < 12; m++) {
        const monthDate = new Date(year, m, 1);
        const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'long' });
        const monthPrefix = `${year}-${String(m + 1).padStart(2, '0')}`;
        const monthDays = allDays.filter(d => d.date.startsWith(monthPrefix));

        // Generate calendar grid for this month
        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0);
        const gridDays: Date[] = [];
        for (let i = 0; i < firstDay.getDay(); i++) gridDays.push(new Date(0));
        for (let i = 1; i <= lastDay.getDate(); i++) gridDays.push(new Date(year, m, i));

        const regularDays = monthDays.filter(d => d.dayType === 'regular').length;
        const saturdayDays = monthDays.filter(d => d.dayType === 'saturday').length;
        const totalSchoolDays = regularDays + saturdayDays;
        const completedSchoolDays = monthDays.filter(d => (d.dayType === 'regular' || d.dayType === 'saturday') && d.isCompleted).length;

        months.push({
          monthTitle: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          calendarRows: buildCalendarRows(gridDays, monthDays, weekdayLabels),
          saturdayRefHtml: buildSaturdayRefHtml(monthDays, weekdayLabels),
          stats: { regularDays, saturdayDays, totalSchoolDays, completedSchoolDays },
        });
      }

      // Year-to-date stats (full year)
      const allRegular = allDays.filter(d => d.dayType === 'regular').length;
      const allSaturday = allDays.filter(d => d.dayType === 'saturday').length;
      const ytdStats = { regularDays: allRegular, saturdayDays: allSaturday, totalSchoolDays: allRegular + allSaturday };

      const printHtml = buildPrintPage(
        `Calendário Letivo ${year} — Todos os Meses`,
        months,
        ytdStats,
        true,
        false,
        header
      );

      toast.dismiss();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao carregar dados para impressão');
    }
  };

  const handlePrintAllMonthsSinglePage = async () => {
    try {
      if (!user) return;
      const schoolId = user.schoolId || (user.role === 'school' ? user.id : null);
      if (!schoolId) return;

      const header = await loadPrintHeader();
      toast.loading('Carregando dados de todos os meses...');
      const year = selectedMonth.getFullYear();

      const yearRes = await schoolDayAPI.getAll(schoolId, {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      });
      const allDays: SchoolDay[] = yearRes.data.data || [];

      const weekdayLabels: Record<string, string> = {
        monday: 'Segunda-feira',
        tuesday: 'Terça-feira',
        wednesday: 'Quarta-feira',
        thursday: 'Quinta-feira',
        friday: 'Sexta-feira',
      };

      const months: { monthTitle: string; calendarRows: string; saturdayRefHtml: string; stats: ReturnType<typeof getMonthStatistics> }[] = [];

      for (let m = 0; m < 12; m++) {
        const monthDate = new Date(year, m, 1);
        const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'long' });
        const monthPrefix = `${year}-${String(m + 1).padStart(2, '0')}`;
        const monthDays = allDays.filter(d => d.date.startsWith(monthPrefix));

        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0);
        const gridDays: Date[] = [];
        for (let i = 0; i < firstDay.getDay(); i++) gridDays.push(new Date(0));
        for (let i = 1; i <= lastDay.getDate(); i++) gridDays.push(new Date(year, m, i));

        const regularDays = monthDays.filter(d => d.dayType === 'regular').length;
        const saturdayDays = monthDays.filter(d => d.dayType === 'saturday').length;
        const totalSchoolDays = regularDays + saturdayDays;
        const completedSchoolDays = monthDays.filter(d => (d.dayType === 'regular' || d.dayType === 'saturday') && d.isCompleted).length;

        months.push({
          monthTitle: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          calendarRows: buildCalendarRows(gridDays, monthDays, weekdayLabels),
          saturdayRefHtml: buildSaturdayRefHtml(monthDays, weekdayLabels),
          stats: { regularDays, saturdayDays, totalSchoolDays, completedSchoolDays },
        });
      }

      const allRegular = allDays.filter(d => d.dayType === 'regular').length;
      const allSaturday = allDays.filter(d => d.dayType === 'saturday').length;
      const ytdStats = { regularDays: allRegular, saturdayDays: allSaturday, totalSchoolDays: allRegular + allSaturday };

      const printHtml = buildPrintPage(
        `Calendário Letivo ${year} — Visão Geral`,
        months,
        ytdStats,
        true,
        true,
        header
      );

      toast.dismiss();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao carregar dados para impressão');
    }
  };

  // Helper: build calendar rows HTML from a days grid and corresponding school days array
  const buildCalendarRows = (days: Date[], daysData: SchoolDay[], weekdayLabels: Record<string, string>) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let rows = '';
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      rows += '<tr>';
      week.forEach(date => {
        if (date.getTime() === 0) {
          rows += '<td class="empty"></td>';
          return;
        }
        const dateStr = date.toISOString().split('T')[0];
        const schoolDay = daysData.find(d => d.date === dateStr);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        const isPast = compareDate < today;
        let cellClass = '';
        let content = `<div class="day-number">${date.getDate()}</div>`;

        if (schoolDay) {
          cellClass = schoolDay.dayType;
          if (schoolDay.isCompleted) cellClass += ' completed';
          if (isPast && !schoolDay.isCompleted && (schoolDay.dayType === 'regular' || schoolDay.dayType === 'saturday')) {
            cellClass += ' past-incomplete';
          }
          content += `<div class="day-type">${getDayTypeLabel(schoolDay.dayType)}</div>`;
          if (schoolDay.dayType === 'saturday' && schoolDay.followWeekday) {
            content += `<div class="follow-weekday">📅 Segue: ${weekdayLabels[schoolDay.followWeekday] || schoolDay.followWeekday}</div>`;
          }
          if (schoolDay.notes) {
            content += `<div class="notes">📝 ${schoolDay.notes.replace(/\n/g, ', ')}</div>`;
          }
          if (schoolDay.isCompleted) {
            content += '<div class="status completed-status">✓ Cumprido</div>';
          } else {
            content += '<div class="status pending-status">○ Pendente</div>';
          }
        }
        rows += `<td class="${cellClass}">${content}</td>`;
      });
      rows += '</tr>';
    }
    return rows;
  };

  // Helper: build saturday reference table HTML
  const buildSaturdayRefHtml = (daysData: SchoolDay[], weekdayLabels: Record<string, string>) => {
    const saturdayDays = daysData.filter(d => d.dayType === 'saturday' && d.followWeekday);
    if (saturdayDays.length === 0) return '';
    return `
      <div class="saturday-ref">
        <h3>📅 Sábados Letivos — Correspondência de Dias</h3>
        <table class="ref-table">
          <thead><tr><th>Data</th><th>Segue horário de</th><th>Observações</th><th>Situação</th></tr></thead>
          <tbody>
            ${saturdayDays.map(d => {
              const dateObj = new Date(d.date + 'T12:00:00');
              return `<tr>
                <td>${dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                <td><strong>${weekdayLabels[d.followWeekday!] || d.followWeekday}</strong></td>
                <td>${d.notes ? d.notes.replace(/\n/g, ', ') : '—'}</td>
                <td>${d.isCompleted ? '✓ Cumprido' : '○ Pendente'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  };

  // Helper: build full print HTML page
  const buildPrintPage = (
    title: string,
    monthsData: { monthTitle: string; calendarRows: string; saturdayRefHtml: string; stats: { regularDays: number; saturdayDays: number; totalSchoolDays: number; completedSchoolDays: number } }[],
    ytdStats: { regularDays: number; saturdayDays: number; totalSchoolDays: number },
    isAllMonths: boolean,
    singlePage: boolean = false,
    headerData?: PrintHeaderData
  ) => {
    const monthsHtml = monthsData.map((m, idx) => {
      const monthSection = isAllMonths ? `<h2 class="month-title">${m.monthTitle}</h2>` : '';
      return `
        ${idx > 0 && !singlePage ? '<div class="page-break"></div>' : ''}
        <div class="month-container ${singlePage ? 'compact' : ''}">
          ${monthSection}
          <div class="stats-bar">
            <div class="stat-card stat-regular"><span class="stat-value">${m.stats.regularDays}</span><span class="stat-label">Regulares</span></div>
            <div class="stat-card stat-saturday"><span class="stat-value">${m.stats.saturdayDays}</span><span class="stat-label">Sáb. Letivos</span></div>
            <div class="stat-card stat-total"><span class="stat-value">${m.stats.totalSchoolDays}</span><span class="stat-label">Total</span></div>
            <div class="stat-card stat-cumpridos"><span class="stat-value">${m.stats.completedSchoolDays}</span><span class="stat-label">Cumpridos</span></div>
            ${idx === 0 && !singlePage ? `<div class="stat-card stat-acumulado"><span class="stat-value">${ytdStats.totalSchoolDays}</span><span class="stat-label">Acumulado Ano</span></div>` : ''}
          </div>
          <table class="calendar">
            <thead><tr>
              <th class="weekend">Dom</th><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th class="weekend">Sáb</th>
            </tr></thead>
            <tbody>${m.calendarRows}</tbody>
          </table>
          ${m.saturdayRefHtml}
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1a2e;
      padding: 24px;
      background: linear-gradient(135deg, #0f9b58 0%, #0d7a46 50%, #2d8f5e 100%);
      min-height: 100vh;
    }
    .container {
      background: rgba(255,255,255,0.97);
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.6);
      backdrop-filter: blur(10px);
    }
    .header { text-align: center; margin-bottom: 24px; position: relative; }
    .header::after { content: ''; display: block; width: 120px; height: 4px; background: linear-gradient(90deg, #0f9b58, #2d8f5e, #6dd5a0); border-radius: 2px; margin: 12px auto 0; }
    h1 { font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #0d7a46 0%, #0f9b58 50%, #2d8f5e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px; text-transform: uppercase; }
    .subtitle { text-align: center; font-size: 12px; color: #8b8fa3; margin-top: 6px; font-weight: 400; letter-spacing: 0.5px; }

    .month-title { font-size: 22px; font-weight: 800; text-align: center; color: #0d7a46; margin: 8px 0 16px; text-transform: uppercase; letter-spacing: 1px; }
    .month-title::after { content: ''; display: block; width: 80px; height: 3px; background: linear-gradient(90deg, #0f9b58, #6dd5a0); border-radius: 2px; margin: 6px auto 0; }

    .page-break { page-break-before: always; margin-top: 32px; padding-top: 16px; border-top: 2px dashed #d1d5db; }

    .month-container {
      border: 3px solid transparent;
      border-image: linear-gradient(135deg, #059669, #10b981, #34d399, #6ee7b7, #34d399, #10b981, #059669) 1;
      border-radius: 0;
      padding: 24px;
      margin: 20px 0;
      position: relative;
      background: linear-gradient(145deg, rgba(236,253,245,0.3), rgba(255,255,255,0.95));
      box-shadow: 0 4px 20px rgba(16,185,129,0.08), 0 1px 3px rgba(0,0,0,0.04);
    }
    .month-container::before {
      content: '';
      position: absolute;
      top: -6px; left: -6px; right: -6px; bottom: -6px;
      border: 2px solid rgba(16,185,129,0.15);
      border-radius: 4px;
      pointer-events: none;
    }
    .month-container.compact {
      padding: 12px;
      margin: 10px 0;
      page-break-inside: avoid;
    }
    .month-container.compact .stats-bar { gap: 6px; margin-bottom: 10px; }
    .month-container.compact .stat-card { padding: 4px 10px; }
    .month-container.compact .stat-card .stat-value { font-size: 15px; }
    .month-container.compact .stat-card .stat-label { font-size: 8px; }
    .month-container.compact table.calendar td { height: 55px; min-height: 50px; padding: 3px; }
    .month-container.compact .day-number { font-size: 13px; width: 24px; height: 24px; }
    .month-container.compact .day-type { font-size: 7px; padding: 1px 4px; }
    .month-container.compact .follow-weekday { font-size: 7px; padding: 1px 4px; }
    .month-container.compact .notes { font-size: 7px; }
    .month-container.compact .status { font-size: 7px; padding: 1px 4px; }
    .month-container.compact .month-title { font-size: 16px; margin: 4px 0 8px; }
    .month-container.compact table.calendar th { padding: 5px 3px; font-size: 9px; }
    .month-container.compact .saturday-ref { margin-top: 10px; padding: 10px; }
    .month-container.compact .saturday-ref h3 { font-size: 11px; margin-bottom: 6px; }
    .month-container.compact table.ref-table { font-size: 9px; }
    .month-container.compact table.ref-table th, .month-container.compact table.ref-table td { padding: 4px 6px; }

    /* Single page specific styles */
    .single-page-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .single-page-grid .month-container { margin: 0; }
    .single-page-summary { text-align: center; margin: 16px 0; padding: 12px 20px; background: linear-gradient(145deg, #ecfdf5, #d1fae5); border-radius: 14px; border: 2px solid rgba(16,185,129,0.2); }
    .single-page-summary .stat-value { font-size: 28px; font-weight: 900; color: #047857; }
    .single-page-summary .stat-label { font-size: 11px; color: #065f46; text-transform: uppercase; letter-spacing: 1px; }

    .stats-bar { display: flex; justify-content: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat-card { padding: 10px 20px; border-radius: 14px; text-align: center; font-size: 12px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05), inset 0 -2px 0 rgba(0,0,0,0.05); position: relative; overflow: hidden; }
    .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 14px 14px 0 0; }
    .stat-card .stat-value { font-size: 22px; font-weight: 800; display: block; margin-bottom: 2px; }
    .stat-card .stat-label { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.8; }
    .stat-regular { background: linear-gradient(145deg, #d1fae5, #a7f3d0); color: #065f46; }
    .stat-regular::before { background: #10b981; }
    .stat-saturday { background: linear-gradient(145deg, #d1fae5, #6ee7b7); color: #064e3b; }
    .stat-saturday::before { background: #059669; }
    .stat-total { background: linear-gradient(145deg, #ecfdf5, #d1fae5); color: #047857; }
    .stat-total::before { background: #34d399; }
    .stat-cumpridos { background: linear-gradient(145deg, #fef3c7, #fde68a); color: #92400e; }
    .stat-cumpridos::before { background: #f59e0b; }
    .stat-acumulado { background: linear-gradient(145deg, #fce7f3, #fbcfe8); color: #9d174d; }
    .stat-acumulado::before { background: #ec4899; }

    table.calendar { width: 100%; border-collapse: separate; border-spacing: 4px; table-layout: fixed; }
    table.calendar th { background: linear-gradient(145deg, #0d7a46, #0f9b58); color: white; padding: 10px 6px; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; border-radius: 10px; box-shadow: 0 3px 10px rgba(15,155,88,0.3); }
    table.calendar th.weekend { background: linear-gradient(145deg, #059669, #10b981); box-shadow: 0 3px 10px rgba(5,150,105,0.3); }
    table.calendar td { vertical-align: top; padding: 8px; min-height: 85px; height: 95px; font-size: 11px; border-radius: 12px; text-align: center; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 -2px 0 rgba(0,0,0,0.03); }
    table.calendar td.empty { background: linear-gradient(145deg, #f8fafc, #f1f5f9); box-shadow: none; opacity: 0.4; }

    .day-number { font-weight: 800; font-size: 18px; margin-bottom: 3px; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 10px; background: rgba(255,255,255,0.7); box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
    .day-type { font-size: 8px; font-weight: 700; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.8px; padding: 2px 6px; border-radius: 6px; display: inline-block; }
    .follow-weekday { font-size: 9px; color: #065f46; font-weight: 700; background: linear-gradient(135deg, #d1fae5, #a7f3d0); padding: 3px 8px; border-radius: 8px; margin: 2px auto; display: inline-block; box-shadow: 0 2px 6px rgba(5,150,105,0.15); border: 1px solid rgba(16,185,129,0.3); }
    .notes { font-size: 8px; color: #64748b; font-style: italic; margin: 2px 0; word-break: break-word; line-height: 1.3; }
    .status { font-size: 8px; font-weight: 700; padding: 2px 8px; border-radius: 6px; display: inline-block; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .completed-status { color: #065f46; background: linear-gradient(135deg, #d1fae5, #a7f3d0); box-shadow: 0 2px 4px rgba(16,185,129,0.2); }
    .pending-status { color: #78716c; background: linear-gradient(135deg, #f5f5f4, #e7e5e4); }

    /* Green theme for regular school days */
    td.regular { background: linear-gradient(145deg, #ecfdf5, #d1fae5); border-left: 4px solid #10b981; }
    td.regular .day-type { background: rgba(16,185,129,0.15); color: #047857; }
    td.regular .day-number { color: #065f46; }
    td.regular.completed { background: linear-gradient(145deg, #6ee7b7, #34d399); box-shadow: 0 4px 15px rgba(16,185,129,0.3), inset 0 -2px 0 rgba(0,0,0,0.08); }
    td.regular.completed .day-number { color: #fff; background: rgba(6,95,70,0.4); }
    td.regular.completed .day-type { color: #fff; background: rgba(255,255,255,0.2); }

    td.saturday { background: linear-gradient(145deg, #ecfdf5, #a7f3d0); border-left: 4px solid #059669; box-shadow: 0 4px 15px rgba(5,150,105,0.2), 0 1px 3px rgba(0,0,0,0.05); }
    td.saturday .day-type { background: rgba(5,150,105,0.15); color: #064e3b; }
    td.saturday .day-number { color: #064e3b; background: rgba(209,250,229,0.8); }
    td.saturday.completed { background: linear-gradient(145deg, #34d399, #10b981); box-shadow: 0 6px 20px rgba(5,150,105,0.35), inset 0 -2px 0 rgba(0,0,0,0.1); }
    td.saturday.completed .day-number { color: #fff; background: rgba(6,78,59,0.4); }
    td.saturday.completed .day-type { color: #fff; background: rgba(255,255,255,0.2); }

    td.holiday { background: linear-gradient(145deg, #fff1f2, #ffe4e6); border-left: 4px solid #f43f5e; }
    td.holiday .day-type { background: rgba(244,63,94,0.12); color: #be123c; }
    td.holiday .day-number { color: #be123c; }

    td.recess { background: linear-gradient(145deg, #fffbeb, #fef3c7); border-left: 4px solid #f59e0b; }
    td.recess .day-type { background: rgba(245,158,11,0.12); color: #b45309; }
    td.recess .day-number { color: #b45309; }

    td.past-incomplete { background: linear-gradient(145deg, #e2e8f0, #cbd5e1) !important; opacity: 0.7; border-left: 4px solid #94a3b8 !important; }
    td.past-incomplete .day-number { color: #64748b; background: rgba(148,163,184,0.2); }

    .saturday-ref { margin-top: 28px; page-break-inside: avoid; background: linear-gradient(145deg, #ecfdf5, #d1fae5); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.8); border: 1px solid rgba(16,185,129,0.15); }
    .saturday-ref h3 { font-size: 15px; margin-bottom: 14px; color: #065f46; font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
    .saturday-ref h3::after { content: ''; display: block; width: 60px; height: 3px; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 2px; margin: 8px auto 0; }
    table.ref-table { width: 100%; border-collapse: separate; border-spacing: 0 4px; font-size: 12px; }
    table.ref-table th { background: linear-gradient(145deg, #059669, #047857); color: white; padding: 10px 14px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; font-size: 10px; }
    table.ref-table th:first-child { border-radius: 10px 0 0 10px; }
    table.ref-table th:last-child { border-radius: 0 10px 10px 0; }
    table.ref-table td { padding: 10px 14px; background: white; text-align: center; font-weight: 500; }
    table.ref-table tbody tr { box-shadow: 0 2px 6px rgba(0,0,0,0.04); border-radius: 10px; }
    table.ref-table tbody tr td:first-child { border-radius: 10px 0 0 10px; }
    table.ref-table tbody tr td:last-child { border-radius: 0 10px 10px 0; }
    table.ref-table tbody tr:nth-child(even) td { background: #ecfdf5; }

    .legend-container { margin-top: 28px; background: linear-gradient(145deg, #f8fafc, #f1f5f9); border-radius: 16px; padding: 20px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); }
    .legend-title { text-align: center; font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px; }
    .legend { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .legend-item { display: flex; align-items: center; gap: 8px; background: white; padding: 8px 14px; border-radius: 10px; font-size: 11px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.04); }
    .legend-color { width: 18px; height: 18px; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.15), inset 0 -1px 0 rgba(0,0,0,0.1); }

    ${printFooterCss}

    @media print {
      body { padding: 0; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .container { box-shadow: none; border-radius: 0; padding: 16px; }
      @page { size: landscape; margin: 8mm; }
      .page-break { page-break-before: always; margin-top: 0; padding-top: 0; border-top: none; }
      .month-container { box-shadow: none; }
      .month-container::before { display: none; }
      table.calendar td { height: 85px; }
      .single-page-grid { gap: 4px; }
      .single-page-grid .month-container { padding: 8px; margin: 0; }
      .stat-card, .legend-item, td.regular, td.saturday, td.holiday, td.recess,
      td.regular.completed, td.saturday.completed, td.past-incomplete,
      .saturday-ref, .legend-container, table.ref-table th, table.ref-table td,
      .day-number, .day-type, .follow-weekday, .completed-status, .pending-status,
      table.calendar th, table.calendar th.weekend, .month-container, .single-page-summary {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    ${printHeaderCss}
  </style>
</head>
<body>
<div class="container">
  ${headerData ? buildPrintHeaderHtml(headerData) : ''}
  <div class="header">
    <h1>${title}</h1>
    <div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  </div>

  ${singlePage ? `
    <div class="single-page-summary">
      <span class="stat-value">${ytdStats.totalSchoolDays}</span>
      <span class="stat-label"> dias letivos no ano (${ytdStats.regularDays} regulares + ${ytdStats.saturdayDays} sábados)</span>
    </div>
    <div class="single-page-grid">${monthsHtml}</div>
  ` : monthsHtml}

  <div class="legend-container">
    <div class="legend-title">Legenda</div>
    <div class="legend">
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(145deg,#ecfdf5,#d1fae5);border:2px solid #10b981"></span> Regular Pendente</div>
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(145deg,#6ee7b7,#34d399);border:2px solid #059669"></span> Regular Cumprido</div>
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(145deg,#ecfdf5,#a7f3d0);border:2px solid #059669"></span> Sábado Pendente</div>
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(145deg,#34d399,#10b981);border:2px solid #047857"></span> Sábado Cumprido</div>
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(145deg,#fff1f2,#ffe4e6);border:2px solid #f43f5e"></span> Feriado</div>
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(145deg,#fffbeb,#fef3c7);border:2px solid #f59e0b"></span> Recesso</div>
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(145deg,#e2e8f0,#cbd5e1);border:2px solid #94a3b8"></span> Passado não cumprido</div>
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:2px solid #10b981"></span> ✓ Cumprido</div>
      <div class="legend-item"><span class="legend-color" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:2px solid #059669"></span> Correspondência de dia</div>
    </div>
  </div>

  <div class="footer">© ${new Date().getFullYear()} Wander Pires Silva Coelho — Sistema Criador de Horário de Aula</div>
  ${buildPrintFooterHtml()}
</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
  };

  const previousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-8 h-8" />
          Calendário Letivo
        </h1>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              title="Imprimir Calendário Letivo"
            >
              <Printer className="w-5 h-5" />
              Imprimir
            </button>
            {showPrintMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPrintMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                  <button
                    onClick={() => { handlePrint(); setShowPrintMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 text-gray-700 flex items-center gap-2 text-sm font-medium border-b border-gray-100"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    Mês Atual
                  </button>
                  <button
                    onClick={() => { handlePrintAllMonths(); setShowPrintMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 text-gray-700 flex items-center gap-2 text-sm font-medium border-b border-gray-100"
                  >
                    <Calendar className="w-4 h-4 text-green-600" />
                    Todos os Meses (separados)
                  </button>
                  <button
                    onClick={() => { handlePrintAllMonthsSinglePage(); setShowPrintMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 text-gray-700 flex items-center gap-2 text-sm font-medium"
                  >
                    <LayoutGrid className="w-4 h-4 text-green-600" />
                    Todos os Meses (página única)
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setEditingDay(null);
              setFormData({ date: '', dayType: 'regular', scheduleId: '', notes: '', followWeekday: '' });
              setSelectedNotes([]);
              setSearchNote('');
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Dia Letivo
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Total de Dias Letivos (Ano)</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.totalDays}</div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.regularDays || 0} regulares + {statistics.saturdayDays || 0} sábados
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Dias Trabalhados</div>
            <div className="text-2xl font-bold text-green-700">{statistics.completedDays}</div>
            <div className="text-xs text-gray-500 mt-1">✓ Cumpridos no ano</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="text-sm text-gray-600">Dias Faltantes</div>
            <div className="text-2xl font-bold text-orange-700">{statistics.remainingDays}</div>
            <div className="text-xs text-gray-500 mt-1">○ Restantes no ano</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Taxa de Conclusão</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.completionRate}%</div>
          </div>
        </div>
      )}

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={previousMonth}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            ← Anterior
          </button>
          <h2 className="text-xl font-bold">
            {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={nextMonth}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Próximo →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center font-bold text-gray-700 py-2">
              {day}
            </div>
          ))}

          {getDaysInMonth().map((date, index) => {
            const schoolDay = getSchoolDayForDate(date);
            const isEmpty = date.getTime() === 0;
            const isPast = isDayPast(date);

            return (
              <div
                key={index}
                className={`min-h-32 border-2 rounded-lg p-2 transition-all ${
                  isEmpty
                    ? 'bg-gray-50 border-gray-200'
                    : schoolDay
                    ? getDayTypeColor(schoolDay.dayType, schoolDay.isCompleted, isPast)
                    : 'bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300'
                }`}
              >
                {!isEmpty && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{date.getDate()}</span>
                      {schoolDay && (
                        <div className="flex gap-1">
                          {schoolDay.isCompleted ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {schoolDay && (
                      <div className="text-xs space-y-1">
                        <div className="font-bold text-sm">{getDayTypeLabel(schoolDay.dayType)}</div>
                        
                        {/* Observações do dia */}
                        {schoolDay.notes && (
                          <div className="bg-white bg-opacity-70 p-1 rounded border border-gray-300">
                            <div className="text-gray-700 text-xs italic">
                              📝 {schoolDay.notes}
                            </div>
                          </div>
                        )}
                        
                        {schoolDay.dayType === 'saturday' && schoolDay.followWeekday && (
                          <div className="text-purple-800 font-medium">
                            📅 Segue: {getWeekdayLabel(schoolDay.followWeekday)}
                          </div>
                        )}
                        {schoolDay.schedule && (
                          <div className="text-gray-700 font-medium truncate">⏰ {schoolDay.schedule.name}</div>
                        )}
                        
                        {/* Informação sobre horário emergencial ou normal */}
                        {(() => {
                          const emergency = getEmergencyScheduleForDate(date);
                          if (emergency) {
                            const absentTeacherNames = emergency.absentTeacherNames || 
                              (emergency.absentTeacherName ? [emergency.absentTeacherName] : ['Professor não especificado']);
                            const teachersList = Array.isArray(absentTeacherNames) 
                              ? absentTeacherNames.join(', ') 
                              : absentTeacherNames;
                            
                            return (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                <div className="flex items-center gap-1 text-red-700 font-bold mb-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="flex-1">HORÁRIO EMERGENCIAL</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteEmergencySchedule(emergency._id || emergency.id); }}
                                    className="ml-auto text-red-400 hover:text-red-700 transition-colors"
                                    title="Excluir horário emergencial"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="text-red-600 text-xs">
                                  <div className="font-medium">Ausente(s):</div>
                                  <div className="truncate">{teachersList}</div>
                                  {emergency.reason && (
                                    <div className="mt-1">
                                      <span className="font-medium">Motivo:</span> {emergency.reason}
                                    </div>
                                  )}
                                  {emergency.classNames && emergency.classNames.length > 0 && (
                                    <div className="mt-1">
                                      <span className="font-medium">Turmas:</span> {emergency.classNames.join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                <div className="flex items-center gap-1 text-green-700 font-medium">
                                  <Check className="w-3 h-3" />
                                  <span className="text-xs">Horário Normal</span>
                                </div>
                              </div>
                            );
                          }
                        })()}
                        
                        <div className="flex gap-1 mt-2 flex-wrap">
                          <button
                            onClick={() => handleToggleCompleted(schoolDay)}
                            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              schoolDay.isCompleted
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                            }`}
                            title={schoolDay.isCompleted ? 'Marcar pendente' : 'Marcar cumprido'}
                          >
                            {schoolDay.isCompleted ? '✓ Cumprido' : '○ Pendente'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingDay(schoolDay);
                              const notes = schoolDay.notes || '';
                              const notesArray = notes.split('\n').map(n => n.trim()).filter(n => n);
                              setSelectedNotes(notesArray);
                              setSearchNote('');
                              setFormData({
                                date: schoolDay.date,
                                dayType: schoolDay.dayType as 'regular',
                                scheduleId: schoolDay.scheduleId || '',
                                notes: notes,
                                followWeekday: schoolDay.followWeekday || '',
                              });
                              setShowModal(true);
                            }}
                            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="Editar dia"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(schoolDay.id)}
                            className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                            title="Excluir dia"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {!schoolDay && (
                      <>
                        {/* Informação sobre horário emergencial mesmo sem schoolDay cadastrado */}
                        {(() => {
                          const emergency = getEmergencyScheduleForDate(date);
                          if (emergency) {
                            const absentTeacherNames = emergency.absentTeacherNames || 
                              (emergency.absentTeacherName ? [emergency.absentTeacherName] : ['Professor não especificado']);
                            const teachersList = Array.isArray(absentTeacherNames) 
                              ? absentTeacherNames.join(', ') 
                              : absentTeacherNames;
                            
                            return (
                              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                                <div className="flex items-center gap-1 text-red-700 font-bold mb-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-xs flex-1">EMERGENCIAL</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteEmergencySchedule(emergency._id || emergency.id); }}
                                    className="ml-auto text-red-400 hover:text-red-700 transition-colors"
                                    title="Excluir horário emergencial"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="text-red-600 text-xs">
                                  <div className="truncate">{teachersList}</div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        <button
                          onClick={() => {
                            setEditingDay(null);
                            const dateStr = date.toISOString().split('T')[0];
                            const isSaturday = date.getDay() === 6;
                            setSelectedNotes([]);
                            setSearchNote('');
                            setFormData({
                              date: dateStr,
                              dayType: isSaturday ? 'saturday' : 'regular',
                              scheduleId: '',
                              notes: '',
                              followWeekday: '',
                            });
                            setShowModal(true);
                          }}
                          className="w-full px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium transition-colors"
                        >
                          + Adicionar Dia Letivo
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contadores e Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contador do Mês Atual */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Dias Letivos - {selectedMonth.toLocaleDateString('pt-BR', { month: 'long' })}
          </h3>
          <div className="space-y-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Dias Regulares:</span>
                <span className="text-2xl font-bold">{getMonthStatistics().regularDays}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Sábados Letivos:</span>
                <span className="text-2xl font-bold">{getMonthStatistics().saturdayDays}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-30 rounded-lg p-3 border-2 border-white">
              <div className="flex justify-between items-center">
                <span className="font-bold">Total do Mês:</span>
                <span className="text-3xl font-bold">{getMonthStatistics().totalSchoolDays}</span>
              </div>
            </div>
            <div className="bg-green-500 bg-opacity-40 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Cumpridos no Mês:</span>
                <span className="text-xl font-bold">{getMonthStatistics().completedSchoolDays}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contador Acumulado do Ano */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Acumulado até {selectedMonth.toLocaleDateString('pt-BR', { month: 'long' })}
          </h3>
          <div className="space-y-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Dias Regulares:</span>
                <span className="text-2xl font-bold">{getYearToDateStatistics().regularDays}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Sábados Letivos:</span>
                <span className="text-2xl font-bold">{getYearToDateStatistics().saturdayDays}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-30 rounded-lg p-3 border-2 border-white">
              <div className="flex justify-between items-center">
                <span className="font-bold">Total Acumulado:</span>
                <span className="text-3xl font-bold">{getYearToDateStatistics().totalSchoolDays}</span>
              </div>
            </div>
            <div className="text-xs bg-white bg-opacity-20 rounded p-2 mt-2">
              📊 Soma de janeiro até {selectedMonth.toLocaleDateString('pt-BR', { month: 'long' })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Legenda do Calendário
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">

            {/* Coluna 1 — Dias Regulares */}
            <div className="space-y-2 min-w-0">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 border-b pb-1">Dias Regulares</h4>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-100 border-2 border-blue-400 flex-shrink-0"></div>
                <span className="text-sm text-gray-700">Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-400 border-2 border-blue-600 flex-shrink-0 shadow-sm"></div>
                <span className="text-sm font-semibold text-gray-800">Cumprido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gray-300 border-2 border-gray-500 flex-shrink-0 opacity-80"></div>
                <span className="text-sm text-gray-500 italic">Passado não cumprido</span>
              </div>
            </div>

            {/* Coluna 2 — Sábados */}
            <div className="space-y-2 min-w-0">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 border-b pb-1">Sábados Letivos</h4>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-100 border-2 border-purple-400 flex-shrink-0"></div>
                <span className="text-sm text-gray-700">Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-400 border-2 border-purple-600 flex-shrink-0 shadow-sm"></div>
                <span className="text-sm font-semibold text-gray-800">Cumprido</span>
              </div>
            </div>

            {/* Coluna 3 — Não Letivos */}
            <div className="space-y-2 min-w-0">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 border-b pb-1">Não Letivos</h4>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-300 border-2 border-red-500 flex-shrink-0"></div>
                <span className="text-sm text-gray-700">Feriado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-300 border-2 border-yellow-500 flex-shrink-0"></div>
                <span className="text-sm text-gray-700">Recesso</span>
              </div>
            </div>

            {/* Coluna 4 — Horários */}
            <div className="space-y-2 min-w-0">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 border-b pb-1">Horários</h4>
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-300 flex-shrink-0 whitespace-nowrap">
                  <Check className="w-3 h-3" /> NORMAL
                </span>
                <span className="text-sm text-gray-700 truncate">Ativo</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300 flex-shrink-0 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" /> EMERG.
                </span>
                <span className="text-sm text-gray-700 truncate">Emergencial</span>
              </div>
            </div>

          </div>

          <div className="mt-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Clique em qualquer dia para adicionar ou editar informações.
              Use as observações para registrar motivos de feriados, recessos ou eventos especiais.
              Dias passados que não foram cumpridos aparecem em cinza automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {editingDay ? 'Editar Dia Letivo' : 'Novo Dia Letivo'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => {
                    const selectedDate = new Date(e.target.value + 'T00:00:00');
                    const isSaturday = selectedDate.getDay() === 6;
                    setFormData({ 
                      ...formData, 
                      date: e.target.value,
                      dayType: isSaturday ? 'saturday' : formData.dayType === 'saturday' ? 'regular' : formData.dayType
                    });
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formData.dayType}
                  onChange={e =>
                    setFormData({ ...formData, dayType: e.target.value as any })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="regular">Dia Regular</option>
                  <option value="saturday">Sábado Letivo</option>
                  <option value="holiday">Feriado</option>
                  <option value="recess">Recesso</option>
                </select>
              </div>

              {/* Seleção de dia da semana para sábados letivos */}
              {formData.dayType === 'saturday' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    📅 Seguir horário de qual dia da semana?
                  </label>
                  <select
                    value={formData.followWeekday}
                    onChange={e =>
                      setFormData({ ...formData, followWeekday: e.target.value as any })
                    }
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="">Selecione o dia da semana</option>
                    <option value="monday">Segunda-feira</option>
                    <option value="tuesday">Terça-feira</option>
                    <option value="wednesday">Quarta-feira</option>
                    <option value="thursday">Quinta-feira</option>
                    <option value="friday">Sexta-feira</option>
                  </select>
                  <p className="text-xs text-blue-700 mt-2">
                    O sábado seguirá o mesmo horário do dia selecionado
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário (Opcional)
                </label>
                <select
                  value={formData.scheduleId}
                  onChange={e => setFormData({ ...formData, scheduleId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione um horário</option>
                  {schedules.map(schedule => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações <span className="text-gray-500 text-xs">(aparecerá no calendário)</span>
                </label>
                
                {/* Campo de busca */}
                <input
                  type="text"
                  value={searchNote}
                  onChange={e => setSearchNote(e.target.value)}
                  placeholder="🔍 Buscar observação..."
                  className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
                />
                
                {/* Container de checkboxes com scroll */}
                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50 mb-3">
                  <div className="space-y-2">
                    {PREDEFINED_NOTES
                      .filter(note => 
                        note.toLowerCase().includes(searchNote.toLowerCase())
                      )
                      .map(note => (
                        <label key={note} className="flex items-start gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedNotes.includes(note)}
                            onChange={e => {
                              if (e.target.checked) {
                                const newNotes = [...selectedNotes, note];
                                setSelectedNotes(newNotes);
                                setFormData({ ...formData, notes: newNotes.join('\\n') });
                              } else {
                                const newNotes = selectedNotes.filter(n => n !== note);
                                setSelectedNotes(newNotes);
                                setFormData({ ...formData, notes: newNotes.join('\\n') });
                              }
                            }}
                            className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700">{note}</span>
                        </label>
                      ))
                    }
                    {searchNote && PREDEFINED_NOTES.filter(note => 
                      note.toLowerCase().includes(searchNote.toLowerCase())
                    ).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nenhuma observação encontrada
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Observações selecionadas */}
                {selectedNotes.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-900 mb-2">
                      ✓ Observações selecionadas ({selectedNotes.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedNotes.map(note => (
                        <span
                          key={note}
                          className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                        >
                          {note}
                          <button
                            type="button"
                            onClick={() => {
                              const newNotes = selectedNotes.filter(n => n !== note);
                              setSelectedNotes(newNotes);
                              setFormData({ ...formData, notes: newNotes.join('\\n') });
                            }}
                            className="text-blue-600 hover:text-blue-800 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  💡 Marque as observações relevantes. Elas aparecerão no calendário.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingDay(null);
                  setSelectedNotes([]);
                  setSearchNote('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolCalendar;
