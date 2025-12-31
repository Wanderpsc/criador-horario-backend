import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, AlertTriangle, Users, BookOpen, Clock, RefreshCw, Save, Printer, CheckCircle, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Teacher {
  _id: string;
  id?: string;
  name: string;
  email: string;
}

interface Subject {
  _id: string;
  id?: string;
  name: string;
  color: string;
}

interface Class {
  _id: string;
  id?: string;
  name: string;
  shift: 'morning' | 'afternoon' | 'evening';
}

interface TeacherDebt {
  teacherId: string;
  teacherName: string;
  totalDebts: number;
  debts: Array<{
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
    missedLessons: number;
    isAccumulated?: boolean; // Se veio de não comparecimento em sábado
  }>;
  accumulatedDebts?: number; // Total de débitos acumulados
  originalDebts?: number; // Total de débitos originais
}

interface MakeupSlot {
  period: number;
  startTime: string;
  endTime: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

export default function MakeupSaturdays() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [makeupSchedule, setMakeupSchedule] = useState<{ [classId: string]: MakeupSlot[] }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [wasHeld, setWasHeld] = useState(false); // Se o sábado foi realizado

  // Buscar professores, disciplinas e turmas
  const { data: teachersData } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data.data || res.data || [];
    }
  });
  const teachers = Array.isArray(teachersData) ? teachersData : [];

  const { data: subjectsData } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data.data || res.data || [];
    }
  });
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  const { data: classesData } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data.data || res.data || [];
    }
  });
  const classes = Array.isArray(classesData) ? classesData : [];

  // Buscar horários emergenciais salvos
  const { data: emergencySchedules = [] } = useQuery({
    queryKey: ['emergency-schedules'],
    queryFn: async () => {
      const res = await api.get('/emergency-schedules');
      return res.data.data || res.data || [];
    }
  });

  // Buscar horários de sábado salvos
  const { data: savedMakeupSchedules = [] } = useQuery({
    queryKey: ['makeup-saturdays'],
    queryFn: async () => {
      try {
        // Verificar se está autenticado
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) {
          console.warn('⚠️ Usuário não autenticado');
          return [];
        }
        
        const res = await api.get('/saturday-makeup');
        return res.data.data || res.data || [];
      } catch (error: any) {
        console.error('❌ Erro ao buscar sábados salvos:', error);
        if (error.response?.status === 400) {
          console.error('⚠️ Erro 400: Provavelmente problema de autenticação');
        }
        return [];
      }
    }
  });

  // Calcular débitos dos professores com filtro de período
  const calculateTeacherDebts = (): TeacherDebt[] => {
    const debtsMap = new Map<string, TeacherDebt>();

    // Filtrar horários emergenciais pelo período selecionado
    const filteredSchedules = emergencySchedules.filter((schedule: any) => {
      if (!startDate && !endDate) return true; // Sem filtro, mostra todos
      
      const scheduleDate = new Date(schedule.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && scheduleDate < start) return false;
      if (end && scheduleDate > end) return false;
      
      return true;
    });

    console.log(`📅 Período: ${startDate || 'início'} até ${endDate || 'fim'}`);
    console.log(`📚 Horários emergenciais no período: ${filteredSchedules.length}`);

    // Calcular aulas já repostas (por professor que compareceu)
    const realizedDebts = new Map<string, number>();
    savedMakeupSchedules.forEach((saved: any) => {
      const attendedTeachers = saved.attendedTeachers || [];
      if (saved.schedule && attendedTeachers.length > 0) {
        Object.values(saved.schedule).forEach((period: any) => {
          if (Array.isArray(period)) {
            period.forEach((slot: any) => {
              // Só conta se o professor está na lista de presença
              if (slot?.teacherId && attendedTeachers.includes(slot.teacherId)) {
                const current = realizedDebts.get(slot.teacherId) || 0;
                realizedDebts.set(slot.teacherId, current + 1);
              }
            });
          }
        });
      }
    });
    
    console.log('✅ Aulas já repostas por professor:', Object.fromEntries(realizedDebts));

    filteredSchedules.forEach((schedule: any) => {
      // Usar o campo makeupClasses que contém as aulas que precisam ser repostas
      const makeupClasses = schedule.makeupClasses || [];
      
      console.log(`📋 Horário de ${schedule.date}: ${makeupClasses.length} aulas para reposição`);
      
      makeupClasses.forEach((makeup: any) => {
        const teacherId = makeup.originalTeacherId;
        const teacherName = makeup.originalTeacherName;

        if (!debtsMap.has(teacherId)) {
          debtsMap.set(teacherId, {
            teacherId,
            teacherName,
            totalDebts: 0,
            debts: []
          });
        }

        const debt = debtsMap.get(teacherId)!;
        debt.totalDebts++;

        // Agrupar por disciplina e turma
        const existingDebt = debt.debts.find(
          d => d.subjectId === makeup.subjectId && d.classId === makeup.classId
        );

        if (existingDebt) {
          existingDebt.missedLessons++;
        } else {
          debt.debts.push({
            subjectId: makeup.subjectId,
            subjectName: makeup.subjectName || 'Desconhecido',
            classId: makeup.classId,
            className: makeup.className || 'Desconhecido',
            missedLessons: 1
          });
        }
      });
    });

    console.log(`📊 Total de professores com débitos: ${debtsMap.size}`);
    console.log('📋 Débitos calculados:', Array.from(debtsMap.values()));

    // Descontar aulas já repostas
    const finalDebts = Array.from(debtsMap.values()).map(debt => {
      const realized = realizedDebts.get(debt.teacherId) || 0;
      return {
        ...debt,
        totalDebts: debt.totalDebts - realized,
        realizedClasses: realized
      };
    }).filter(d => d.totalDebts > 0); // Remover professores sem débito

    console.log('🎯 Débitos finais após desconto:', finalDebts);

    return finalDebts;
  };

  const teacherDebts = calculateTeacherDebts();

  // Gerar horário automaticamente do backend (com débitos acumulados)
  const generateFromBackend = async () => {
    if (!selectedDate) {
      toast.error('Selecione uma data primeiro');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🎯 Gerando horário automaticamente do backend...');
      const response = await api.post('/saturday-makeup/generate-from-debts', {
        date: selectedDate,
        maxPeriods: 4
      });

      const { schedule, teacherDebts: dbTeacherDebts } = response.data.data;
      
      setMakeupSchedule(schedule);
      toast.success(`✅ Horário gerado! ${dbTeacherDebts.length} professor(es) incluído(s)`);
      console.log('✅ Horário gerado do backend:', { schedule, teacherDebts: dbTeacherDebts });
    } catch (error: any) {
      console.error('❌ Erro ao gerar do backend:', error);
      toast.error('Erro ao gerar horário automaticamente');
    } finally {
      setIsGenerating(false);
    }
  };

  // Gerar horário de reposição automaticamente (frontend - método antigo)
  const generateMakeupSchedule = () => {
    console.log('🎯 Iniciando geração de horário de reposição...');
    console.log('📅 Data selecionada:', selectedDate);
    console.log('📊 Débitos de professores:', teacherDebts);
    
    setIsGenerating(true);

    try {
      // Horário padrão de sábado: 8h às 12h (4 períodos de 1 hora)
      const periods = [
        { period: 1, startTime: '08:00', endTime: '09:00' },
        { period: 2, startTime: '09:00', endTime: '10:00' },
        { period: 3, startTime: '10:00', endTime: '11:00' },
        { period: 4, startTime: '11:00', endTime: '12:00' }
      ];

      const schedule: { [classId: string]: MakeupSlot[] } = {};

      // Distribuir as reposições por turma
      teacherDebts.forEach(teacherDebt => {
        console.log('👨‍🏫 Processando débitos do professor:', teacherDebt.teacherName);
        teacherDebt.debts.forEach(debt => {
          if (!schedule[debt.classId]) {
            schedule[debt.classId] = [];
          }

          // Adicionar slots de reposição (até o número de aulas faltantes)
          for (let i = 0; i < debt.missedLessons && schedule[debt.classId].length < periods.length; i++) {
            const period = periods[schedule[debt.classId].length];
            schedule[debt.classId].push({
              ...period,
              teacherId: teacherDebt.teacherId,
              teacherName: teacherDebt.teacherName,
              subjectId: debt.subjectId,
              subjectName: debt.subjectName,
              classId: debt.classId,
              className: debt.className
            });
          }
        });
      });

      console.log('✅ Horário gerado:', schedule);
      console.log('📋 Número de turmas com aulas:', Object.keys(schedule).length);
      
      setMakeupSchedule(schedule);
      
    } catch (error) {
      console.error('❌ Erro ao gerar horário:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Salvar horário de reposição
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/saturday-makeup', data);
    },
    onSuccess: async (response, variables) => {
      // Se o sábado foi realizado, dar baixa nos débitos
      if (wasHeld && variables.wasHeld) {
        try {
          console.log('✅ Sábado realizado - dando baixa nos débitos...');
          
          // Para cada professor no horário gerado, dar baixa nas aulas
          const teacherIds = new Set<string>();
          Object.values(makeupSchedule).forEach((slots: MakeupSlot[]) => {
            slots.forEach(slot => teacherIds.add(slot.teacherId));
          });
          
          // Registrar as reposições realizadas
          for (const teacherId of teacherIds) {
            const teacherSlots = Object.values(makeupSchedule)
              .flat()
              .filter(slot => slot.teacherId === teacherId);
            
            await api.post(`/emergency-schedules/teacher-debts/${teacherId}/pay`, {
              date: selectedDate,
              hoursRepaid: teacherSlots.length,
              details: teacherSlots.map(s => ({
                subjectId: s.subjectId,
                classId: s.classId,
                period: s.period
              }))
            });
          }
          
          console.log('✅ Baixa nos débitos concluída!');
          toast.success('✅ Horário de reposição salvo e débitos atualizados!');
        } catch (error) {
          console.error('❌ Erro ao dar baixa nos débitos:', error);
          toast.error('Horário salvo, mas houve erro ao atualizar os débitos.');
        }
      } else {
        toast.success('✅ Horário de reposição salvo com sucesso!');
      }
      
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-schedules'] });
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar horário de reposição');
    }
  });

  // Deletar horário de reposição
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/saturday-makeup/${id}`);
    },
    onSuccess: () => {
      toast.success('✅ Horário de reposição excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
    },
    onError: (error) => {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir horário de reposição');
    }
  });

  // Mutation para marcar presença de professor
  const toggleTeacherAttendanceMutation = useMutation({
    mutationFn: async ({ id, teacherId, attended }: { id: string; teacherId: string; attended: boolean }) => {
      const url = `/saturday-makeup/${id}/attendance`;
      console.log('🔄 Atualizando presença:', { id, teacherId, attended, url });
      console.log('📡 URL completa:', `${api.defaults.baseURL}${url}`);
      return await api.put(url, { teacherId, attended });
    },
    onSuccess: () => {
      toast.success('✅ Presença atualizada!');
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-schedules'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro COMPLETO ao atualizar presença:', error);
      console.error('📋 Status:', error.response?.status);
      console.error('📋 Data:', error.response?.data);
      console.error('📋 Config:', error.config);
      toast.error('Erro ao atualizar presença');
    }
  });

  // Processar sábado após realização (dar baixa e acumular débitos)
  const processSaturdayMutation = useMutation({
    mutationFn: async (saturdayId: string) => {
      console.log('🔄 Processando sábado:', saturdayId);
      return await api.post(`/saturday-makeup/${saturdayId}/process`);
    },
    onSuccess: (response) => {
      const { totalRealizedHours, absentTeachers, attendedTeachers } = response.data.data;
      toast.success(
        `✅ Sábado processado!\n` +
        `${totalRealizedHours} horas realizadas\n` +
        `${attendedTeachers} professor(es) presente(s)\n` +
        `${absentTeachers} ausente(s) - débitos acumulados`
      );
      queryClient.invalidateQueries({ queryKey: ['makeup-saturdays'] });
      queryClient.invalidateQueries({ queryKey: ['emergency-schedules'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao processar sábado:', error);
      toast.error('Erro ao processar sábado');
    }
  });

  const handleSave = () => {
    if (!selectedDate) {
      toast.error('Selecione uma data para o sábado de reposição');
      return;
    }

    if (Object.keys(makeupSchedule).length === 0) {
      toast.error('Gere um horário de reposição primeiro!');
      return;
    }

    const data = {
      date: selectedDate,
      schedule: makeupSchedule
    };

    saveMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    console.log('🗑️ handleDelete chamado com ID:', id);
    console.log('🔍 Tipo do ID:', typeof id);
    console.log('🔍 ID é truthy?', !!id);
    
    if (!id) {
      toast.error('ID do horário não encontrado');
      console.error('❌ ID inválido para exclusão:', id);
      return;
    }
    
    // Verificar token
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      console.log('🔑 Token presente:', !!parsed?.state?.token);
      console.log('👤 User do token:', parsed?.state?.user);
    }
    
    if (confirm('Tem certeza que deseja excluir este horário de reposição?')) {
      console.log('✅ Confirmação OK, chamando deleteMutation...');
      deleteMutation.mutate(id);
    } else {
      console.log('❌ Usuário cancelou a exclusão');
    }
  };

  const handleView = (saved: any) => {
    // Converter a data para o formato YYYY-MM-DD para o input date
    const dateObj = new Date(saved.date);
    const formattedDate = dateObj.toISOString().split('T')[0];
    
    setSelectedDate(formattedDate);
    setMakeupSchedule(saved.schedule);
    setWasHeld(saved.wasHeld || false);
    
    toast.success('📅 Horário carregado com sucesso!');
  };

  // Imprimir horário
  const handlePrint = () => {
    window.print();
  };

  const getSubjectColor = (subjectId: string) => {
    const subject = subjects.find((s: Subject) => s._id === subjectId || s.id === subjectId);
    return subject?.color || '#6B7280';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-800">
          <Calendar className="text-blue-600" />
          Sábados de Reposição
        </h1>
        <p className="text-blue-700 mt-2">
          Gere automaticamente horários de reposição para professores que faltaram durante a semana
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Configuração */}
          <div className="card">
            <h3 className="font-bold text-lg mb-4">📋 Configuração do Sábado de Reposição</h3>
            
            <div className="space-y-4">
              {/* Período de Busca de Faltosos */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  Período de Busca de Professores Faltosos
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input w-full"
                      placeholder="Início do período"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Final</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input w-full"
                      placeholder="Fim do período"
                    />
                  </div>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  ℹ️ Deixe em branco para buscar todos os professores com aulas pendentes
                </p>
              </div>

              {/* Data do Sábado */}
              <div>
                <label className="block text-sm font-medium mb-2">Data do Sábado de Reposição</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Checkbox para marcar se foi realizado */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wasHeld}
                    onChange={(e) => setWasHeld(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <div>
                    <div className="font-semibold text-green-800">
                      ✅ Sábado de Reposição foi Realizado
                    </div>
                    <div className="text-sm text-green-700">
                      Marque para dar baixa nas aulas devidas dos professores
                    </div>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <button
                  onClick={generateFromBackend}
                  disabled={isGenerating || !selectedDate}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                  title="Gera automaticamente incluindo débitos acumulados de não comparecimento"
                >
                  <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
                  {isGenerating ? 'Gerando...' : '🎯 Gerar Automático (com Acumulados)'}
                </button>

                <button
                  onClick={generateMakeupSchedule}
                  disabled={isGenerating || !selectedDate || teacherDebts.length === 0}
                  className="btn btn-outline w-full flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
                  {isGenerating ? 'Gerando...' : 'Gerar Manual (Período Filtrado)'}
                </button>
              </div>
              
              {teacherDebts.length === 0 && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  ℹ️ Não há professores com débitos no período selecionado
                </p>
              )}
            </div>
          </div>

          {/* Débitos dos Professores */}
          {teacherDebts.length > 0 && (
            <div className="card border-2 border-yellow-300 bg-yellow-50">
              <h3 className="font-bold text-lg mb-4 text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="text-yellow-600" />
                Professores com Aulas a Repor
              </h3>
              
              <div className="space-y-3">
                {teacherDebts.length === 0 ? (
                  <div className="p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                    <div className="text-6xl mb-3">🎉</div>
                    <div className="text-2xl font-bold text-green-800 mb-2">
                      Todos em dia!
                    </div>
                    <div className="text-gray-600">
                      Não há professores com débitos de reposição no momento.
                    </div>
                  </div>
                ) : (
                  teacherDebts.map(debt => (
                    <div key={debt.teacherId} className="bg-white p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800">{debt.teacherName}</h4>
                        <div className="flex items-center gap-2">
                          {(debt as any).realizedClasses > 0 && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                              ✓ {(debt as any).realizedClasses} reposta(s)
                            </span>
                          )}
                          {debt.accumulatedDebts && debt.accumulatedDebts > 0 && (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold" title="Débitos acumulados de não comparecimento em sábado">
                              ⚠️ {debt.accumulatedDebts} acumulado(s)
                            </span>
                          )}
                          <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {debt.totalDebts} aula{debt.totalDebts > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {debt.debts.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {d.isAccumulated && (
                              <span className="text-red-600 font-bold" title="Débito acumulado">⚠️</span>
                            )}
                            <span className="font-medium">{d.subjectName}</span>
                            <span>em</span>
                            <span className="font-medium">{d.className}</span>
                            <span className="text-red-600">({d.missedLessons} aula{d.missedLessons > 1 ? 's' : ''})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Horário Gerado */}
          {Object.keys(makeupSchedule).length > 0 && (
            <div className="space-y-6">
              {/* Grade Visual (Planilha) */}
              <div className="card border-2 border-green-400 print-container">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-green-800">
                  <Calendar className="text-green-600" />
                  📊 Grade de Horários - Sábado {new Date(selectedDate).toLocaleDateString('pt-BR')}
                </h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-green-600 text-white">
                        <th className="border border-gray-300 p-3 text-center font-bold">Horário</th>
                        {/* Listar todas as turmas que têm aulas */}
                        {Object.keys(makeupSchedule).map(classId => {
                          const classInfo = classes.find((c: Class) => c._id === classId || c.id === classId);
                          return (
                            <th key={classId} className="border border-gray-300 p-3 text-center font-bold">
                              {classInfo?.name || 'Turma'}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Períodos de 1 a 4 */}
                      {[1, 2, 3, 4].map(period => {
                        const periodTimes = [
                          { startTime: '08:00', endTime: '09:00' },
                          { startTime: '09:00', endTime: '10:00' },
                          { startTime: '10:00', endTime: '11:00' },
                          { startTime: '11:00', endTime: '12:00' }
                        ];
                        const time = periodTimes[period - 1];
                        
                        return (
                          <tr key={period} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-3 text-center bg-gray-50">
                              <div className="font-bold text-lg">{period}º</div>
                              <div className="text-xs text-gray-600">{time.startTime} - {time.endTime}</div>
                            </td>
                            {/* Para cada turma, mostrar a aula do período */}
                            {Object.entries(makeupSchedule).map(([classId, slots]) => {
                              const slot = slots.find(s => s.period === period);
                              
                              return (
                                <td 
                                  key={classId} 
                                  className="border border-gray-300 p-2"
                                  style={{
                                    backgroundColor: slot ? getSubjectColor(slot.subjectId) + '30' : 'transparent'
                                  }}
                                >
                                  {slot ? (
                                    <div className="text-center">
                                      <div 
                                        className="font-bold text-sm mb-1 px-2 py-1 rounded"
                                        style={{ 
                                          backgroundColor: getSubjectColor(slot.subjectId),
                                          color: 'white'
                                        }}
                                      >
                                        {slot.subjectName}
                                      </div>
                                      <div className="text-xs text-gray-700 font-medium">
                                        {slot.teacherName}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center text-gray-400 text-xs">—</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>Horário: 8h às 12h (4 períodos)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{Object.keys(makeupSchedule).length} turma(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} />
                    <span>{Object.values(makeupSchedule).flat().length} aula(s)</span>
                  </div>
                </div>
              </div>

              {/* Resumo e ações */}
              {wasHeld && (
                <div className="card bg-green-50 border-2 border-green-400 no-print">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-600 mt-1" size={24} />
                    <div>
                      <h4 className="font-bold text-green-800 mb-2">
                        ✅ Sábado Marcado como Realizado
                      </h4>
                      <p className="text-sm text-green-700 mb-2">
                        Ao salvar, as seguintes ações serão executadas:
                      </p>
                      <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                        <li>Salvar horário de reposição do dia {new Date(selectedDate).toLocaleDateString('pt-BR')}</li>
                        <li>Dar baixa em {Object.values(makeupSchedule).flat().length} aula(s) dos professores</li>
                        <li>Atualizar débitos pendentes automaticamente</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 no-print">
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className={`btn ${wasHeld ? 'btn-success' : 'btn-primary'} flex-1 flex items-center justify-center gap-2`}
                >
                  <Save size={20} />
                  {saveMutation.isPending 
                    ? 'Salvando...' 
                    : wasHeld 
                      ? '💾 Salvar e Dar Baixa nos Débitos'
                      : '💾 Salvar Horário'}
                </button>
                <button
                  onClick={handlePrint}
                  className="btn btn-outline flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Imprimir
                </button>
              </div>

              {Object.entries(makeupSchedule).map(([classId, slots]) => {
                const classInfo = classes.find((c: Class) => c._id === classId || c.id === classId);
                
                return (
                  <div key={classId} className="card border-2 border-green-400 print-container">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <CheckCircle className="text-green-600" />
                      Turma: {classInfo?.name || classId}
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead className="bg-green-100">
                          <tr>
                            <th className="border border-gray-300 p-3 text-left">Horário</th>
                            <th className="border border-gray-300 p-3 text-left">Início</th>
                            <th className="border border-gray-300 p-3 text-left">Fim</th>
                            <th className="border border-gray-300 p-3 text-left">Componente Curricular</th>
                            <th className="border border-gray-300 p-3 text-left">Professor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slots.map((slot, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-3">
                                <span className="font-bold">{slot.period}º Horário</span>
                              </td>
                              <td className="border border-gray-300 p-3">{slot.startTime}</td>
                              <td className="border border-gray-300 p-3">{slot.endTime}</td>
                              <td className="border border-gray-300 p-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: getSubjectColor(slot.subjectId) }}
                                  />
                                  <span className="font-medium">{slot.subjectName}</span>
                                </div>
                              </td>
                              <td className="border border-gray-300 p-3">
                                <span className="font-medium">{slot.teacherName}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel Lateral */}
        <div className="space-y-6 no-print">
          {/* Horários Salvos */}
          {savedMakeupSchedules.length > 0 && (
            <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
              <h3 className="font-bold text-lg mb-3 text-purple-800 flex items-center gap-2">
                <Calendar size={20} />
                Sábados Agendados
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedMakeupSchedules.map((saved: any) => {
                  const scheduleId = saved._id || saved.id;
                  const attendedTeachers = saved.attendedTeachers || [];
                  
                  // Extrair lista única de professores do horário
                  const teachersInSchedule = new Map<string, string>();
                  Object.values(saved.schedule || {}).forEach((period: any) => {
                    if (Array.isArray(period)) {
                      period.forEach((slot: any) => {
                        if (slot?.teacherId && slot?.teacherName) {
                          teachersInSchedule.set(slot.teacherId, slot.teacherName);
                        }
                      });
                    }
                  });
                  
                  return (
                  <div 
                    key={scheduleId} 
                    className="bg-white p-3 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-purple-800">
                        📅 {new Date(saved.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {attendedTeachers.length}/{teachersInSchedule.size} professor(es)
                      </span>
                    </div>
                    
                    {/* Lista de professores com checkbox individual */}
                    <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
                      {Array.from(teachersInSchedule.entries()).map(([teacherId, teacherName]) => {
                        const attended = attendedTeachers.includes(teacherId);
                        return (
                          <label 
                            key={teacherId}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50 ${
                              attended ? 'bg-green-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={attended}
                              onChange={(e) => {
                                toggleTeacherAttendanceMutation.mutate({ 
                                  id: scheduleId, 
                                  teacherId,
                                  attended: e.target.checked 
                                });
                              }}
                              className="w-4 h-4 text-green-600 rounded"
                            />
                            <span className={`text-sm ${
                              attended ? 'text-green-700 font-medium' : 'text-gray-700'
                            }`}>
                              {teacherName}
                            </span>
                            {attended && <span className="text-xs text-green-600">✓</span>}
                          </label>
                        );
                      })}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {Object.keys(saved.schedule || {}).length} turma(s) · {Object.values(saved.schedule || {}).flat().length} aula(s)
                      {saved.status && (
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                          saved.status === 'realized' ? 'bg-green-100 text-green-700' :
                          saved.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {saved.status === 'realized' ? '✓ Realizado' :
                           saved.status === 'cancelled' ? '✗ Cancelado' :
                           '⏳ Planejado'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleView(saved)}
                        className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-1 text-xs"
                      >
                        <Eye size={14} />
                        Ver
                      </button>
                      <button
                        onClick={() => {
                          setMakeupSchedule(saved.schedule);
                          setTimeout(() => window.print(), 100);
                        }}
                        className="btn btn-sm btn-outline flex items-center justify-center gap-1 text-xs"
                      >
                        <Printer size={14} />
                      </button>
                      {saved.status !== 'realized' && attendedTeachers.length > 0 && (
                        <button
                          onClick={() => {
                            if (confirm(`Processar sábado de ${new Date(saved.date).toLocaleDateString('pt-BR')}?\n\n` +
                              `✓ Dar baixa em débitos dos ${attendedTeachers.length} presentes\n` +
                              `✗ Acumular débitos dos ${teachersInSchedule.size - attendedTeachers.length} ausentes`)) {
                              processSaturdayMutation.mutate(scheduleId);
                            }
                          }}
                          className="btn btn-sm btn-success flex items-center justify-center gap-1 text-xs"
                          title="Processar: dar baixa e acumular débitos"
                          disabled={processSaturdayMutation.isPending}
                        >
                          <CheckCircle size={14} />
                          Processar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(scheduleId)}
                        className="btn btn-sm btn-error flex items-center justify-center gap-1 text-xs"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
            <h3 className="font-bold text-lg mb-3 text-blue-800 flex items-center gap-2">
              <AlertTriangle size={20} />
              Como Funciona
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Selecione a data do sábado de reposição</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>O sistema busca automaticamente os professores faltosos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Clique em "Gerar Horário Automaticamente"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Revise o horário gerado por turma</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">5.</span>
                <span>Salve e imprima para distribuição</span>
              </li>
            </ul>
          </div>

          {/* Estatísticas */}
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <h3 className="font-bold text-lg mb-3 text-green-800 flex items-center gap-2">
              <Users size={20} />
              Resumo
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Professores com débito:</span>
                <span className="font-bold text-green-800">{teacherDebts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Total de aulas a repor:</span>
                <span className="font-bold text-green-800">
                  {teacherDebts.reduce((acc, d) => acc + d.totalDebts, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Turmas afetadas:</span>
                <span className="font-bold text-green-800">
                  {Object.keys(makeupSchedule).length}
                </span>
              </div>
            </div>
          </div>

          {/* Info Adicional */}
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <h3 className="font-bold text-lg mb-3 text-yellow-800 flex items-center gap-2">
              <BookOpen size={20} />
              Informações
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span>⏰</span>
                <span>Horário padrão: 8h às 12h (4 períodos)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>📊</span>
                <span>Baseado em horários emergenciais salvos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Distribuição automática por turma</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CSS para impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .print-container, .print-container * {
            visibility: visible;
          }
          
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            page-break-after: always;
          }
          
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 10pt !important;
          }
          
          th {
            background-color: #e5e7eb !important;
            border: 1px solid #000 !important;
            padding: 6px 4px !important;
            font-weight: bold !important;
          }
          
          td {
            border: 1px solid #000 !important;
            padding: 6px 4px !important;
            vertical-align: top !important;
          }
          
          .bg-green-100 {
            background-color: #d1fae5 !important;
          }
          
          .bg-gray-50 {
            background-color: #f9fafb !important;
          }
          
          h2, h3 {
            color: #000 !important;
            margin-bottom: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
