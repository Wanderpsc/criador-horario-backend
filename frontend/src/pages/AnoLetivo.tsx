/**
 * Página de Gerenciamento do Ano Letivo
 * © 2025 Wander Pires Silva Coelho
 */

import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'react-hot-toast';
import { Calendar, Copy, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

interface YearStats {
  year: number;
  attendanceCount: number;
  paymentCount: number;
  workloadCount: number;
  schoolDayCount: number;
}

export default function AnoLetivo() {
  const { schoolYear, setSchoolYear } = useAuthStore();
  const [years, setYears] = useState<YearStats[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadedYears, setLoadedYears] = useState(false);

  const [newYear, setNewYear] = useState<number>(new Date().getFullYear() + 1);
  const [copyFromYear, setCopyFromYear] = useState<number>(new Date().getFullYear());
  const [copyWorkload, setCopyWorkload] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadYears = async () => {
    setLoadingYears(true);
    try {
      const res = await api.get('/school-years');
      setYears(res.data.data || []);
      setLoadedYears(true);
    } catch (err: any) {
      toast.error('Erro ao carregar anos letivos: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingYears(false);
    }
  };

  const handleCreate = async () => {
    if (!newYear || newYear < 2020 || newYear > 2100) {
      toast.error('Ano letivo inválido');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/school-years/new', {
        year: newYear,
        copyFromYear,
        copyWorkload,
      });
      toast.success(res.data.message || `Ano letivo ${newYear} criado!`);
      setSchoolYear(newYear);
      // Recarregar lista
      loadYears();
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Erro ao criar ano letivo: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 rounded-xl">
          <Calendar size={28} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gerenciamento do Ano Letivo</h1>
          <p className="text-gray-500 text-sm">Ano ativo: <span className="font-bold text-blue-600">{schoolYear}</span></p>
        </div>
      </div>

      {/* Anos disponíveis */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Anos Letivos com Dados</h2>
          <button
            onClick={loadYears}
            disabled={loadingYears}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {loadingYears ? 'Carregando...' : loadedYears ? '🔄 Atualizar' : '📊 Carregar estatísticas'}
          </button>
        </div>

        {loadedYears && years.length === 0 && (
          <p className="px-6 py-4 text-gray-500 text-sm">Nenhum ano letivo com dados encontrado.</p>
        )}

        {years.map(ys => (
          <div
            key={ys.year}
            className={`flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50 transition-colors ${
              schoolYear === ys.year ? 'bg-blue-50' : ''
            }`}
            onClick={() => setSchoolYear(ys.year)}
          >
            <div className="flex items-center gap-3">
              {schoolYear === ys.year && <CheckCircle2 size={18} className="text-blue-600" />}
              {schoolYear !== ys.year && <div className="w-[18px]" />}
              <div>
                <p className="font-semibold text-gray-800">{ys.year}</p>
                <p className="text-xs text-gray-500">
                  {ys.workloadCount} lotações · {ys.attendanceCount} frequências · {ys.paymentCount} pagamentos · {ys.schoolDayCount} dias letivos
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        ))}

        {!loadedYears && (
          <p className="px-6 py-5 text-sm text-gray-400 italic">Clique em "Carregar estatísticas" para ver os anos disponíveis.</p>
        )}
      </div>

      {/* Iniciar novo ano */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">✨ Iniciar Novo Ano Letivo</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cria a estrutura para um novo ano copiando as lotações docentes do ano anterior.
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Novo ano letivo
              </label>
              <input
                type="number"
                value={newYear}
                onChange={e => setNewYear(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={2020}
                max={2100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Copiar lotações de
              </label>
              <input
                type="number"
                value={copyFromYear}
                onChange={e => setCopyFromYear(Number(e.target.value))}
                disabled={!copyWorkload}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                min={2020}
                max={2100}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={copyWorkload}
              onChange={e => setCopyWorkload(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Copy size={14} />
                Copiar lotações docentes (Professor ↔ Componente ↔ Turma)
              </p>
              <p className="text-xs text-gray-500">
                Copia a estrutura de quem leciona o quê e em qual turma — sem copiar frequências ou pagamentos.
              </p>
            </div>
          </label>

          {/* Aviso */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Frequências, pagamentos de aulas, sábados de reposição e dias letivos começam do zero no novo ano.
              A estrutura (professores, turmas, componentes) é compartilhada e não precisa ser recriada.
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              `🚀 Iniciar Ano Letivo ${newYear}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
