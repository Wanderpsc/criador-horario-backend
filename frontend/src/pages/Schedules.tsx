import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Clock } from 'lucide-react';

interface Period {
  period: number;
  startTime: string;
  endTime: string;
}

interface BreakSlot {
  label: string;
  startTime: string;
  endTime: string;
}

interface Schedule {
  id: string;
  _id?: string;  // Manter para compatibilidade
  name: string;
  periods: Period[];
  breaks?: BreakSlot[];
}

export default function Schedules() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    numberOfPeriods: number;
    periods: Period[];
    breaks: BreakSlot[];
  }>({
    name: '',
    numberOfPeriods: 8,
    periods: Array.from({ length: 8 }, (_, i) => ({
      period: i + 1,
      startTime: '',
      endTime: '',
    })),
    breaks: [],
  });

  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await api.get('/schedules');
      console.log('📡 Horários recebidos da API:', response.data);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/schedules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Horário cadastrado com sucesso!');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao cadastrar horário');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.put(`/schedules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Horário atualizado com sucesso!');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar horário');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deletando horário com ID:', id);
      if (!id || id === 'undefined') {
        throw new Error('ID inválido');
      }
      return await api.delete(`/schedules/${id}`);
    },
    onSuccess: (response) => {
      console.log('Horário deletado:', response.data);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Horário deletado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao deletar:', error);
      const message = error.response?.data?.message || error.message || 'Erro ao deletar horário';
      toast.error(message);
    },
  });

  const openModal = (schedule?: Schedule) => {
    console.log('📝 openModal chamado com:', schedule);
    if (schedule) {
      console.log('✏️ Modo edição - Períodos recebidos:', schedule.periods);
      
      setEditingSchedule(schedule);
      const periodsLength = schedule.periods && schedule.periods.length > 0 ? schedule.periods.length : 8;
      setFormData({
        name: schedule.name,
        numberOfPeriods: periodsLength,
        periods: schedule.periods && schedule.periods.length > 0 
          ? schedule.periods 
          : Array.from({ length: 8 }, (_, i) => ({
              period: i + 1,
              startTime: '',
              endTime: '',
            })),
        breaks: schedule.breaks || [],
      });
      console.log('📋 FormData setado com períodos:', schedule.periods);
    } else {
      setEditingSchedule(null);
      setFormData({
        name: '',
        numberOfPeriods: 8,
        periods: [
          { period: 1, startTime: '', endTime: '' },
          { period: 2, startTime: '', endTime: '' },
          { period: 3, startTime: '', endTime: '' },
          { period: 4, startTime: '', endTime: '' },
          { period: 5, startTime: '', endTime: '' },
          { period: 6, startTime: '', endTime: '' },
          { period: 7, startTime: '', endTime: '' },
          { period: 8, startTime: '', endTime: '' },
        ],
        breaks: [],
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📤 Enviando dados:', JSON.stringify(formData, null, 2));
    console.log('📊 Total de períodos:', formData.periods.length);
    formData.periods.forEach((p, i) => {
      console.log(`  Período ${i + 1}: ${p.startTime} - ${p.endTime} (period: ${p.period})`);
    });
    
    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    console.log('handleDelete chamado com ID:', id);
    
    if (!id || id === 'undefined') {
      toast.error('ID inválido. Não é possível deletar este horário.');
      return;
    }
    
    if (confirm('Tem certeza que deseja deletar este horário?')) {
      deleteMutation.mutate(id);
    }
  };

  const updatePeriod = (index: number, field: 'startTime' | 'endTime', value: string) => {
    console.log(`⏰ updatePeriod chamado: período ${index + 1}, campo ${field}, valor: ${value}`);
    const newPeriods = [...formData.periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setFormData({ ...formData, periods: newPeriods });
    console.log('📝 formData atualizado, períodos:', newPeriods);
  };

  const addBreak = () => {
    setFormData({ ...formData, breaks: [...formData.breaks, { label: 'Intervalo', startTime: '', endTime: '' }] });
  };

  const removeBreak = (index: number) => {
    setFormData({ ...formData, breaks: formData.breaks.filter((_, i) => i !== index) });
  };

  const updateBreak = (index: number, field: keyof BreakSlot, value: string) => {
    const newBreaks = [...formData.breaks];
    newBreaks[index] = { ...newBreaks[index], [field]: value };
    setFormData({ ...formData, breaks: newBreaks });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuração de Horários</h1>
          <p className="text-gray-600 mt-1">
            Defina os horários de início e fim de cada período/aula
          </p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          Novo Horário
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {schedules?.map((schedule: Schedule) => (
          <div key={schedule.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Clock className="text-primary-600" size={24} />
                </div>
                <h3 className="font-bold text-xl">{schedule.name}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(schedule)}
                  className="text-primary-600 hover:text-primary-900 p-2"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="text-red-600 hover:text-red-900 p-2"
                  title="Deletar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {schedule.periods && schedule.periods.length > 0 ? (
                schedule.periods.map((period) => (
                  <div
                    key={period.period}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-700">
                      {period.period}º Período
                    </span>
                    <span className="text-gray-600">
                      {period.startTime} - {period.endTime}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhum período configurado</p>
              )}
              {schedule.breaks && schedule.breaks.length > 0 && (
                <div className="pt-2 mt-2 border-t border-orange-200">
                  {schedule.breaks.map((br, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg mt-1">
                      <span className="font-medium text-orange-700 text-sm">
                        {br.label === 'Almoço' ? '🍽️' : br.label === 'Lanche Manhã' ? '☕' : br.label === 'Lanche Tarde' ? '🍎' : '⏸️'} {br.label}
                      </span>
                      <span className="text-orange-600 text-sm">{br.startTime} - {br.endTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {schedules?.length === 0 && (
        <div className="card text-center py-12 text-gray-500">
          Nenhum horário configurado ainda.
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">
                {editingSchedule ? 'Editar Horário' : 'Novo Horário'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Escola / Turno *
                  </label>
                  <select
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Selecione o tipo de escola</option>
                    <option value="Parcial Manhã">Parcial Manhã</option>
                    <option value="Parcial Tarde">Parcial Tarde</option>
                    <option value="Parcial Noturno">Parcial Noturno</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Integral">Integral</option>
                    <option value="Integral Concomitante">Integral Concomitante</option>
                    <option value="Integral Integrado">Integral Integrado</option>
                    <option value="Técnico">Técnico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade de Períodos/Aulas *
                  </label>
                  <select
                    value={formData.numberOfPeriods}
                    onChange={(e) => {
                      const count = parseInt(e.target.value);
                      setFormData({ 
                        ...formData, 
                        numberOfPeriods: count,
                        periods: Array.from({ length: count }, (_, i) => ({
                          period: i + 1,
                          startTime: formData.periods[i]?.startTime || '',
                          endTime: formData.periods[i]?.endTime || '',
                        }))
                      });
                    }}
                    className="input"
                    required
                  >
                    <option value="4">4 períodos</option>
                    <option value="5">5 períodos</option>
                    <option value="6">6 períodos</option>
                    <option value="7">7 períodos</option>
                    <option value="8">8 períodos</option>
                    <option value="9">9 períodos</option>
                    <option value="10">10 períodos</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-4">Períodos de Aula</h3>
                <div className="space-y-3">
                  {(() => {
                    console.log('🔍 Renderizando períodos - formData.periods:', formData.periods);
                    return formData.periods && formData.periods.length > 0 ? (
                      formData.periods.map((period, index) => {
                        console.log(`  Período ${index + 1}:`, period);
                        return (
                          <div key={index} className="grid grid-cols-3 gap-4 items-center">
                            <div className="font-medium text-gray-700">
                              {period.period}º Período
                            </div>
                            <div>
                              <input
                                type="time"
                                value={period.startTime}
                                onChange={(e) => updatePeriod(index, 'startTime', e.target.value)}
                                className="input"
                                required
                              />
                            </div>
                            <div>
                              <input
                                type="time"
                                value={period.endTime}
                                onChange={(e) => updatePeriod(index, 'endTime', e.target.value)}
                                className="input"
                                required
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-500 text-center py-4">
                        Nenhum período configurado
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ── Intervalos de Lanche / Almoço ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-lg">Intervalos (Lanche / Almoço)</h3>
                  <button
                    type="button"
                    onClick={addBreak}
                    className="btn btn-secondary flex items-center gap-1 text-sm py-1.5 px-3"
                  >
                    <Plus size={16} /> Adicionar Intervalo
                  </button>
                </div>
                {formData.breaks.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">
                    Nenhum intervalo configurado. Clique em "Adicionar Intervalo" para incluir lanche ou almoço.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                      <span className="col-span-2">Descrição</span>
                      <span>Início</span>
                      <span>Fim</span>
                    </div>
                    {formData.breaks.map((br, index) => (
                      <div key={index} className="grid grid-cols-4 gap-3 items-center bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        <div className="col-span-2">
                          <select
                            value={br.label}
                            onChange={(e) => updateBreak(index, 'label', e.target.value)}
                            className="input text-sm py-1.5"
                            required
                          >
                            <option value="Lanche Manhã">☕ Lanche Manhã</option>
                            <option value="Almoço">🍽️ Almoço</option>
                            <option value="Lanche Tarde">🍎 Lanche Tarde</option>
                            <option value="Intervalo">⏸️ Intervalo</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="time"
                            value={br.startTime}
                            onChange={(e) => updateBreak(index, 'startTime', e.target.value)}
                            className="input text-sm py-1.5"
                            required
                          />
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="time"
                            value={br.endTime}
                            onChange={(e) => updateBreak(index, 'endTime', e.target.value)}
                            className="input text-sm py-1.5"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => removeBreak(index)}
                            className="text-red-400 hover:text-red-600 flex-shrink-0"
                            title="Remover intervalo"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn btn-primary"
                >
                  {editingSchedule ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
