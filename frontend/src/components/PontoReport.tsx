/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Componente: Relatório Imprimível de Ponto Eletrônico de Professores
 */
import { useState, useMemo } from 'react';
import { Printer, Filter, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ClassRecord {
  period: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  grade?: string;
  status: 'present' | 'absent' | 'pending';
  entryTime?: string;
  markedAt?: string;
  isPedagogical?: boolean;
}

interface AttendanceRecord {
  _id?: string;
  teacherId: string;
  teacherName: string;
  date: string;
  dayOfWeek: string;
  classes: ClassRecord[];
  totalPresentClasses: number;
  totalAbsentClasses: number;
  totalScheduledClasses: number;
}

interface Props {
  date: string;
  attendanceList: AttendanceRecord[];
  schoolData?: { name?: string; logo?: string };
}

type FilterMode = 'day' | 'teacher' | 'class';

export default function PontoReport({ date, attendanceList, schoolData }: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>('day');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'pending'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dayRecords = useMemo(() =>
    attendanceList.filter(r => r.date === date),
    [attendanceList, date]
  );

  const teachers = useMemo(() =>
    [...new Set(attendanceList.map(r => r.teacherName))].sort(),
    [attendanceList]
  );

  const classes = useMemo(() => {
    const set = new Set<string>();
    attendanceList.forEach(r => r.classes.forEach(c => c.className && set.add(c.className)));
    return [...set].sort();
  }, [attendanceList]);

  const filtered = useMemo(() => {
    let base = filterMode === 'day' ? dayRecords : attendanceList;
    if (filterTeacher) base = base.filter(r => r.teacherName === filterTeacher);
    if (filterClass)   base = base.filter(r => r.classes.some(c => c.className === filterClass));
    return base.map(r => ({
      ...r,
      classes: r.classes.filter(c =>
        (!filterClass || c.className === filterClass) &&
        (filterStatus === 'all' || c.status === filterStatus)
      )
    })).filter(r => r.classes.length > 0);
  }, [filterMode, dayRecords, attendanceList, filterTeacher, filterClass, filterStatus]);

  const totals = useMemo(() => {
    let present = 0, absent = 0, pending = 0;
    filtered.forEach(r => r.classes.forEach(c => {
      if (c.status === 'present') present++;
      else if (c.status === 'absent') absent++;
      else pending++;
    }));
    return { present, absent, pending, total: present + absent + pending };
  }, [filtered]);

  function statusBadge(status: string) {
    if (status === 'present') return <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={10} />Presente</span>;
    if (status === 'absent')  return <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={10} />Ausente</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><Clock size={10} />Pendente</span>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-800">Filtros do Relatório</span>

          {/* Modo */}
          <div className="flex rounded-lg overflow-hidden border border-indigo-200 ml-2">
            {(['day','teacher','class'] as FilterMode[]).map(m => (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${filterMode === m ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 hover:bg-indigo-50'}`}>
                {m === 'day' ? '📅 Dia' : m === 'teacher' ? '👤 Professor' : '🏫 Turma'}
              </button>
            ))}
          </div>

          {/* Status */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="text-xs border border-indigo-200 rounded-lg px-2 py-1 bg-white text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">Todos os status</option>
            <option value="present">✅ Presentes</option>
            <option value="absent">❌ Ausentes</option>
            <option value="pending">⏳ Pendentes</option>
          </select>

          {/* Professor */}
          <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
            className="text-xs border border-indigo-200 rounded-lg px-2 py-1 bg-white text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[180px]">
            <option value="">Todos os professores</option>
            {teachers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Turma */}
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="text-xs border border-indigo-200 rounded-lg px-2 py-1 bg-white text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">Todas as turmas</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Totalizadores */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="font-bold text-gray-700">Total: <strong>{totals.total}</strong> aulas</span>
          <span className="text-green-700 font-semibold">✅ {totals.present} presentes</span>
          <span className="text-red-600 font-semibold">❌ {totals.absent} ausentes</span>
          <span className="text-gray-500 font-semibold">⏳ {totals.pending} pendentes</span>
          {totals.total > 0 && (
            <span className="text-indigo-700 font-bold">
              {Math.round((totals.present / totals.total) * 100)}% frequência
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            <Printer size={14} /> Imprimir Relatório
          </button>
        </div>
      </div>

      {/* ─── Área imprimível ─────────────────────────────────────────────────── */}
      <div id="ponto-report-print">
        {/* Cabeçalho de impressão */}
        <div className="hidden print:block border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {schoolData?.logo && <img src={schoolData.logo} alt="Logo" className="h-16 object-contain" />}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{schoolData?.name || 'Escola'}</h1>
              <p className="text-sm text-gray-600">Relatório de Ponto Eletrônico de Professores</p>
              <p className="text-xs text-gray-500 mt-1">
                Período: {filterMode === 'day'
                  ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                  : 'Todos os dias registrados'}
                {filterTeacher && ` · Professor: ${filterTeacher}`}
                {filterClass && ` · Turma: ${filterClass}`}
                {filterStatus !== 'all' && ` · Status: ${filterStatus}`}
              </p>
              <p className="text-xs text-gray-400">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div className="ml-auto text-right text-sm">
              <p className="font-bold text-gray-800">Resumo</p>
              <p className="text-green-700">✅ {totals.present} presentes</p>
              <p className="text-red-600">❌ {totals.absent} ausentes</p>
              {totals.total > 0 && <p className="text-indigo-700 font-bold">{Math.round((totals.present / totals.total) * 100)}% frequência</p>}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BarChartIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum registro encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => {
              const key = `${record.teacherId}-${record.date}`;
              const isExp = expanded.has(key);
              const pct = record.classes.length > 0
                ? Math.round((record.classes.filter(c => c.status === 'present').length / record.classes.length) * 100)
                : 0;
              return (
                <div key={key} className="border border-gray-200 rounded-xl overflow-hidden print:border-gray-400">
                  {/* Header do professor */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-indigo-50 hover:from-indigo-50 hover:to-indigo-100 transition-colors no-print"
                    onClick={() => setExpanded(prev => {
                      const s = new Set(prev);
                      s.has(key) ? s.delete(key) : s.add(key);
                      return s;
                    })}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        {record.teacherName.split(' ').map(w => w[0]).slice(0,2).join('')}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-800 text-sm">{record.teacherName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {record.classes.length} aula(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-700 font-semibold">{record.classes.filter(c => c.status === 'present').length}✅</span>
                        <span className="text-red-600 font-semibold">{record.classes.filter(c => c.status === 'absent').length}❌</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {pct}%
                        </span>
                      </div>
                      {isExp ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                  </button>

                  {/* Linha visível na impressão */}
                  <div className="hidden print:flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-300">
                    <div>
                      <p className="font-bold text-gray-800">{record.teacherName}</p>
                      <p className="text-xs text-gray-500">{new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {record.classes.length} aula(s)</p>
                    </div>
                    <div className="text-xs flex gap-3 font-semibold">
                      <span className="text-green-700">{record.classes.filter(c => c.status === 'present').length} presentes</span>
                      <span className="text-red-600">{record.classes.filter(c => c.status === 'absent').length} ausentes</span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                  </div>

                  {/* Tabela de aulas */}
                  {(isExp || true) && (
                    <div className={`${!isExp ? 'hidden' : ''} print:block`}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-indigo-600 text-white">
                            <th className="px-3 py-2 text-left font-semibold">Período</th>
                            <th className="px-3 py-2 text-left font-semibold">Horário</th>
                            <th className="px-3 py-2 text-left font-semibold">Disciplina</th>
                            <th className="px-3 py-2 text-left font-semibold">Turma</th>
                            <th className="px-3 py-2 text-left font-semibold">Registro</th>
                            <th className="px-3 py-2 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.classes.map((cls, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 font-bold text-indigo-700">{cls.period}º</td>
                              <td className="px-3 py-2 text-gray-600">{cls.startTime}–{cls.endTime}</td>
                              <td className="px-3 py-2 font-medium text-gray-800">
                                {cls.isPedagogical ? '📋 H. Pedagógico' : cls.subjectName}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{cls.className}{cls.grade ? ` · ${cls.grade}` : ''}</td>
                              <td className="px-3 py-2 text-gray-500">{cls.entryTime || '—'}</td>
                              <td className="px-3 py-2">{statusBadge(cls.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Assinaturas para impressão */}
        <div className="hidden print:block mt-12 pt-6 border-t-2 border-gray-400">
          <div className="grid grid-cols-3 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-gray-400 pt-2 mt-16">
                <p className="font-semibold">Diretor(a) / Coordenador(a)</p>
              </div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-2 mt-16">
                <p className="font-semibold">Responsável pelo Registro</p>
              </div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-2 mt-16">
                <p className="font-semibold">Data e Carimbo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ponto-report-print, #ponto-report-print * { visibility: visible; }
          #ponto-report-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print\\:block { display: block !important; }
          .hidden.print\\:block { display: block !important; }
          .hidden.print\\:flex { display: flex !important; }
          @page { margin: 1.5cm; size: A4 landscape; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

// fallback icon
function BarChartIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="9.5" y="7" width="4" height="14" rx="1" /><rect x="16" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}
