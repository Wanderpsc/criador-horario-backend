import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, Plus, Edit2, Trash2, Download, FileText, AlertTriangle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { schoolDayAPI, scheduleAPI, emergencyScheduleAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

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

  const handlePrint = () => {
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

    // Build calendar rows
    let calendarRows = '';
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      calendarRows += '<tr>';
      week.forEach(date => {
        if (date.getTime() === 0) {
          calendarRows += '<td class="empty"></td>';
          return;
        }
        const schoolDay = getSchoolDayForDate(date);
        const isPast = isDayPast(date);
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

        calendarRows += `<td class="${cellClass}">${content}</td>`;
      });
      calendarRows += '</tr>';
    }

    // Saturday reference summary
    const saturdayDays = schoolDays.filter(d => d.dayType === 'saturday' && d.followWeekday);
    let saturdayRefHtml = '';
    if (saturdayDays.length > 0) {
      saturdayRefHtml = `
        <div class="saturday-ref">
          <h3>📅 Sábados Letivos — Correspondência de Dias</h3>
          <table class="ref-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Segue horário de</th>
                <th>Observações</th>
                <th>Situação</th>
              </tr>
            </thead>
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
    }

    const printHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Calendário Letivo — ${monthName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #222; padding: 20px; }
    h1 { text-align: center; font-size: 22px; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 13px; color: #555; margin-bottom: 16px; }
    .stats-bar { display: flex; justify-content: center; gap: 24px; margin-bottom: 16px; font-size: 12px; }
    .stats-bar span { padding: 4px 10px; border-radius: 4px; }
    .stats-bar .regular { background: #dbeafe; color: #1e40af; }
    .stats-bar .saturday { background: #f3e8ff; color: #7c3aed; }
    .stats-bar .total { background: #d1fae5; color: #065f46; font-weight: bold; }
    .stats-bar .cumpridos { background: #fef3c7; color: #92400e; }

    table.calendar { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.calendar th { background: #f3f4f6; padding: 6px; text-align: center; font-size: 12px; border: 1px solid #d1d5db; }
    table.calendar td { border: 1px solid #d1d5db; vertical-align: top; padding: 4px; min-height: 80px; height: 90px; font-size: 11px; }
    table.calendar td.empty { background: #f9fafb; }

    .day-number { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
    .day-type { font-size: 10px; font-weight: bold; margin-bottom: 2px; }
    .follow-weekday { font-size: 10px; color: #7c3aed; font-weight: bold; background: #f3e8ff; padding: 1px 4px; border-radius: 3px; margin-bottom: 2px; }
    .notes { font-size: 9px; color: #555; font-style: italic; margin-bottom: 2px; word-break: break-word; }
    .status { font-size: 9px; font-weight: bold; }
    .completed-status { color: #047857; }
    .pending-status { color: #9ca3af; }

    td.regular { background: #eff6ff; }
    td.regular.completed { background: #93c5fd; }
    td.saturday { background: #f5f3ff; border: 2px solid #a78bfa !important; }
    td.saturday.completed { background: #c4b5fd; border: 2px solid #7c3aed !important; }
    td.holiday { background: #fef2f2; }
    td.recess { background: #fefce8; }
    td.past-incomplete { background: #e5e7eb !important; opacity: 0.8; }

    .saturday-ref { margin-top: 20px; page-break-inside: avoid; }
    .saturday-ref h3 { font-size: 14px; margin-bottom: 8px; color: #7c3aed; border-bottom: 2px solid #a78bfa; padding-bottom: 4px; }
    table.ref-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    table.ref-table th { background: #f5f3ff; padding: 6px 8px; text-align: left; border: 1px solid #d1d5db; color: #7c3aed; }
    table.ref-table td { padding: 5px 8px; border: 1px solid #d1d5db; }
    table.ref-table tr:nth-child(even) { background: #faf5ff; }

    .legend { margin-top: 16px; display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; justify-content: center; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-color { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #999; display: inline-block; }

    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }

    @media print {
      body { padding: 10px; }
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <h1>📅 Calendário Letivo — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h1>
  <div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>

  <div class="stats-bar">
    <span class="regular">Regulares: ${monthStats.regularDays}</span>
    <span class="saturday">Sábados Letivos: ${monthStats.saturdayDays}</span>
    <span class="total">Total Mês: ${monthStats.totalSchoolDays}</span>
    <span class="cumpridos">Cumpridos: ${monthStats.completedSchoolDays}</span>
    <span class="total">Acumulado Ano: ${ytdStats.totalSchoolDays}</span>
  </div>

  <table class="calendar">
    <thead>
      <tr>
        <th>Dom</th><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th>
      </tr>
    </thead>
    <tbody>
      ${calendarRows}
    </tbody>
  </table>

  ${saturdayRefHtml}

  <div class="legend">
    <div class="legend-item"><span class="legend-color" style="background:#eff6ff;border-color:#93c5fd"></span> Regular Pendente</div>
    <div class="legend-item"><span class="legend-color" style="background:#93c5fd;border-color:#2563eb"></span> Regular Cumprido</div>
    <div class="legend-item"><span class="legend-color" style="background:#f5f3ff;border-color:#a78bfa"></span> Sábado Letivo Pendente</div>
    <div class="legend-item"><span class="legend-color" style="background:#c4b5fd;border-color:#7c3aed"></span> Sábado Letivo Cumprido</div>
    <div class="legend-item"><span class="legend-color" style="background:#fef2f2;border-color:#f87171"></span> Feriado</div>
    <div class="legend-item"><span class="legend-color" style="background:#fefce8;border-color:#facc15"></span> Recesso</div>
    <div class="legend-item"><span class="legend-color" style="background:#e5e7eb;border-color:#6b7280"></span> Passado não cumprido</div>
  </div>

  <div class="footer">© ${new Date().getFullYear()} Wander Pires Silva Coelho — Sistema Criador de Horário de Aula</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
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
          <button
            onClick={handlePrint}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            title="Imprimir Calendário Letivo"
          >
            <Printer className="w-5 h-5" />
            Imprimir
          </button>
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
