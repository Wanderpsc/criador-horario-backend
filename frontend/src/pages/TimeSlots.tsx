import { Clock, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface TimeSlot {
  id: number;
  period: string;
  start: string;
  end: string;
  type?: 'class' | 'break';
  classCount?: number;
}

interface Schedule {
  id: number;
  name: string;
  type: 'integral' | 'manha' | 'tarde' | 'noite' | 'intermediario' | 'sabado' | 'domingo';
  slots: TimeSlot[];
}

export default function TimeSlots() {
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: 1,
      name: 'Integral',
      type: 'integral',
      slots: [
        { id: 1, period: '1º Período', start: '07:00', end: '07:50', type: 'class', classCount: 1 },
        { id: 2, period: '2º Período', start: '07:50', end: '08:40', type: 'class', classCount: 1 },
        { id: 3, period: '3º Período', start: '08:40', end: '09:30', type: 'class', classCount: 1 },
        { id: 4, period: 'Intervalo', start: '09:30', end: '09:50', type: 'break', classCount: 0 },
        { id: 5, period: '4º Período', start: '09:50', end: '10:40', type: 'class', classCount: 1 },
        { id: 6, period: '5º Período', start: '10:40', end: '11:30', type: 'class', classCount: 1 },
        { id: 7, period: '6º Período', start: '11:30', end: '12:20', type: 'class', classCount: 1 },
        { id: 8, period: 'Almoço', start: '12:20', end: '13:20', type: 'break', classCount: 0 },
        { id: 9, period: '7º Período', start: '13:20', end: '14:10', type: 'class', classCount: 1 },
        { id: 10, period: '8º Período', start: '14:10', end: '15:00', type: 'class', classCount: 1 },
      ]
    },
    {
      id: 2,
      name: 'Parcial Manhã',
      type: 'manha',
      slots: [
        { id: 1, period: '1º Período', start: '07:00', end: '07:50', type: 'class', classCount: 1 },
        { id: 2, period: '2º Período', start: '07:50', end: '08:40', type: 'class', classCount: 1 },
        { id: 3, period: '3º Período', start: '08:40', end: '09:30', type: 'class', classCount: 1 },
        { id: 4, period: 'Intervalo', start: '09:30', end: '09:50', type: 'break', classCount: 0 },
        { id: 5, period: '4º Período', start: '09:50', end: '10:40', type: 'class', classCount: 1 },
        { id: 6, period: '5º Período', start: '10:40', end: '11:30', type: 'class', classCount: 1 },
      ]
    },
    {
      id: 3,
      name: 'Parcial Tarde',
      type: 'tarde',
      slots: [
        { id: 1, period: '1º Período', start: '13:00', end: '13:50', type: 'class', classCount: 1 },
        { id: 2, period: '2º Período', start: '13:50', end: '14:40', type: 'class', classCount: 1 },
        { id: 3, period: '3º Período', start: '14:40', end: '15:30', type: 'class', classCount: 1 },
        { id: 4, period: 'Intervalo', start: '15:30', end: '15:50', type: 'break', classCount: 0 },
        { id: 5, period: '4º Período', start: '15:50', end: '16:40', type: 'class', classCount: 1 },
        { id: 6, period: '5º Período', start: '16:40', end: '17:30', type: 'class', classCount: 1 },
      ]
    },
    {
      id: 4,
      name: 'Parcial Noite',
      type: 'noite',
      slots: [
        { id: 1, period: '1º Período', start: '18:30', end: '19:20', type: 'class', classCount: 1 },
        { id: 2, period: '2º Período', start: '19:20', end: '20:10', type: 'class', classCount: 1 },
        { id: 3, period: 'Intervalo', start: '20:10', end: '20:20', type: 'break', classCount: 0 },
        { id: 4, period: '3º Período', start: '20:20', end: '21:10', type: 'class', classCount: 1 },
        { id: 5, period: '4º Período', start: '21:10', end: '22:00', type: 'class', classCount: 1 },
      ]
    }
  ]);

  const [activeTab, setActiveTab] = useState<number>(1);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    type: 'manha' as Schedule['type']
  });
  const [newSlot, setNewSlot] = useState<Partial<TimeSlot>>({
    period: '',
    start: '',
    end: '',
    type: 'class',
    classCount: 1
  });

  const scheduleTypes = [
    { value: 'integral', label: 'Integral', icon: '🌅🌆' },
    { value: 'manha', label: 'Manhã', icon: '🌅' },
    { value: 'tarde', label: 'Tarde', icon: '🌤️' },
    { value: 'noite', label: 'Noite', icon: '🌙' },
    { value: 'intermediario', label: 'Intermediário', icon: '⏰' },
    { value: 'sabado', label: 'Sábado', icon: '📅' },
    { value: 'domingo', label: 'Domingo', icon: '📅' },
  ];

  const handleCreateSchedule = () => {
    if (!newSchedule.name.trim()) {
      toast.error('Digite um nome para o horário');
      return;
    }

    const newSched: Schedule = {
      id: schedules.length + 1,
      name: newSchedule.name,
      type: newSchedule.type,
      slots: []
    };

    setSchedules([...schedules, newSched]);
    setActiveTab(newSched.id);
    setNewSchedule({ name: '', type: 'manha' });
    setShowNewSchedule(false);
    toast.success('Novo horário criado!');
  };

  const handleAddSlot = (scheduleId: number) => {
    if (!newSlot.period || !newSlot.start || !newSlot.end) {
      toast.error('Preencha todos os campos');
      return;
    }

    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const slot: TimeSlot = {
      id: schedule.slots.length + 1,
      period: newSlot.period!,
      start: newSlot.start!,
      end: newSlot.end!,
      type: newSlot.type as 'class' | 'break',
      classCount: newSlot.type === 'break' ? 0 : (newSlot.classCount || 1)
    };

    setSchedules(schedules.map(s => 
      s.id === scheduleId 
        ? { ...s, slots: [...s.slots, slot] }
        : s
    ));

    setNewSlot({ period: '', start: '', end: '', type: 'class', classCount: 1 });
    toast.success('Período adicionado!');
  };

  const handleDeleteSlot = (scheduleId: number, slotId: number) => {
    setSchedules(schedules.map(s => 
      s.id === scheduleId 
        ? { ...s, slots: s.slots.filter(slot => slot.id !== slotId) }
        : s
    ));
    toast.success('Período removido!');
  };

  const handleDeleteSchedule = (scheduleId: number) => {
    if (!confirm('Tem certeza que deseja excluir este horário?')) return;
    setSchedules(schedules.filter(s => s.id !== scheduleId));
    if (activeTab === scheduleId) {
      setActiveTab(schedules[0]?.id || 0);
    }
    toast.success('Horário excluído!');
  };

  const activeSchedule = schedules.find(s => s.id === activeTab);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configuração de Horários</h1>
        </div>
        <button
          onClick={() => setShowNewSchedule(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Horário
        </button>
      </div>

      {showNewSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Criar Novo Horário</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Horário
                </label>
                <input
                  type="text"
                  className="input"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder="Ex: Horário de Verão"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Horário
                </label>
                <select
                  className="input"
                  value={newSchedule.type}
                  onChange={(e) => setNewSchedule({ ...newSchedule, type: e.target.value as Schedule['type'] })}
                >
                  {scheduleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewSchedule(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSchedule}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex overflow-x-auto border-b">
          {schedules.map(schedule => {
            const typeInfo = scheduleTypes.find(t => t.value === schedule.type);
            return (
              <button
                key={schedule.id}
                onClick={() => setActiveTab(schedule.id)}
                className={`px-6 py-3 font-medium whitespace-nowrap flex items-center gap-2 ${
                  activeTab === schedule.id
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span>{typeInfo?.icon}</span>
                {schedule.name}
              </button>
            );
          })}
        </div>
      </div>

      {activeSchedule && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">{activeSchedule.name}</h2>
              <p className="text-sm text-gray-600">
                {scheduleTypes.find(t => t.value === activeSchedule.type)?.label} - {activeSchedule.slots.length} períodos
              </p>
            </div>
            <button
              onClick={() => handleDeleteSchedule(activeSchedule.id)}
              className="text-red-600 hover:bg-red-50 p-2 rounded"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 mb-6">
            {activeSchedule.slots.map((slot) => (
              <div
                key={slot.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  slot.type === 'break' ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className={`w-5 h-5 ${slot.type === 'break' ? 'text-yellow-600' : 'text-gray-400'}`} />
                  <span className="font-medium">{slot.period}</span>
                  {slot.type === 'break' ? (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      Intervalo
                    </span>
                  ) : (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {slot.classCount || 1} {(slot.classCount || 1) === 1 ? 'aula' : 'aulas'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{slot.start}</span>
                    <span>→</span>
                    <span>{slot.end}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSlot(activeSchedule.id, slot.id)}
                    className="text-red-600 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-6">
            <h3 className="font-bold mb-4">Adicionar Novo Período</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  className="input"
                  value={newSlot.type}
                  onChange={(e) => {
                    const type = e.target.value as 'class' | 'break';
                    setNewSlot({ ...newSlot, type, classCount: type === 'break' ? 0 : 1 });
                  }}
                >
                  <option value="class">Aula</option>
                  <option value="break">Intervalo</option>
                </select>
              </div>
              
              {newSlot.type === 'class' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nº Aulas
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="10"
                    value={newSlot.classCount || 1}
                    onChange={(e) => setNewSlot({ ...newSlot, classCount: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Período
                </label>
                <input
                  type="text"
                  className="input"
                  value={newSlot.period}
                  onChange={(e) => setNewSlot({ ...newSlot, period: e.target.value })}
                  placeholder="Ex: 1º Período"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início
                </label>
                <input
                  type="time"
                  className="input"
                  value={newSlot.start}
                  onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fim
                </label>
                <input
                  type="time"
                  className="input"
                  value={newSlot.end}
                  onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })}
                />
              </div>
            </div>
            <button
              onClick={() => handleAddSlot(activeSchedule.id)}
              className="btn btn-primary mt-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Período
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-bold mb-2">ℹ️ Informação</h3>
        <p className="text-sm text-gray-600">
          Configure diferentes horários para cada turno (Integral, Manhã, Tarde, Noite) e para finais de semana. 
          Os horários podem ter períodos de aula e intervalos personalizados.
        </p>
      </div>
    </div>
  );
}
