/**
 * Página pública para professores preencherem lacunas de ausência.
 * Acessível via link: /#/substitute/:token
 * Sem necessidade de autenticação.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  User, BookOpen, Clock, CheckCircle, AlertCircle,
  ChevronRight, ArrowUpCircle, RotateCcw,
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

interface SlotData {
  _id: string;
  period: number;
  startTime: string;
  endTime: string;
  absentTeacherId: string;
  absentTeacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  isFilled: boolean;
  filledBy: string;
}

interface LinkData {
  _id: string;
  token: string;
  schoolName: string;
  date: string;
  dateLabel: string;
  slots: SlotData[];
  isActive: boolean;
  expiresAt: string;
}

interface TeacherOption { _id: string; name: string; }
interface SubjectOption { _id: string; name: string; }
interface ClassOption { _id: string; name: string; }

interface DebtItem {
  _id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  hoursOwed: number;
  hoursPaid: number;
  remaining: number;
  absenceDate: string;
}

type Step = 'identify' | 'select-slot' | 'fill-form' | 'success';

export default function SubstitutePublic() {
  const { token } = useParams<{ token: string }>();

  const [status, setStatus] = useState<'loading' | 'error' | 'expired' | 'ok'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teacherSubjectsMap, setTeacherSubjectsMap] = useState<Record<string, string[]>>({});

  const [step, setStep] = useState<Step>('identify');

  // Passo 1 — Identificação
  const [teacherName, setTeacherName] = useState('');
  const [teacherId, setTeacherId] = useState('');  // se escolher da lista
  const [useList, setUseList] = useState(true);

  // Passo 2 — Qual lacuna preencher
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);

  // Passo 3 — Formulário
  const [fillType, setFillType] = useState<'reposicao' | 'adiantamento'>('reposicao');
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [classId, setClassId] = useState('');
  const [className, setClassName] = useState('');
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // ── Carregar link ────────────────────────────────────────────────────────────
  const fetchLink = () => {
    if (!token) return;
    axios.get(`${API_URL}/substitute-links/public/${token}`)
      .then(res => {
        setLinkData(res.data.link);
        setTeachers(res.data.teachers || []);
        setSubjects(res.data.subjects || []);
        setClasses(res.data.classes || []);
        setTeacherSubjectsMap(res.data.teacherSubjectsMap || {});
        setStatus('ok');
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Erro ao carregar link.';
        if (err.response?.status === 410) setStatus('expired');
        else setStatus('error');
        setErrorMsg(msg);
      });
  };

  useEffect(() => {
    fetchLink();
    // Polling a cada 30s para refletir slots preenchidos por outros professores
    const interval = setInterval(() => {
      if (step !== 'success') fetchLink();
    }, 30_000);
    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carregar débitos do professor ────────────────────────────────────────────
  useEffect(() => {
    if (!teacherId || fillType !== 'reposicao') return;
    setLoadingDebts(true);
    axios.get(`${API_URL}/substitute-links/public/${token}/debts/${teacherId}`)
      .then(res => { setDebts(res.data); setLoadingDebts(false); })
      .catch(() => { setDebts([]); setLoadingDebts(false); });
  }, [teacherId, fillType, token]);

  // Deduplica slots por período + professor ausente + turma (links gerados antes da correção do backend)
  const dedupeSlots = (slots: SlotData[]) => {
    const seen = new Set<string>();
    return slots.filter(s => {
      const key = `${s.period}|${s.absentTeacherId}|${s.classId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const openSlots = dedupeSlots(linkData?.slots.filter(s => !s.isFilled) || []);
  const filledSlots = dedupeSlots(linkData?.slots.filter(s => s.isFilled) || []);

  const handleTeacherSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') { setTeacherId(''); setTeacherName(''); setSubjectId(''); setSubjectName(''); return; }
    const t = teachers.find(t => t._id === val);
    if (t) { setTeacherId(t._id); setTeacherName(t.name); setSubjectId(''); setSubjectName(''); }
  };

  // Classes/disciplinas das lacunas abertas (deduplicas por _id)
  const openSlotClasses: ClassOption[] = (() => {
    const map = new Map<string, ClassOption>();
    openSlots.forEach(s => { if (!map.has(s.classId)) map.set(s.classId, { _id: s.classId, name: s.className }); });
    return Array.from(map.values());
  })();

  const openSlotSubjects: SubjectOption[] = (() => {
    const map = new Map<string, SubjectOption>();
    openSlots.forEach(s => { if (!map.has(s.subjectId)) map.set(s.subjectId, { _id: s.subjectId, name: s.subjectName }); });
    return Array.from(map.values());
  })();

  // Disciplinas filtradas: apenas as das lacunas abertas, podendo filtrar por professor
  const filteredSubjects = (() => {
    const base = openSlotSubjects.length > 0 ? openSlotSubjects : subjects;
    if (!teacherId) return base;
    const allowedIds = teacherSubjectsMap[teacherId];
    if (!allowedIds || allowedIds.length === 0) return base;
    return base.filter(s => allowedIds.includes(s._id));
  })();

  // Classes filtradas: apenas as das lacunas abertas
  const filteredClasses = openSlotClasses.length > 0 ? openSlotClasses : classes;

  const handleSubjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pool = [...openSlotSubjects, ...subjects];
    const s = pool.find(s => s._id === e.target.value);
    if (s) { setSubjectId(s._id); setSubjectName(s.name); }
    else { setSubjectId(''); setSubjectName(''); }
  };

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pool = [...openSlotClasses, ...classes];
    const c = pool.find(c => c._id === e.target.value);
    if (c) { setClassId(c._id); setClassName(c.name); }
    else { setClassId(''); setClassName(''); }
  };

  const canProceedStep1 = teacherName.trim().length >= 3;

  const handleSubmitFill = async () => {
    if (!selectedSlot) return;
    if (!teacherName.trim()) return;
    if (fillType === 'reposicao' && !selectedDebtId) {
      alert('Selecione qual débito está repondo.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/substitute-links/public/${token}/fill`,
        {
          slotId: selectedSlot._id,
          teacherName: teacherName.trim(),
          teacherId,
          subjectId,
          subjectName,
          classId,
          className,
          fillType,
          debtRecordId: fillType === 'reposicao' ? selectedDebtId : undefined,
        }
      );
      setSuccessMsg(res.data.message);
      setStep('success');
      // Atualizar slot local como preenchido
      if (linkData) {
        const updated = { ...linkData };
        const slot = updated.slots.find(s => s._id === selectedSlot._id);
        if (slot) { slot.isFilled = true; slot.filledBy = teacherName.trim(); }
        setLinkData(updated);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao registrar.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Telas de status ──────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Carregando formulário...
        </div>
      </div>
    );
  }

  if (status === 'expired' || status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {status === 'expired' ? 'Link Expirado ou Inativo' : 'Link Inválido'}
          </h2>
          <p className="text-gray-600">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
          <h1 className="text-xl font-bold mb-1">📋 Preenchimento de Lacuna</h1>
          <p className="text-indigo-100 text-sm">{linkData!.schoolName}</p>
          <p className="text-indigo-200 text-sm mt-1">
            📅 {linkData!.dateLabel || new Date(linkData!.date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Lacunas disponíveis */}
        {openSlots.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center text-green-700">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
            <p className="font-medium">Todas as lacunas já foram preenchidas!</p>
            <p className="text-sm mt-1">Não há mais vagas disponíveis para este dia.</p>
          </div>
        ) : (
          <>
            {/* Resumo das lacunas — oculto no passo 2 para evitar duplicidade visual */}
            {step !== 'select-slot' && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Lacunas do dia ({openSlots.length} abertas)
              </h2>
              <div className="space-y-2">
                {openSlots.map(slot => (
                  <div key={slot._id} className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50">
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs font-bold text-amber-800">{slot.startTime}</div>
                      <div className="text-xs text-amber-600">{slot.endTime}</div>
                      <div className="text-xs font-medium text-amber-700 mt-0.5">{slot.period}º período</div>
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-gray-800">{slot.className} — {slot.subjectName}</div>
                      <div className="text-gray-500">Ausente: {slot.absentTeacherName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )} {/* fim step !== 'select-slot' */}

            {/* ── PASSO 1: Identificação ── */}
            {step === 'identify' && (
              <div className="bg-white rounded-xl shadow p-5 space-y-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-500" />
                  Passo 1 — Sua Identificação
                </h2>

                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useList}
                      onChange={e => setUseList(e.target.checked)}
                      className="rounded"
                    />
                    Sou professor cadastrado no sistema
                  </label>
                </div>

                {useList && teachers.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selecione seu nome
                    </label>
                    <select
                      value={teacherId}
                      onChange={handleTeacherSelect}
                      className="w-full border rounded-lg px-3 py-2.5 text-sm"
                    >
                      <option value="">— Escolha um professor —</option>
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seu nome completo
                    </label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={e => setTeacherName(e.target.value)}
                      placeholder="Digite seu nome"
                      className="w-full border rounded-lg px-3 py-2.5 text-sm"
                    />
                  </div>
                )}

                <button
                  disabled={!canProceedStep1}
                  onClick={() => setStep('select-slot')}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── PASSO 2: Escolher lacuna ── */}
            {step === 'select-slot' && (
              <div className="bg-white rounded-xl shadow p-5 space-y-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Passo 2 — Qual lacuna você vai cobrir?
                </h2>
                <p className="text-sm text-gray-500">Olá, <strong>{teacherName}</strong>! Selecione a aula:</p>
                <div className="space-y-2">
                  {openSlots.map(slot => (
                    <button
                      key={slot._id}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setClassId(slot.classId);
                        setClassName(slot.className);
                        setSubjectId(slot.subjectId);
                        setSubjectName(slot.subjectName);
                        setStep('fill-form');
                      }}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">
                            {slot.startTime}–{slot.endTime} | {slot.period}º período
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {slot.className} — {slot.subjectName}
                          </div>
                          <div className="text-xs text-gray-400">Ausente: {slot.absentTeacherName}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── PASSO 3: Formulário de preenchimento ── */}
            {step === 'fill-form' && selectedSlot && (
              <div className="bg-white rounded-xl shadow p-5 space-y-5">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Passo 3 — Detalhes da Aula
                </h2>

                {/* Lacuna selecionada */}
                <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-800 border border-indigo-100">
                  <strong>{selectedSlot.period}º período</strong> | {selectedSlot.startTime}–{selectedSlot.endTime}
                  <br />
                  {selectedSlot.className} — Ausente: {selectedSlot.absentTeacherName}
                </div>

                {/* Tipo de preenchimento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de aula
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setFillType('reposicao'); setSelectedDebtId(''); }}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                        fillType === 'reposicao'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-200'
                      }`}
                    >
                      <RotateCcw className="w-5 h-5 mx-auto mb-1" />
                      Reposição
                      <div className="text-xs font-normal mt-0.5">Abate um débito</div>
                    </button>
                    <button
                      onClick={() => { setFillType('adiantamento'); setSelectedDebtId(''); }}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                        fillType === 'adiantamento'
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-gray-200 text-gray-600 hover:border-green-200'
                      }`}
                    >
                      <ArrowUpCircle className="w-5 h-5 mx-auto mb-1" />
                      Adiantamento
                      <div className="text-xs font-normal mt-0.5">Gera saldo positivo</div>
                    </button>
                  </div>
                </div>

                {/* Disciplina que vai ministrar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disciplina que você vai ministrar
                  </label>
                  <select
                    value={subjectId}
                    onChange={handleSubjectSelect}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm"
                  >
                    <option value="">— Selecione a disciplina —</option>
                    {filteredSubjects.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  {teacherId && filteredSubjects.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Nenhuma disciplina cadastrada para este professor.</p>
                  )}
                </div>

                {/* Turma */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Turma / Série
                  </label>
                  <select
                    value={classId}
                    onChange={handleClassSelect}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm"
                  >
                    <option value="">— Selecione a turma —</option>
                    {filteredClasses.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Se reposição: mostrar lista de débitos */}
                {fillType === 'reposicao' && teacherId && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Qual aula você está repondo?
                    </label>
                    {loadingDebts && (
                      <div className="text-sm text-gray-500 py-2">Carregando suas pendências...</div>
                    )}
                    {!loadingDebts && debts.length === 0 && (
                      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        Nenhuma pendência encontrada. Se for reposição, seu coordenador deve ter registrado a ausência primeiro.
                      </div>
                    )}
                    {!loadingDebts && debts.length > 0 && (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {debts.map(debt => (
                          <label
                            key={debt._id}
                            className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                              selectedDebtId === debt._id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="debt"
                              value={debt._id}
                              checked={selectedDebtId === debt._id}
                              onChange={() => setSelectedDebtId(debt._id)}
                              className="mt-1"
                            />
                            <div className="text-sm">
                              <div className="font-medium text-gray-800">
                                {debt.className} — {debt.subjectName}
                              </div>
                              <div className="text-gray-500 text-xs">
                                Falta em: {new Date(debt.absenceDate).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="text-xs mt-0.5">
                                <span className="text-red-600 font-medium">{debt.remaining} aula(s)</span> ainda pendente(s)
                                {' '}(devendo {debt.hoursOwed}, pago {debt.hoursPaid})
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {fillType === 'reposicao' && !teacherId && (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Para selecionar qual aula está repondo, escolha seu nome na lista de professores cadastrados (Passo 1).
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('select-slot')}
                    className="flex-1 py-2.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                  <button
                    disabled={
                      submitting ||
                      !subjectId ||
                      !classId ||
                      (fillType === 'reposicao' && !!teacherId && !selectedDebtId)
                    }
                    onClick={handleSubmitFill}
                    className="flex-2 flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
                  >
                    {submitting ? 'Registrando...' : fillType === 'adiantamento' ? '✅ Registrar Adiantamento' : '✅ Confirmar Reposição'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Sucesso ── */}
        {step === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center shadow">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800 mb-2">Registrado!</h2>
            <p className="text-green-700">{successMsg}</p>
            <p className="text-sm text-gray-500 mt-4">
              O painel da escola foi atualizado automaticamente.<br />
              Você pode fechar esta janela.
            </p>
            {openSlots.filter(s => s._id !== selectedSlot?._id).length > 0 && (
              <button
                onClick={() => { setStep('select-slot'); setSelectedSlot(null); setSubjectId(''); setClassId(''); setSelectedDebtId(''); }}
                className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Preencher outra lacuna
              </button>
            )}
          </div>
        )}

        {/* Lacunas já preenchidas */}
        {filledSlots.length > 0 && step !== 'success' && (
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Já preenchidas
            </h3>
            {filledSlots.map(s => (
              <div key={s._id} className="text-xs text-gray-500 py-1 border-b last:border-0">
                {s.period}º período — {s.className} — <strong>{s.filledBy}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
