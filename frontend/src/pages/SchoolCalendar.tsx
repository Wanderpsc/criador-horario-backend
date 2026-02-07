import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, Plus, Edit2, Trash2, Download, FileText, AlertTriangle } from 'lucide-react';
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

const SchoolCalendar: React.FC = () => {
  const { user } = useAuthStore();
  const [schoolDays, setSchoolDays] = useState<SchoolDay[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingDay, setEditingDay] = useState<SchoolDay | null>(null);
  const [emergencySchedules, setEmergencySchedules] = useState<any[]>([]);
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

      const [daysRes, schedulesRes, statsRes, emergencyRes] = await Promise.all([
        schoolDayAPI.getAll(schoolId, {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
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
    const monthDays = schoolDays.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate.getMonth() === selectedMonth.getMonth() &&
             dayDate.getFullYear() === selectedMonth.getFullYear();
    });

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
    const yearStart = new Date(selectedMonth.getFullYear(), 0, 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

    const ytdDays = schoolDays.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= yearStart && dayDate <= monthEnd;
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
        <button
          onClick={() => {
            setEditingDay(null);
            setFormData({ date: '', dayType: 'regular', scheduleId: '', notes: '', followWeekday: '' });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Dia Letivo
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Total de Dias Letivos (Ano)</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.totalDays}</div>
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
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-lg shadow text-white">
            <div className="text-sm font-semibold opacity-90">Total Letivo (Ano)</div>
            <div className="text-3xl font-bold">{(statistics.regularDays || 0) + (statistics.saturdayDays || 0)}</div>
            <div className="text-xs mt-1 opacity-80">
              {statistics.regularDays || 0} regulares + {statistics.saturdayDays || 0} sábados
            </div>
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
                                  <span>HORÁRIO EMERGENCIAL</span>
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
                              setFormData({
                                date: schoolDay.date,
                                dayType: schoolDay.dayType as 'regular',
                                scheduleId: schoolDay.scheduleId || '',
                                notes: schoolDay.notes || '',
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
                                  <span className="text-xs">EMERGENCIAL</span>
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
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Legenda do Calendário
          </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tipos de Dia */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">Tipos de Dia:</h4>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 border-2 border-blue-300 rounded"></div>
              <span className="text-sm">Dia Regular (Pendente)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-300 border-2 border-blue-600 rounded shadow-md"></div>
              <span className="text-sm font-semibold">Dia Regular (Cumprido)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-50 border-2 border-purple-300 rounded"></div>
              <span className="text-sm">Sábado Letivo (Pendente)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-300 border-2 border-purple-600 rounded shadow-md"></div>
              <span className="text-sm font-semibold">Sábado Letivo (Cumprido)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-200 border-2 border-red-500 rounded shadow-sm"></div>
              <span className="text-sm">Feriado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-200 border-2 border-yellow-500 rounded shadow-sm"></div>
              <span className="text-sm">Recesso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 border-2 border-gray-600 rounded opacity-80"></div>
              <span className="text-sm">Dia Passado (Não Cumprido)</span>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">Status:</h4>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium">
                ✓ Cumprido
              </div>
              <span className="text-sm">Dia letivo cumprido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs font-medium">
                ○ Pendente
              </div>
              <span className="text-sm">Dia letivo pendente</span>
            </div>
          </div>

          {/* Horários */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">Horários:</h4>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-bold">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                EMERGENCIAL
              </div>
              <span className="text-sm">Horário emergencial ativo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 font-medium">
                <Check className="w-3 h-3 inline mr-1" />
                NORMAL
              </div>
              <span className="text-sm">Horário normal</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações <span className="text-gray-500 text-xs">(aparecerá no calendário)</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Ex: Feriado Nacional - Independência do Brasil
Ex: Recesso Escolar - Carnaval
Ex: Dia Letivo - Reposição de falta"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Dica: Use para informar o motivo de feriados, recessos ou observações importantes.
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
