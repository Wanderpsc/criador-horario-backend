import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { scheduleAPI, schoolAPI } from '../services/api';
import { subscriptionAPI } from '../services/subscriptionAPI';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, RefreshCw, Printer, Download, Lock } from 'lucide-react';

interface ScheduleSlot {
  id: string;
  teacherId: string;
  subjectId: string;
  dayOfWeek: number;
  slotNumber: number;
  teacher: { name: string };
  subject: { name: string; color?: string };
}

interface Schedule {
  id: string;
  name: string;
  year: number;
  semester?: number;
  daysPerWeek: number;
  includeSaturday: boolean;
  slots: ScheduleSlot[];
}

interface School {
  name: string;
  logo?: string;
}

export default function ScheduleView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [accessReason, setAccessReason] = useState('');
  const [accessMessage, setAccessMessage] = useState('');

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const slots = Array.from({ length: 8 }, (_, i) => i + 1);

  useEffect(() => {
    loadSchedule();
    checkAccess();
  }, [id]);

  const checkAccess = async () => {
    if (!user?.schoolId) return;
    
    try {
      const response = await subscriptionAPI.checkScheduleAccess(user.schoolId);
      setHasAccess(response.data.hasAccess);
      setAccessReason(response.data.reason || '');
      setAccessMessage(response.data.message || '');
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
    }
  };

  const loadSchedule = async () => {
    try {
      const scheduleRes = await scheduleAPI.getById(id!);
      const scheduleData = scheduleRes.data.data;
      
      setSchedule(scheduleData);

      // Buscar escola usando o schoolId do schedule
      if (scheduleData.schoolId) {
        const schoolRes = await schoolAPI.getById(scheduleData.schoolId);
        setSchool(schoolRes.data.data);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar horário');
      navigate('/schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!confirm('Gerar novo horário automaticamente? Isso substituirá o horário atual.')) {
      return;
    }

    try {
      setGenerating(true);
      await scheduleAPI.generate(id!);
      toast.success('Horário gerado com sucesso!');
      loadSchedule();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar horário');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getSlot = (day: number, slotNumber: number): ScheduleSlot | undefined => {
    return schedule?.slots.find(
      (s) => s.dayOfWeek === day && s.slotNumber === slotNumber
    );
  };

  if (loading) {
    return (
      <div className="card">
        <p>Carregando horário...</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Horário não encontrado</p>
      </div>
    );
  }

  // Modal de bloqueio para usuários trial
  if (!hasAccess) {
    const getReasonTitle = () => {
      switch (accessReason) {
        case 'trial_limitation':
          return '🔒 Plano Trial - Acesso Limitado';
        case 'contract_not_signed':
          return '📄 Contrato Pendente';
        case 'expired':
          return '⏰ Assinatura Expirada';
        default:
          return '🔒 Acesso Restrito';
      }
    };

    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-lg shadow-xl p-8 border-2 border-yellow-500">
          <div className="text-center mb-6">
            <Lock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getReasonTitle()}
            </h2>
            <p className="text-gray-600 text-lg">
              {accessMessage}
            </p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Você ainda pode:
                </h3>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  <li>Cadastrar professores e disciplinas</li>
                  <li>Criar turmas e séries</li>
                  <li>Configurar horários disponíveis</li>
                  <li>Gerenciar seu calendário escolar</li>
                </ul>
              </div>
            </div>
          </div>

          {accessReason === 'trial_limitation' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  ✨ Desbloqueie o Acesso Total
                </h3>
                <p className="text-blue-700 text-sm mb-3">
                  Com um plano pago você terá:
                </p>
                <ul className="text-blue-700 text-sm space-y-1 ml-4">
                  <li>✓ Acesso completo ao horário gerado</li>
                  <li>✓ Impressão profissional de horários</li>
                  <li>✓ Exportação em múltiplos formatos</li>
                  <li>✓ Suporte técnico prioritário</li>
                  <li>✓ Atualizações gratuitas</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/select-plan')}
                className="w-full btn btn-primary flex items-center justify-center text-lg py-4"
              >
                <Lock className="w-6 h-6 mr-2" />
                Ver Planos e Preços
              </button>
            </div>
          )}

          {accessReason === 'contract_not_signed' && (
            <button
              onClick={() => navigate('/contract-signature')}
              className="w-full btn btn-primary flex items-center justify-center text-lg py-4"
            >
              Assinar Contrato
            </button>
          )}

          {accessReason === 'expired' && (
            <button
              onClick={() => navigate('/select-plan')}
              className="w-full btn btn-primary flex items-center justify-center text-lg py-4"
            >
              Renovar Assinatura
            </button>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-4 btn btn-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const daysToShow = schedule.includeSaturday ? 6 : 5;

  return (
    <div>
      <div className="mb-6 no-print flex justify-between items-center">
        <button
          onClick={() => navigate('/schedules')}
          className="btn btn-secondary flex items-center"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary flex items-center"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Gerando...' : 'Gerar Automático'}
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-secondary flex items-center"
          >
            <Printer className="w-5 h-5 mr-2" />
            Imprimir
          </button>
        </div>
      </div>

      <div ref={printRef} className="bg-white">
        {/* Header for print */}
        <div className="print-header mb-6 p-6 border-b-2 border-gray-300">
          <div className="flex items-center justify-between">
            {school?.logo && (
              <img
                src={school.logo}
                alt="Logo"
                className="h-16 object-contain"
              />
            )}
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {school?.name || 'Escola'}
              </h1>
              <h2 className="text-xl text-gray-700 mt-2">
                Horário de Aulas - {schedule.name}
              </h2>
              <p className="text-gray-600">
                {schedule.year}
                {schedule.semester && ` - ${schedule.semester}º Semestre`}
              </p>
            </div>
            <div className="w-16" />
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-gray-300">
            <thead>
              <tr className="bg-primary-600 text-white">
                <th className="border-2 border-gray-300 px-4 py-3 text-center w-24">
                  Aula
                </th>
                {days.slice(0, daysToShow).map((day, idx) => (
                  <th
                    key={idx}
                    className="border-2 border-gray-300 px-4 py-3 text-center"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slotNumber) => (
                <tr key={slotNumber} className="hover:bg-gray-50">
                  <td className="border-2 border-gray-300 px-4 py-3 text-center font-bold bg-gray-100">
                    {slotNumber}ª
                  </td>
                  {Array.from({ length: daysToShow }).map((_, dayIdx) => {
                    const slot = getSlot(dayIdx, slotNumber);
                    return (
                      <td
                        key={dayIdx}
                        className="border-2 border-gray-300 px-3 py-3 min-w-[150px]"
                        style={{
                          backgroundColor: slot?.subject.color
                            ? `${slot.subject.color}20`
                            : 'white'
                        }}
                      >
                        {slot ? (
                          <div>
                            <div
                              className="font-semibold text-sm"
                              style={{ color: slot.subject.color || '#000' }}
                            >
                              {slot.subject.name}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {slot.teacher.name}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-sm">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with copyright - only on print */}
        <div className="print-footer mt-8 pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-600">
          <p>© 2025 Wander Pires Silva Coelho - wanderpsc@gmail.com</p>
          <p className="text-xs mt-1">Sistema de Criação de Horário de Aulas</p>
        </div>
      </div>

      {schedule.slots.length === 0 && (
        <div className="card mt-6 text-center py-8 no-print">
          <p className="text-gray-500 mb-4">
            Este horário ainda não possui aulas distribuídas.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary inline-flex items-center"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Gerando...' : 'Gerar Horário Automaticamente'}
          </button>
        </div>
      )}
    </div>
  );
}
