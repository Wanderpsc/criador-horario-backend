/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Página pública: Ponto Eletrônico de Professores (por aula)
 * Rota: /#/ponto-teacher/:token
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen, Clock, CheckCircle, XCircle, AlertCircle,
  LogIn, LogOut, Search, ChevronRight, ArrowLeft, MapPin,
  AlertTriangle, GraduationCap,
} from 'lucide-react';
import LiveCamera from '../components/LiveCamera';
import AddToHomeScreen from '../components/AddToHomeScreen';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface TeacherInfo {
  _id: string;
  name: string;
}

interface ScheduleSlot {
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  grade: string;
}

interface ClassRecord {
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  grade: string;
  status: 'pending' | 'present' | 'absent';
  isPedagogical?: boolean;
  entryTime?: string;
  exitTime?: string;
  markedAt?: string;
}

interface ScheduleData {
  schoolName: string;
  teacherName: string;
  requiresEmail: boolean;
  today: string;
  dayLabel: string;
  slots: ScheduleSlot[];
  attendance: {
    _id?: string;
    classes: ClassRecord[];
  } | null;
}

interface LinkConfig {
  schoolName: string;
  teachers: TeacherInfo[];
  requireGeolocation: boolean;
  latitude?: number;
  longitude?: number;
  areaM2?: number;
  requirePhoto: boolean;
  graceMinutes: number;
}

type Step = 'select' | 'schedule' | 'confirm' | 'done';

function nowHHmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function PontoPublicoTeacher() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep]               = useState<Step>('select');
  const [linkConfig, setLinkConfig]   = useState<LinkConfig | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [linkError, setLinkError]     = useState('');
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<TeacherInfo | null>(null);

  const [scheduleData, setScheduleData]     = useState<ScheduleData | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Confirm step
  const [activePeriod, setActivePeriod] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<'entry' | 'exit'>('entry');
  const [warningSlot, setWarningSlot]   = useState<ClassRecord | null>(null); // off-schedule warning
  const [showWarning, setShowWarning]   = useState(false);

  // Mark state
  const [marking, setMarking]   = useState(false);
  const [markResult, setMarkResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Media/geo
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [geoPos, setGeoPos]       = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError]   = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  // Clock
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Load link config
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/teacher-ponto/teacher-public/${token}`)
      .then(r => setLinkConfig(r.data))
      .catch(e => setLinkError(e.response?.data?.message || 'Link inválido.'))
      .finally(() => setLoadingLink(false));
  }, [token]);

  async function selectTeacher(teacher: TeacherInfo) {
    setSelected(teacher);
    setLoadingSchedule(true);
    setScheduleData(null);
    setStep('schedule');
    setEmailInput('');
    setEmailError('');
    setPhotoData(null);
    setGeoPos(null);
    setGeoError('');
    try {
      const r = await axios.post(`${API}/teacher-ponto/teacher-public/${token}/teacher-schedule`, {
        teacherId: teacher._id,
      });
      setScheduleData(r.data);
    } catch (e: any) {
      setMarkResult({ ok: false, message: e.response?.data?.message || 'Erro ao carregar horário.' });
      setStep('done');
    } finally {
      setLoadingSchedule(false);
    }
  }

  function classStatus(cls: ClassRecord): 'pending' | 'active' | 'present' | 'absent' {
    if (cls.status === 'absent') return 'absent';
    if (cls.entryTime && !cls.exitTime) return 'active';
    if (cls.exitTime) return 'present';
    return 'pending';
  }

  function isEnterable(cls: ClassRecord): boolean {
    if (cls.status === 'absent' || cls.entryTime) return false;
    const grace = linkConfig?.graceMinutes ?? 10;
    // can enter if now <= endTime + grace
    if (cls.endTime) {
      return toMin(nowHHmm()) <= toMin(cls.endTime) + grace;
    }
    return true;
  }

  function isExitable(cls: ClassRecord): boolean {
    return !!(cls.entryTime && !cls.exitTime);
  }

  function hasActiveClass(): ClassRecord | undefined {
    return scheduleData?.attendance?.classes.find(c => c.entryTime && !c.exitTime);
  }

  function isScheduledNow(cls: ClassRecord): boolean {
    if (!cls.startTime || !cls.endTime) return true;
    const now = toMin(nowHHmm());
    const grace = linkConfig?.graceMinutes ?? 10;
    return now >= toMin(cls.startTime) - grace && now <= toMin(cls.endTime) + grace;
  }

  function initiateAction(cls: ClassRecord, action: 'entry' | 'exit') {
    setActivePeriod(cls.period);
    setActiveAction(action);
    setPhotoData(null);
    setGeoPos(null);
    setGeoError('');
    setEmailError('');

    // Check if off-schedule (only for entry)
    if (action === 'entry' && !isScheduledNow(cls)) {
      setWarningSlot(cls);
      setShowWarning(true);
    } else {
      setStep('confirm');
    }
  }

  function confirmWarning() {
    setShowWarning(false);
    setWarningSlot(null);
    setStep('confirm');
  }

  async function executeAction() {
    if (activePeriod === null || !selected) return;

    // Email check
    if (scheduleData?.requiresEmail && !emailInput.trim()) {
      setEmailError('Informe seu e-mail cadastrado.');
      return;
    }
    setEmailError('');

    setMarking(true);

    let lat: number | undefined;
    let lng: number | undefined;

    if (linkConfig?.requireGeolocation && navigator.geolocation) {
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
      const r = await axios.post(`${API}/teacher-ponto/teacher-public/${token}/mark`, {
        teacherId: selected._id,
        period: activePeriod,
        action: activeAction,
        lat,
        lng,
        photoData: photoData || undefined,
        email: emailInput.trim() || undefined,
      });
      setMarkResult({ ok: true, message: r.data.message });
      // Update attendance in-place
      if (r.data.attendance) {
        setScheduleData(prev => prev ? { ...prev, attendance: r.data.attendance } : prev);
      }
      setStep('schedule');
      // Brief toast-like feedback before returning to schedule
      setTimeout(() => {
        setMarkResult(null);
        setActivePeriod(null);
      }, 3000);
    } catch (e: any) {
      setMarkResult({ ok: false, message: e.response?.data?.message || 'Erro ao registrar ponto.' });
      setStep('done');
    } finally {
      setMarking(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loadingLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h2>
          <p className="text-gray-500 text-sm">{linkError}</p>
        </div>
      </div>
    );
  }

  // ─── Step: selecionar professor ─────────────────────────────────────────────
  if (step === 'select') {
    const filtered = (linkConfig?.teachers || []).filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-start justify-center p-4 pt-8">
        <AddToHomeScreen label={`Ponto Professor${linkConfig?.schoolName ? ' · ' + linkConfig.schoolName : ''}`} />
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="bg-green-700 rounded-t-2xl p-6 text-white text-center">
            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-90" />
            <h1 className="text-xl font-bold">Ponto do Professor</h1>
            {linkConfig?.schoolName && <p className="text-green-200 text-sm mt-1">{linkConfig.schoolName}</p>}
            <p className="text-3xl font-mono font-bold mt-2 tracking-widest">{clock}</p>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-gray-600 text-sm text-center font-medium">
              Selecione seu nome para registrar o ponto por aula
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pelo nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                autoFocus
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-1 rounded-xl border border-gray-100">
              {filtered.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Nenhum resultado.</p>
              ) : (
                filtered.map(t => (
                  <button
                    key={t._id}
                    onClick={() => selectTeacher(t)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="p-1.5 rounded-full bg-green-100">
                      <BookOpen className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="flex-1 font-medium text-gray-800 text-sm truncate">{t.name}</p>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            <p className="text-center text-xs text-gray-400">
              {linkConfig?.teachers.length} professor(es)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: horário + ações ──────────────────────────────────────────────────
  if (step === 'schedule') {
    const classes = scheduleData?.attendance?.classes || [];

    const activeClass = hasActiveClass();

    const statusColor: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-500',
      active: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      present: 'bg-green-100 text-green-700',
      absent: 'bg-red-100 text-red-700',
    };
    const statusLabel: Record<string, string> = {
      pending: 'Pendente',
      active: 'Em aula',
      present: 'Presente',
      absent: 'Ausente',
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-start justify-center p-4 pt-8 pb-20">
        <AddToHomeScreen label={`Ponto Professor${linkConfig?.schoolName ? ' · ' + linkConfig.schoolName : ''}`} />
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="bg-green-700 rounded-t-2xl p-5 text-white">
            <button
              onClick={() => { setStep('select'); setSelected(null); setScheduleData(null); setMarkResult(null); }}
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs mb-3"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold leading-tight">{selected?.name}</p>
                  <p className="text-green-200 text-xs">Professor(a)</p>
                </div>
              </div>
              <p className="text-2xl font-mono font-bold tracking-widest">{clock}</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Date bar */}
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{scheduleData?.dayLabel} · {scheduleData?.today}</span>
            </div>

            {/* Success toast */}
            {markResult?.ok && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl animate-pulse">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{markResult.message}</span>
              </div>
            )}

            {/* Loading */}
            {loadingSchedule && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
              </div>
            )}

            {/* No classes */}
            {!loadingSchedule && classes.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sem aulas programadas hoje</p>
                <p className="text-xs mt-1">{scheduleData?.dayLabel}</p>
              </div>
            )}

            {/* Active class banner */}
            {activeClass && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-xl">
                <span className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
                <span className="text-sm">
                  <strong>Em aula</strong> — {activeClass.subjectName} ({activeClass.className}) · Período {activeClass.period}
                  {activeClass.entryTime && <span className="ml-1 text-yellow-600">desde {activeClass.entryTime}</span>}
                </span>
              </div>
            )}

            {/* Class list */}
            {!loadingSchedule && classes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Aulas de hoje</p>
                {classes.map(cls => {
                  const st = classStatus(cls);
                  const canEnter = st === 'pending' && isEnterable(cls) && !activeClass;
                  const canExit  = st === 'active';
                  const blockedByActive = st === 'pending' && isEnterable(cls) && !!activeClass;

                  return (
                    <div
                      key={cls.period}
                      className={`rounded-xl border p-3 transition-all ${
                        st === 'active' ? 'border-yellow-300 bg-yellow-50' :
                        st === 'present' ? 'border-green-200 bg-green-50' :
                        st === 'absent' ? 'border-red-200 bg-red-50' :
                        'border-gray-100 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Period badge */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                          st === 'active' ? 'bg-yellow-400 text-yellow-900' :
                          st === 'present' ? 'bg-green-500 text-white' :
                          st === 'absent' ? 'bg-red-400 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {cls.period}
                        </div>

                        {/* Class info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 text-sm truncate">
                              {cls.isPedagogical ? '📋 Horário Pedagógico' : cls.subjectName}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[st]}`}>
                              {st === 'active' && <span className="animate-pulse mr-1">●</span>}
                              {statusLabel[st]}
                            </span>
                          </div>
                          {!cls.isPedagogical && (
                            <p className="text-xs text-gray-500 truncate">{cls.className}{cls.grade ? ` · ${cls.grade}` : ''}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span><Clock className="inline w-3 h-3 mr-0.5" />{cls.startTime}–{cls.endTime}</span>
                            {cls.entryTime && <span className="text-green-600"><LogIn className="inline w-3 h-3 mr-0.5" />{cls.entryTime}</span>}
                            {cls.exitTime && <span className="text-red-500"><LogOut className="inline w-3 h-3 mr-0.5" />{cls.exitTime}</span>}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex-shrink-0">
                          {canEnter && (
                            <button
                              onClick={() => initiateAction(cls, 'entry')}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              <LogIn className="w-3 h-3" /> Entrar
                            </button>
                          )}
                          {canExit && (
                            <button
                              onClick={() => initiateAction(cls, 'exit')}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" /> Sair
                            </button>
                          )}
                          {blockedByActive && (
                            <span className="text-xs text-gray-400 italic">Saia primeiro</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Warning modal: off-schedule entry */}
        {showWarning && warningSlot && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-lg mb-2">Fora do horário</h3>
              <p className="text-gray-600 text-sm mb-4">
                Você está tentando entrar no período <strong>{warningSlot.period}</strong>{' '}
                ({warningSlot.subjectName}), mas este período{' '}
                {toMin(nowHHmm()) > toMin(warningSlot.endTime || '23:59')
                  ? 'já encerrou.'
                  : 'ainda não começou.'
                }{' '}
                Confirma mesmo assim?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowWarning(false); setWarningSlot(null); setActivePeriod(null); }}
                  className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmWarning}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Step: confirmação (foto + geo + email) ─────────────────────────────────
  if (step === 'confirm') {
    const cls = scheduleData?.attendance?.classes.find(c => c.period === activePeriod);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-start justify-center p-4 pt-8">
        <AddToHomeScreen label={`Ponto Professor${linkConfig?.schoolName ? ' · ' + linkConfig.schoolName : ''}`} />
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="bg-green-700 rounded-t-2xl p-5 text-white">
            <button
              onClick={() => { setStep('schedule'); setActivePeriod(null); setPhotoData(null); }}
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs mb-3"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar
            </button>
            <p className="font-bold">
              {activeAction === 'entry' ? '📥 Registrar Entrada' : '📤 Registrar Saída'}
            </p>
            {cls && (
              <p className="text-green-200 text-sm mt-1">
                Período {cls.period} · {cls.subjectName} · {cls.className}
              </p>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Date + clock */}
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{scheduleData?.dayLabel} · {scheduleData?.today}</span>
              <span className="ml-auto font-mono font-bold text-gray-800 tracking-wider">{clock}</span>
            </div>

            {/* Email credential */}
            {scheduleData?.requiresEmail && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ✉️ Confirme seu e-mail cadastrado
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                  placeholder="seu@email.com"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${emailError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                />
                {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Apenas você pode bater o seu ponto. O e-mail confere com o cadastro.
                </p>
              </div>
            )}

            {/* Photo */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                📸 Foto ao vivo
                {linkConfig?.requirePhoto && <span className="text-red-500 ml-1">*obrigatória</span>}
              </p>
              <LiveCamera
                captured={photoData}
                onCapture={setPhotoData}
                onClear={() => setPhotoData(null)}
                required={linkConfig?.requirePhoto || false}
              />
            </div>

            {/* Geo status */}
            <div className="flex items-center gap-1 text-xs">
              <MapPin size={12} className={geoPos ? 'text-green-600' : 'text-gray-400'} />
              {geoPos
                ? <span className="text-green-700">Localização obtida</span>
                : geoError
                ? <span className="text-orange-600">{geoError}</span>
                : linkConfig?.requireGeolocation
                ? <span className="text-gray-500">Localização será capturada ao confirmar</span>
                : <span className="text-gray-400">Geolocalização não obrigatória</span>
              }
            </div>

            {/* Confirm button */}
            <button
              onClick={executeAction}
              disabled={marking || (linkConfig?.requirePhoto && !photoData)}
              className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-white disabled:opacity-60 ${
                activeAction === 'entry'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {activeAction === 'entry'
                ? <><LogIn className="w-5 h-5" />{marking ? 'Registrando...' : 'Confirmar Entrada'}</>
                : <><LogOut className="w-5 h-5" />{marking ? 'Registrando...' : 'Confirmar Saída'}</>
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: done (error) ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <AddToHomeScreen label={`Ponto Professor${linkConfig?.schoolName ? ' · ' + linkConfig.schoolName : ''}`} />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm text-center p-8">
        {markResult?.ok ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-1">{markResult.message}</h2>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Erro</h2>
            <p className="text-gray-500 text-sm">{markResult?.message}</p>
          </>
        )}
        <button
          onClick={() => { setStep('select'); setSelected(null); setScheduleData(null); setMarkResult(null); }}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm"
        >
          {markResult?.ok ? 'Registrar outro ponto' : 'Tentar novamente'}
        </button>
      </div>
    </div>
  );
}
