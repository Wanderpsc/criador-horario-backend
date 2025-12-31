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
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      const [daysRes, schedulesRes, statsRes, emergencyRes] = await Promise.all([
        schoolDayAPI.getAll(user!.schoolId!, {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }),
        scheduleAPI.getAll(user!.schoolId!),
        schoolDayAPI.getStatistics(user!.schoolId!, {
          startDate: `${selectedMonth.getFullYear()}-01-01`,
          endDate: `${selectedMonth.getFullYear()}-12-31`,
        }),
        emergencyScheduleAPI.getAll(),
      ]);

      setSchoolDays(daysRes.data.data);
      setSchedules(schedulesRes.data.data);
      setStatistics(statsRes.data.data);
      
      // Filtrar horários emergenciais do mês atual
      const emergencyData = emergencyRes.data.data || [];
      const monthEmergencies = emergencyData.filter((schedule: any) => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });
      setEmergencySchedules(monthEmergencies);
    } catch (error) {
      toast.error('Erro ao carregar calendário');
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        schoolId: user!.schoolId,
        ...formData,
        scheduleId: formData.scheduleId || undefined,
      };

      if (editingDay) {
        await schoolDayAPI.update(editingDay.id, formData);
        toast.success('Dia letivo atualizado com sucesso!');
      } else {
        await schoolDayAPI.create(data);
        toast.success('Dia letivo criado com sucesso!');
      }

      setShowModal(false);
      setEditingDay(null);
      setFormData({ date: '', dayType: 'regular', scheduleId: '', notes: '' });
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

  const getDayTypeColor = (dayType: string) => {
    switch (dayType) {
      case 'regular':
        return 'bg-blue-100 border-blue-300';
      case 'saturday':
        return 'bg-purple-100 border-purple-300';
      case 'holiday':
        return 'bg-red-100 border-red-300';
      case 'recess':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Total de Dias Letivos</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.totalDays}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Dias Cumpridos</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.completedDays}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="text-sm text-gray-600">Dias Restantes</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.remainingDays}</div>
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

            return (
              <div
                key={index}
                className={`min-h-24 border rounded-lg p-2 ${
                  isEmpty
                    ? 'bg-gray-50'
                    : schoolDay
                    ? getDayTypeColor(schoolDay.dayType)
                    : 'bg-white hover:bg-gray-50'
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
                      <div className="text-xs">
                        <div className="font-medium mb-1">{getDayTypeLabel(schoolDay.dayType)}</div>
                        {schoolDay.dayType === 'saturday' && schoolDay.followWeekday && (
                          <div className="text-blue-700 font-medium mb-1">
                            Segue: {getWeekdayLabel(schoolDay.followWeekday)}
                          </div>
                        )}
                        {schoolDay.schedule && (
                          <div className="text-gray-600 truncate">{schoolDay.schedule.name}</div>
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
                        
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => handleToggleCompleted(schoolDay)}
                            className="p-1 bg-white rounded hover:bg-gray-100"
                            title={schoolDay.isCompleted ? 'Marcar pendente' : 'Marcar cumprido'}
                          >
                            <Check className="w-3 h-3" />
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
                            className="p-1 bg-white rounded hover:bg-gray-100"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(schoolDay.id)}
                            className="p-1 bg-white rounded hover:bg-gray-100"
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
                            setFormData({
                              date: date.toISOString().split('T')[0],
                              dayType: 'regular',
                              scheduleId: '',
                              notes: '',
                              followWeekday: '',
                            });
                            setShowModal(true);
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          + Adicionar
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

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-2">Legenda:</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
            <span className="text-sm">Dia Regular</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border-2 border-purple-300 rounded"></div>
            <span className="text-sm">Sábado Letivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span className="text-sm">Feriado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
            <span className="text-sm">Recesso</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm">Dia Cumprido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-bold">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              EMERGENCIAL
            </div>
            <span className="text-sm">Horário Emergencial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 font-medium">
              <Check className="w-3 h-3 inline mr-1" />
              NORMAL
            </div>
            <span className="text-sm">Horário Normal</span>
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
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
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
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Observações sobre este dia..."
                />
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
