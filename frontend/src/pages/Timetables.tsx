import { Calendar, Download, Upload, Grid3x3, Plus, Save, Wand2, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Interfaces baseadas nos dados reais das outras páginas
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

interface Teacher {
  id: string;
  name: string;
  email?: string;
  cpf: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
  workloadHours: number;
  color?: string;
}

interface Grade {
  id: string;
  name: string;
  level: string;
  order: number;
}

interface TimetableCell {
  scheduleId?: number;
  gradeId?: string;
  day: string;
  periodId: number;
  subjectId?: string;
  teacherId?: string;
  room?: string;
}

export default function Timetables() {
  console.log('🎯 Timetables component loaded!');
  
  // Dados vindos das configurações
  const [schedules] = useState<Schedule[]>([
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

  // Mock data - em produção virá da API
  const [teachers] = useState<Teacher[]>([
    { id: '1', name: 'João Silva', cpf: '111.111.111-11', email: 'joao@escola.com' },
    { id: '2', name: 'Maria Santos', cpf: '222.222.222-22', email: 'maria@escola.com' },
    { id: '3', name: 'Pedro Oliveira', cpf: '333.333.333-33', email: 'pedro@escola.com' },
  ]);

  const [subjects] = useState<Subject[]>([
    { id: '1', name: 'Matemática', code: 'MAT', workloadHours: 5, color: '#3B82F6' },
    { id: '2', name: 'Português', code: 'POR', workloadHours: 5, color: '#10B981' },
    { id: '3', name: 'História', code: 'HIS', workloadHours: 3, color: '#F59E0B' },
    { id: '4', name: 'Geografia', code: 'GEO', workloadHours: 3, color: '#8B5CF6' },
    { id: '5', name: 'Ciências', code: 'CIE', workloadHours: 4, color: '#EC4899' },
  ]);

  const [grades] = useState<Grade[]>([
    { id: '1', name: '1º Ano', level: 'Fundamental I', order: 1 },
    { id: '2', name: '2º Ano', level: 'Fundamental I', order: 2 },
    { id: '3', name: '6º Ano', level: 'Fundamental II', order: 6 },
  ]);

  const weekDays = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' },
  ];

  const [selectedSchedule, setSelectedSchedule] = useState<number>(1);
  const [selectedGrade, setSelectedGrade] = useState<string>('1');
  const [timetable, setTimetable] = useState<TimetableCell[]>([]);
  const [editingCell, setEditingCell] = useState<{ day: string; periodId: number } | null>(null);
  const [cellForm, setCellForm] = useState({
    subjectId: '',
    teacherId: '',
    room: ''
  });

  const activeSchedule = schedules.find(s => s.id === selectedSchedule);
  const classPeriods = activeSchedule?.slots.filter(slot => slot.type === 'class') || [];

  const getCellData = (day: string, periodId: number): TimetableCell | undefined => {
    return timetable.find(
      cell => cell.scheduleId === selectedSchedule && 
              cell.gradeId === selectedGrade && 
              cell.day === day && 
              cell.periodId === periodId
    );
  };

  const handleCellClick = (day: string, periodId: number) => {
    const cellData = getCellData(day, periodId);
    setEditingCell({ day, periodId });
    setCellForm({
      subjectId: cellData?.subjectId || '',
      teacherId: cellData?.teacherId || '',
      room: cellData?.room || ''
    });
  };

  const handleSaveCell = () => {
    if (!editingCell) return;

    const newCell: TimetableCell = {
      scheduleId: selectedSchedule,
      gradeId: selectedGrade,
      day: editingCell.day,
      periodId: editingCell.periodId,
      subjectId: cellForm.subjectId || undefined,
      teacherId: cellForm.teacherId || undefined,
      room: cellForm.room || undefined
    };

    const existingIndex = timetable.findIndex(
      cell => cell.scheduleId === selectedSchedule && 
              cell.gradeId === selectedGrade && 
              cell.day === editingCell.day && 
              cell.periodId === editingCell.periodId
    );

    if (existingIndex >= 0) {
      const updated = [...timetable];
      updated[existingIndex] = newCell;
      setTimetable(updated);
    } else {
      setTimetable([...timetable, newCell]);
    }

    setEditingCell(null);
    toast.success('Horário salvo!');
  };

  const handleClearCell = () => {
    if (!editingCell) return;

    const filtered = timetable.filter(
      cell => !(cell.scheduleId === selectedSchedule && 
                cell.gradeId === selectedGrade && 
                cell.day === editingCell.day && 
                cell.periodId === editingCell.periodId)
    );

    setTimetable(filtered);
    setEditingCell(null);
    toast.success('Horário removido!');
  };

  const handleAutoGenerate = () => {
    toast.info('Geração automática em desenvolvimento...');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast.info('Exportação para PDF/Excel em desenvolvimento...');
  };

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          table { page-break-inside: avoid; }
          .card { box-shadow: none !important; border: 1px solid #e5e7eb; }
        }
      `}</style>
      
      <div className="flex items-center justify-between mb-6 no-print">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Grade de Horários</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleAutoGenerate}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Gerar Auto
          </button>
          <button 
            onClick={handleExport}
            className="btn btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Turno
            </label>
            <select
              className="input"
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(parseInt(e.target.value))}
            >
              {schedules.map(schedule => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name} - {schedule.slots.filter(s => s.type === 'class').length} períodos
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Turma/Série
            </label>
            <select
              className="input"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              {grades.map(grade => (
                <option key={grade.id} value={grade.id}>
                  {grade.name} - {grade.level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grade de Horários */}
      <div className="card overflow-x-auto print-full-width">
        {/* Cabeçalho para impressão */}
        <div className="hidden print:block mb-4 text-center border-b-2 border-gray-300 pb-4">
          <h1 className="text-2xl font-bold">Grade de Horários Escolar</h1>
          <p className="text-lg">{activeSchedule?.name} - {grades.find(g => g.id === selectedGrade)?.name}</p>
          <p className="text-sm text-gray-600">Ano Letivo: 2025</p>
        </div>
        
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {activeSchedule?.name} - {grades.find(g => g.id === selectedGrade)?.name}
          </h2>
          <div className="text-sm text-gray-600">
            {classPeriods.length} períodos • 5 dias
          </div>
        </div>

        <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th className="border-2 border-gray-400 bg-gradient-to-br from-gray-100 to-gray-200 p-4 text-left font-bold w-32">
                <div className="text-sm">Período</div>
                <div className="text-xs text-gray-600 font-normal">Horário</div>
              </th>
              {weekDays.map(day => (
                <th key={day.key} className="border-2 border-gray-400 bg-gradient-to-br from-primary-100 to-primary-200 p-4 text-center font-bold">
                  <div className="text-base">{day.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classPeriods.map((period) => (
              <tr key={period.id}>
                <td className="border-2 border-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                  <div className="font-bold text-sm text-gray-800">{period.period}</div>
                  <div className="text-xs text-gray-600 font-medium mt-1">
                    {period.start} - {period.end}
                  </div>
                  {period.classCount && period.classCount > 1 && (
                    <div className="text-xs text-blue-700 font-bold mt-1 bg-blue-100 px-2 py-0.5 rounded">
                      {period.classCount} aulas
                    </div>
                  )}
                </td>
                {weekDays.map(day => {
                  const cellData = getCellData(day.key, period.id);
                  const subject = cellData?.subjectId ? subjects.find(s => s.id === cellData.subjectId) : null;
                  const teacher = cellData?.teacherId ? teachers.find(t => t.id === cellData.teacherId) : null;

                  return (
                    <td
                      key={day.key}
                      className="border-2 border-gray-400 p-3 cursor-pointer hover:bg-blue-50 transition print:cursor-default"
                      onClick={() => handleCellClick(day.key, period.id)}
                    >
                      {subject ? (
                        <div
                          className="rounded-lg p-3 text-white text-sm shadow-md font-medium"
                          style={{ 
                            backgroundColor: subject.color || '#6B7280',
                            minHeight: '60px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}
                        >
                          <div className="font-bold text-base">{subject.name}</div>
                          {teacher && (
                            <div className="text-xs opacity-95 truncate mt-1">
                              👤 {teacher.name}
                            </div>
                          )}
                          {cellData?.room && (
                            <div className="text-xs opacity-95 mt-0.5">📍 Sala: {cellData.room}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 text-xs py-6 no-print">
                          + Adicionar
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Edição */}
      {editingCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              Editar Horário - {weekDays.find(d => d.key === editingCell.day)?.label}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {classPeriods.find(p => p.id === editingCell.periodId)?.period} 
              {' '}({classPeriods.find(p => p.id === editingCell.periodId)?.start} - 
              {classPeriods.find(p => p.id === editingCell.periodId)?.end})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Componente Curricular
                </label>
                <select
                  className="input"
                  value={cellForm.subjectId}
                  onChange={(e) => setCellForm({ ...cellForm, subjectId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professor
                </label>
                <select
                  className="input"
                  value={cellForm.teacherId}
                  onChange={(e) => setCellForm({ ...cellForm, teacherId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sala
                </label>
                <input
                  type="text"
                  className="input"
                  value={cellForm.room}
                  onChange={(e) => setCellForm({ ...cellForm, room: e.target.value })}
                  placeholder="Ex: Sala 101"
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={handleClearCell}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                Limpar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCell}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
        <div className="card bg-green-50 border-green-200">
          <h3 className="text-lg font-bold mb-2">✅ Dados Integrados</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>{schedules.length}</strong> turnos configurados (Horários de Aula)</li>
            <li>• <strong>{subjects.length}</strong> componentes curriculares</li>
            <li>• <strong>{teachers.length}</strong> professores cadastrados</li>
            <li>• <strong>{grades.length}</strong> turmas/séries</li>
          </ul>
        </div>

        <div className="card bg-blue-50 border-blue-200">
          <h3 className="text-lg font-bold mb-2">💡 Como Usar</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>1. Selecione o turno e a turma</li>
            <li>2. Clique na célula do horário desejado</li>
            <li>3. Escolha a disciplina e o professor</li>
            <li>4. Use <strong>"Imprimir"</strong> para gerar versão colorida</li>
            <li>5. Use <strong>"Exportar PDF"</strong> para salvar arquivo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}