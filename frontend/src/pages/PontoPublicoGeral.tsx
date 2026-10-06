/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Página pública: Ponto Eletrônico Geral da Escola
 * Rota: /#/ponto-geral/:token
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  User, Users, Clock, CheckCircle, XCircle, AlertCircle,
  BookOpen, LogIn, LogOut, Search, ChevronRight, ArrowLeft, MapPin,
  ShieldCheck, Wifi, Sparkles,
} from 'lucide-react';
import LiveCamera from '../components/LiveCamera';
import AddToHomeScreen from '../components/AddToHomeScreen';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Person {
  _id: string;
  name: string;
  type: 'employee' | 'teacher';
  cargo?: string;
  setor?: string;
}

interface ScheduleSlot {
  period: number;
  subjectId: string;
  classId: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  status: 'present' | 'absent' | 'pending';
  entryTime?: string;
}

interface Attendance {
  entryTime?: string;
  exitTime?: string;
  entryTime2?: string;
  exitTime2?: string;
  entryTime3?: string;
  exitTime3?: string;
  workedMinutes?: number;
  expectedMinutes?: number;
  overtimeMinutes?: number;
  deficitMinutes?: number;
  totalPresentClasses?: number;
  totalScheduledClasses?: number;
  classes?: ScheduleSlot[];
}

interface PersonInfo {
  schoolName: string;
  personType: 'employee' | 'teacher';
  personName: string;
  cargo?: string;
  setor?: string;
  jornadaTrabalho?: string;
  workSchedule?: {
    shiftMode: 'fixed' | 'rotating';
    shiftType: 'single' | 'split2' | 'split3';
    entryTime: string;
    exitTime: string;
    shift2EntryTime?: string;
    shift2ExitTime?: string;
    shift3EntryTime?: string;
    shift3ExitTime?: string;
    rotatingWorkHours?: number;
    rotatingRestDays?: number;
    rotatingEntryTime?: string;
    workDays: string[];
    toleranceMinutes: number;
  } | null;
  requiresEmail?: boolean;
  today: string;
  dayLabel: string;
  schedule?: ScheduleSlot[];
  attendance: Attendance | null;
  // geo settings from school link
  requireGeolocation?: boolean;
  latitude?: number;
  longitude?: number;
  areaM2?: number;
  requirePhoto?: boolean;
}

type Step = 'select' | 'info' | 'done';
type PeopleFilter = 'all' | 'teacher' | 'employee';

function TechBackdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>
    </>
  );
}

function SecureFooter() {
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-[11px] text-slate-400">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
      <span>Registro protegido e sincronizado em nuvem</span>
    </div>
  );
}

export default function PontoPublicoGeral() {
  const { token } = useParams<{ token: string }>();

  // Step 1 state
  const [step, setStep] = useState<Step>('select');
  const [schoolName, setSchoolName] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [errorPeople, setErrorPeople] = useState('');
  const [search, setSearch] = useState('');
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('all');
  const [selected, setSelected] = useState<Person | null>(null);

  // Step 2 state
  const [personInfo, setPersonInfo] = useState<PersonInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Action state
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState<{ message: string; alreadyMarked?: boolean; action?: string; workedMinutes?: number } | null>(null);
  const [updatedAttendance, setUpdatedAttendance] = useState<Attendance | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [geoPos, setGeoPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Relógio em tempo real
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Carregar lista de pessoas
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/attendance-links/school-public/${token}`)
      .then(r => {
        setSchoolName(r.data.schoolName);
        setPeople(r.data.people);
        setRequirePhoto(r.data.requirePhoto || false);
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const personId = params.get('personId');
        const personType = params.get('personType');
        const person = r.data.people.find((item: Person) =>
          item._id === personId && item.type === personType
        );
        if (person) selectPerson(person);
      })
      .catch(e => setErrorPeople(e.response?.data?.message || 'Erro ao carregar lista.'))
      .finally(() => setLoadingPeople(false));
  }, [token]);

  // Buscar info da pessoa selecionada
  async function selectPerson(person: Person) {
    setSelected(person);
    setLoadingInfo(true);
    setStep('info');
    setResult(null);
    setUpdatedAttendance(null);
    setPhotoData(null);
    setGeoPos(null);
    setGeoError('');
    setEmailInput('');
    setEmailError('');
    try {
      const r = await axios.post(`${API}/attendance-links/school-public/${token}/person-info`, {
        personType: person.type,
        personId: person._id,
      });
      setPersonInfo(r.data);
    } catch (e: any) {
      setPersonInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  }

  // Registrar ponto
  async function markAttendance(action: 'entry' | 'exit' | 'confirm', slot?: ScheduleSlot) {
    if (!selected) return;

    // Validar e-mail se necessário
    if (personInfo?.requiresEmail && !emailInput.trim()) {
      setEmailError('Informe seu e-mail cadastrado para confirmar identidade.');
      return;
    }
    setEmailError('');

    setMarking(true);
    let lat: number | undefined;
    let lng: number | undefined;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setGeoPos({ lat, lng });
        setGeoError('');
      } catch {
        setGeoError('Localização não disponível.');
      }
    }
    try {
      const r = await axios.post(`${API}/attendance-links/school-public/${token}/mark`, {
        personType: selected.type,
        personId: selected._id,
        action,
        period: slot?.period,
        classId: slot?.classId,
        lat,
        lng,
        photoData: photoData || undefined,
        email: emailInput.trim() || undefined,
      });
      setResult(r.data);
      setUpdatedAttendance(r.data.attendance);
      setPersonInfo(current => current ? {
        ...current,
        attendance: r.data.attendance,
        schedule: current.schedule?.map(item =>
          slot && item.period === slot.period && item.classId === slot.classId
            ? { ...item, status: 'present', entryTime: r.data.attendance?.classes?.find((c: ScheduleSlot) => c.period === slot.period && c.classId === slot.classId)?.entryTime }
            : item
        ),
      } : current);
      setPhotoData(null);
    } catch (e: any) {
      setResult({ message: e.response?.data?.message || 'Erro ao registrar ponto.' });
    } finally {
      setMarking(false);
    }
  }

  const filteredPeople = people.filter(p =>
    (peopleFilter === 'all' || p.type === peopleFilter)
    && p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Loading da lista ───────────────────────────────────────────────────────
  if (loadingPeople) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <TechBackdrop />
        <div className="relative z-10 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 p-[2px] mx-auto mb-4 shadow-2xl shadow-cyan-500/30">
            <div className="h-full w-full rounded-2xl bg-slate-950 flex items-center justify-center">
              <Clock className="h-7 w-7 text-cyan-300 animate-pulse" />
            </div>
          </div>
          <p className="text-slate-300 font-medium">Conectando ao ponto...</p>
        </div>
      </div>
    );
  }

  if (errorPeople) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <TechBackdrop />
        <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-white/20">
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h2>
          <p className="text-gray-500 text-sm">{errorPeople}</p>
        </div>
      </div>
    );
  }

  // ─── Step: selecionar pessoa ────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-start justify-center px-3 py-5 sm:p-8">
        <TechBackdrop />
        <AddToHomeScreen label={`Ponto Eletrônico${schoolName ? ' · ' + schoolName : ''}`} />
        <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl shadow-black/30 w-full max-w-md overflow-hidden border border-white/20">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-6 text-white">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full border border-cyan-300/20" />
            <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border border-cyan-300/20" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-[0.2em]">
                  <Sparkles className="h-3.5 w-3.5" /> EduSync Ponto
                </div>
                <h1 className="text-2xl font-black mt-2">Olá! Registre seu ponto</h1>
                {schoolName && <p className="text-blue-200 text-sm mt-1">{schoolName}</p>}
              </div>
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
                <Clock className="w-7 h-7 text-cyan-300" />
              </div>
            </div>
            <div className="relative mt-5 flex items-end justify-between">
              <p className="text-4xl font-mono font-black tracking-tight tabular-nums">{clock}</p>
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-300/20">
                <Wifi className="h-3 w-3" /> Online
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <p className="text-slate-800 font-bold">Quem está registrando?</p>
              <p className="text-slate-500 text-xs mt-0.5">Localize seu nome e confirme sua jornada.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5">
              {([
                ['all', 'Todos'],
                ['teacher', 'Professores'],
                ['employee', 'Equipe'],
              ] as [PeopleFilter, string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setPeopleFilter(value)}
                  className={`min-h-10 rounded-xl px-2 text-xs font-bold transition-all ${
                    peopleFilter === value
                      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pelo nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full min-h-12 pl-10 pr-4 border border-slate-200 bg-slate-50 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                autoFocus
              />
            </div>

            {/* Lista */}
            <div className="max-h-[48vh] overflow-y-auto space-y-2 pr-1">
              {filteredPeople.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Nenhum resultado.</p>
              ) : (
                filteredPeople.map(p => (
                  <button
                    key={p._id}
                    onClick={() => selectPerson(p)}
                    className="w-full min-h-[64px] flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white hover:bg-indigo-50 active:scale-[0.99] transition-all text-left border border-slate-100 shadow-sm"
                  >
                    <div className={`p-2.5 rounded-xl ${p.type === 'teacher' ? 'bg-purple-100' : 'bg-cyan-100'}`}>
                      {p.type === 'teacher'
                        ? <BookOpen className="w-4 h-4 text-purple-600" />
                        : <User className="w-4 h-4 text-cyan-700" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {p.type === 'teacher' ? 'Professor(a)' : (p.cargo || 'Funcionário(a)')}
                        {p.setor ? ` · ${p.setor}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            <p className="text-center text-xs text-gray-400">
              <Users className="inline w-3 h-3 mr-1" />
              {people.filter(p => p.type === 'teacher').length} professor(es) ·{' '}
              {people.filter(p => p.type === 'employee').length} funcionário(s)
            </p>
            <SecureFooter />
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: info da pessoa + botão de ponto ─────────────────────────────────
  if (step === 'info') {
    const att = personInfo?.attendance;
    const isTeacher = selected?.type === 'teacher';

    const hasEntry = !!(att as any)?.entryTime;
    const hasExit  = !!(att as any)?.exitTime;
    const shiftType = personInfo?.workSchedule?.shiftType || 'single';
    const employeeComplete = hasExit
      && (shiftType === 'single' || !!att?.exitTime2)
      && (shiftType !== 'split3' || !!att?.exitTime3);
    const nextEmployeeAction: 'entry' | 'exit' = !hasEntry || (hasExit && !att?.entryTime2) || (!!att?.exitTime2 && !att?.entryTime3)
      ? 'entry'
      : 'exit';
    const fmtMinutes = (minutes?: number) => {
      const value = Math.max(0, minutes || 0);
      return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, '0')}min`;
    };

    return (
      <div className="min-h-screen bg-slate-950 flex items-start justify-center px-3 py-5 sm:p-8">
        <TechBackdrop />
        <AddToHomeScreen label={`Ponto Eletrônico${schoolName ? ' · ' + schoolName : ''}`} />
        <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl shadow-black/30 w-full max-w-md overflow-hidden border border-white/20">
          {/* Header */}
          <div className={`relative overflow-hidden p-5 text-white ${isTeacher ? 'bg-gradient-to-br from-slate-950 via-purple-950 to-violet-800' : 'bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-800'}`}>
            <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full border border-white/10" />
            <button
              onClick={() => { setStep('select'); setSelected(null); setPersonInfo(null); setEmailInput(''); setEmailError(''); }}
              className="relative flex min-h-10 items-center gap-1 text-white/70 hover:text-white text-xs mb-2"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar
            </button>
            <div className="relative flex items-center gap-3">
              <div className="bg-white/10 p-3 rounded-2xl ring-1 ring-white/15">
                {isTeacher ? <BookOpen className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">{personInfo?.personName || selected?.name}</p>
                <p className="text-white/80 text-xs">
                  {isTeacher ? 'Professor(a)' : (personInfo?.cargo || 'Funcionário(a)')}
                  {personInfo?.setor ? ` · ${personInfo.setor}` : ''}
                </p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-300">
                <ShieldCheck className="h-3 w-3" /> SEGURO
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {loadingInfo ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
              </div>
            ) : (
              <>
                {/* Info do dia */}
                <div className="bg-slate-100 rounded-2xl p-3 flex items-center gap-2 text-sm text-slate-600 border border-slate-200">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{personInfo?.dayLabel} · {personInfo?.today}</span>
                  <span className="ml-auto font-mono font-bold text-gray-800 tracking-wider">{clock}</span>
                </div>

                {result && (
                  <div className={`rounded-xl p-3 text-sm ${result.message.toLowerCase().includes('erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {result.message}
                  </div>
                )}

                {/* PROFESSOR: aulas do dia */}
                {isTeacher && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Aulas de Hoje</p>
                    {(personInfo?.schedule?.length ?? 0) === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Sem aulas programadas hoje.</p>
                    ) : (
                      <div className="space-y-2">
                        {personInfo?.schedule?.map(s => (
                          <div key={`${s.period}-${s.classId}`} className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm ${s.status === 'present' ? 'bg-emerald-50 border-emerald-200' : s.status === 'absent' ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-100'}`}>
                            <div className="bg-purple-200 text-purple-800 text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                              {s.period}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{s.subjectName}</p>
                              <p className="text-xs text-gray-500 truncate">{s.className}</p>
                            </div>
                            {(s.startTime || s.endTime) && (
                              <span className="text-xs text-gray-400 flex-shrink-0">{s.startTime}{s.endTime ? `–${s.endTime}` : ''}</span>
                            )}
                            {s.status === 'present' ? (
                              <span className="text-xs font-bold text-green-700">Confirmada {s.entryTime || ''}</span>
                            ) : (
                              <button
                                onClick={() => markAttendance('confirm', s)}
                                disabled={marking}
                                className="min-h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg shadow-purple-500/20"
                              >
                                Confirmar aula
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* FUNCIONÁRIO: status entrada/saída */}
                {!isTeacher && (
                  <>
                    {personInfo?.workSchedule?.entryTime && (
                      <div className="bg-indigo-50 rounded-lg p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-indigo-700">⏰ 1º turno:</span>
                          <span className="font-bold text-indigo-800">{personInfo.workSchedule.entryTime} – {personInfo.workSchedule.exitTime}</span>
                        </div>
                        {shiftType !== 'single' && (
                          <div className="flex justify-between">
                            <span className="text-indigo-700">⏰ 2º turno:</span>
                            <span className="font-bold text-indigo-800">{personInfo.workSchedule.shift2EntryTime} – {personInfo.workSchedule.shift2ExitTime}</span>
                          </div>
                        )}
                        {shiftType === 'split3' && (
                          <div className="flex justify-between">
                            <span className="text-indigo-700">⏰ 3º turno:</span>
                            <span className="font-bold text-indigo-800">{personInfo.workSchedule.shift3EntryTime} – {personInfo.workSchedule.shift3ExitTime}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {personInfo?.workSchedule?.shiftMode === 'rotating' && (
                      <div className="bg-indigo-50 rounded-lg p-3 text-sm flex justify-between">
                        <span className="text-indigo-700">⏰ Plantão:</span>
                        <span className="font-bold text-indigo-800">
                          {personInfo.workSchedule.rotatingWorkHours}h de trabalho · {personInfo.workSchedule.rotatingRestDays} dia(s) de folga
                        </span>
                      </div>
                    )}

                    {/* Credencial de e-mail — exibida se o cadastro tiver e-mail */}
                    {personInfo?.requiresEmail && !hasExit && (
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-700">
                          ✉️ Confirme seu e-mail cadastrado
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                          placeholder="seu@email.com"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        />
                        {emailError && (
                          <p className="text-xs text-red-600">{emailError}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          O e-mail é usado para verificar sua identidade e enviar notificação do ponto.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {[
                        { shift: 1, entry: att?.entryTime, exit: att?.exitTime },
                        ...(shiftType !== 'single' ? [{ shift: 2, entry: att?.entryTime2, exit: att?.exitTime2 }] : []),
                        ...(shiftType === 'split3' ? [{ shift: 3, entry: att?.entryTime3, exit: att?.exitTime3 }] : []),
                      ].map(item => (
                        <div key={item.shift} className="grid grid-cols-2 gap-3">
                          <div className={`rounded-xl p-3 text-center ${item.entry ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
                            <LogIn className={`w-5 h-5 mx-auto mb-1 ${item.entry ? 'text-green-600' : 'text-gray-300'}`} />
                            <p className="text-xs text-gray-500">Entrada · {item.shift}º turno</p>
                            <p className={`font-bold text-sm ${item.entry ? 'text-green-700' : 'text-gray-300'}`}>{item.entry || '--:--'}</p>
                          </div>
                          <div className={`rounded-xl p-3 text-center ${item.exit ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-100'}`}>
                            <LogOut className={`w-5 h-5 mx-auto mb-1 ${item.exit ? 'text-red-600' : 'text-gray-300'}`} />
                            <p className="text-xs text-gray-500">Saída · {item.shift}º turno</p>
                            <p className={`font-bold text-sm ${item.exit ? 'text-red-700' : 'text-gray-300'}`}>{item.exit || '--:--'}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {att && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-blue-50 text-blue-800 rounded-lg p-2">Previsto: <strong>{fmtMinutes(att.expectedMinutes)}</strong></div>
                        <div className="bg-green-50 text-green-800 rounded-lg p-2">Realizado: <strong>{fmtMinutes(att.workedMinutes)}</strong></div>
                        <div className="bg-emerald-50 text-emerald-800 rounded-lg p-2">Saldo: <strong>{fmtMinutes(att.overtimeMinutes)}</strong></div>
                        <div className="bg-red-50 text-red-800 rounded-lg p-2">Déficit: <strong>{fmtMinutes(att.deficitMinutes)}</strong></div>
                      </div>
                    )}
                  </>
                )}

                {/* Foto de confirmação ao vivo */}
                {(isTeacher || !employeeComplete) && (
                  <div className="space-y-3">
                    {/* Campo de e-mail como credencial */}
                    {personInfo?.requiresEmail && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          ✉️ Confirme sua identidade
                          <span className="text-red-500 ml-1">*obrigatório</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Seu e-mail cadastrado"
                          value={emailInput}
                          onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                          className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${emailError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        />
                        {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                        <p className="text-xs text-gray-400 mt-1">Apenas você pode bater o seu ponto. O e-mail confere com o cadastro.</p>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      📸 Foto ao vivo
                      {requirePhoto && <span className="text-red-500 ml-1">*obrigatória</span>}
                    </p>
                    <LiveCamera
                      captured={photoData}
                      onCapture={setPhotoData}
                      onClear={() => setPhotoData(null)}
                      required={requirePhoto}
                    />
                    {/* Status geo */}
                    <div className="flex items-center gap-1 text-xs mt-1">
                      <MapPin size={12} className={geoPos ? 'text-green-600' : 'text-gray-400'} />
                      {geoPos
                        ? <span className="text-green-700">Localização obtida — será validada com o local de trabalho</span>
                        : geoError
                        ? <span className="text-orange-600">{geoError}</span>
                        : <span className="text-gray-400">Localização será capturada ao registrar</span>
                      }
                    </div>
                  </div>
                )}

                {/* Botão de ação */}
                {isTeacher ? null : employeeComplete ? (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 p-4 rounded-xl justify-center">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">Carga diária registrada</span>
                  </div>
                ) : nextEmployeeAction === 'exit' ? (
                  <button
                    onClick={() => markAttendance('exit')}
                    disabled={marking}
                    className="w-full min-h-14 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-[0.99] disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                  >
                    <LogOut className="w-5 h-5" />
                    {marking ? 'Registrando...' : 'Registrar próxima saída'}
                  </button>
                ) : (
                  <button
                    onClick={() => markAttendance('entry')}
                    disabled={marking}
                    className="w-full min-h-14 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 active:scale-[0.99] disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                  >
                    <LogIn className="w-5 h-5" />
                    {marking ? 'Registrando...' : 'Registrar próxima entrada'}
                  </button>
                )}
                <SecureFooter />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: resultado ────────────────────────────────────────────────────────
  const isSuccess = result && !result.message.toLowerCase().includes('erro');
  const att2 = updatedAttendance;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <TechBackdrop />
      <AddToHomeScreen label={`Ponto Eletrônico${schoolName ? ' · ' + schoolName : ''}`} />
      <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl w-full max-w-sm text-center p-8 border border-white/20">
        {isSuccess ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-1">{result?.message}</h2>
            <p className="text-gray-500 text-sm mb-2">{selected?.name}</p>
            {result?.action === 'exit' && att2 && (att2 as any).workedMinutes !== undefined && (
              <p className="text-sm text-indigo-600 font-medium">
                Tempo trabalhado: {Math.floor((att2 as any).workedMinutes / 60)}h {(att2 as any).workedMinutes % 60}min
              </p>
            )}
            {result?.alreadyMarked && (
              <p className="text-xs text-amber-600 mt-2">
                <AlertCircle className="inline w-3 h-3 mr-1" />
                Ponto já estava registrado.
              </p>
            )}
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Erro</h2>
            <p className="text-gray-500 text-sm">{result?.message}</p>
          </>
        )}
        <button
          onClick={() => { setStep('select'); setSelected(null); setPersonInfo(null); setResult(null); }}
          className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl text-sm"
        >
          Registrar outro ponto
        </button>
      </div>
    </div>
  );
}
