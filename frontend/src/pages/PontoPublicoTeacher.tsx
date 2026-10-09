/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Página pública: Ponto Eletrônico de Professores (por aula)
 * Rota: /#/ponto-teacher/:token
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getAttendancePosition } from '../utils/geolocation';
import {
  activateAttendanceDevice,
  getActivationTokenFromHash,
  getAttendanceDeviceHeaders,
  isEmbeddedMobileBrowser,
} from '../utils/attendanceDevice';
import {
  BookOpen, Clock, CheckCircle, XCircle,
  LogIn, LogOut, Search, ChevronRight, ArrowLeft, MapPin,
  AlertTriangle, GraduationCap, Building2,
} from 'lucide-react';
import LiveCamera from '../components/LiveCamera';
import AddToHomeScreen from '../components/AddToHomeScreen';
import ActivationBrowserGate from '../components/ActivationBrowserGate';
import AttendanceReminder from '../components/AttendanceReminder';

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
  markedByElectronicPoint?: boolean;
  punctualityStatus?: 'on_time' | 'late' | 'early' | 'outside_schedule';
  lateMinutes?: number;
  requiresReview?: boolean;
  exceptionReason?: string;
  justification?: string;
}

interface ScheduleData {
  schoolName: string;
  teacherName: string;
  requiresEmail: boolean;
  today: string;
  dayLabel: string;
  isMakeupSaturday?: boolean;
  followWeekday?: string | null;
  slots: ScheduleSlot[];
  attendance: {
    _id?: string;
    classes: ClassRecord[];
    schoolEntryTime?: string;
    schoolExitTime?: string;
    expectedFirstStartTime?: string;
    expectedLastEndTime?: string;
    schoolArrivalDelayMinutes?: number;
    schoolPresenceComplete?: boolean;
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
type PointAction = 'class' | 'school-entry' | 'school-exit';

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
  const [requiresExternalBrowser, setRequiresExternalBrowser] = useState(false);

  // Confirm step
  const [activePeriod, setActivePeriod] = useState<number | null>(null);
  const [pointAction, setPointAction] = useState<PointAction>('class');
  const [needsJustification, setNeedsJustification] = useState(false);
  const [justification, setJustification] = useState('');
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
    const attendanceToken = token;
    async function activateAndLoad() {
      const activationToken = getActivationTokenFromHash();
      if (activationToken && isEmbeddedMobileBrowser()) {
        setRequiresExternalBrowser(true);
        setLoadingLink(false);
        return;
      }
      try {
        if (activationToken) {
          await activateAttendanceDevice(API, attendanceToken, activationToken);
        }
        const headers = await getAttendanceDeviceHeaders(attendanceToken);
        const r = await axios.get(`${API}/teacher-ponto/teacher-public/${attendanceToken}`, { headers });
        setLinkConfig(r.data);
        const teacher = r.data.teachers[0];
        if (teacher) selectTeacher(teacher);
      } catch (e: any) {
        setLinkError(e.response?.data?.message || 'Link inválido.');
      } finally {
        setLoadingLink(false);
      }
    }
    activateAndLoad();
  }, [token]);

  if (requiresExternalBrowser) {
    return <ActivationBrowserGate />;
  }

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
      const headers = token ? await getAttendanceDeviceHeaders(token) : {};
      const r = await axios.post(`${API}/teacher-ponto/teacher-public/${token}/teacher-schedule`, {
        teacherId: teacher._id,
      }, { headers });
      setScheduleData(r.data);
    } catch (e: any) {
      setMarkResult({ ok: false, message: e.response?.data?.message || 'Erro ao carregar horário.' });
      setStep('done');
    } finally {
      setLoadingSchedule(false);
    }
  }

  function classStatus(cls: ClassRecord): 'pending' | 'present' | 'absent' {
    if (cls.status === 'absent') return 'absent';
    if (cls.status === 'present' || cls.entryTime) return 'present';
    return 'pending';
  }

  function isEnterable(cls: ClassRecord): boolean {
    return cls.status !== 'present' && !cls.entryTime;
  }

  function isScheduledNow(cls: ClassRecord): boolean {
    if (!cls.startTime || !cls.endTime) return true;
    const now = toMin(nowHHmm());
    const grace = linkConfig?.graceMinutes ?? 10;
    return now >= toMin(cls.startTime) - grace && now <= toMin(cls.endTime) + grace;
  }

  function initiateAction(cls: ClassRecord) {
    setPointAction('class');
    setActivePeriod(cls.period);
    setNeedsJustification(!isScheduledNow(cls));
    setJustification('');
    setPhotoData(null);
    setGeoPos(null);
    setGeoError('');
    setEmailError('');

    if (!isScheduledNow(cls)) {
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

  function initiateSchoolPresence(action: 'entry' | 'exit') {
    setPointAction(action === 'entry' ? 'school-entry' : 'school-exit');
    setActivePeriod(null);
    setNeedsJustification(false);
    setJustification('');
    setPhotoData(null);
    setGeoPos(null);
    setGeoError('');
    setEmailError('');
    setStep('confirm');
  }

  async function executeAction() {
    if (!selected || (pointAction === 'class' && activePeriod === null)) return;

    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setEmailError('Informe um e-mail válido para receber a confirmação.');
      return;
    }
    setEmailError('');

    setMarking(true);

    let lat: number | undefined;
    let lng: number | undefined;
    let accuracy: number | undefined;

    if (linkConfig?.requireGeolocation && navigator.geolocation) {
      try {
        const pos = await getAttendancePosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        accuracy = pos.coords.accuracy;
        setGeoPos({ lat, lng });
        setGeoError('');
      } catch {
        setGeoError('Localização não disponível.');
      }
    }

    try {
      const headers = token ? await getAttendanceDeviceHeaders(token) : {};
      const endpoint = pointAction === 'class'
        ? `${API}/teacher-ponto/teacher-public/${token}/mark`
        : `${API}/teacher-ponto/teacher-public/${token}/school-presence`;
      const r = await axios.post(endpoint, pointAction === 'class'
        ? {
            period: activePeriod,
            action: 'entry',
            lat,
            lng,
            accuracy,
            photoData: photoData || undefined,
            email: emailInput.trim() || undefined,
            justification: needsJustification ? justification.trim() : undefined,
          }
        : {
            action: pointAction === 'school-entry' ? 'entry' : 'exit',
            lat,
            lng,
            accuracy,
            photoData: photoData || undefined,
            email: emailInput.trim() || undefined,
          }, { headers });
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
        setJustification('');
        setNeedsJustification(false);
      }, 3000);
    } catch (e: any) {
      if (e.response?.data?.requiresJustification) {
        setNeedsJustification(true);
        setMarkResult({ ok: false, message: e.response.data.message });
        setStep('confirm');
        return;
      }
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
    const expectedLastEndTime = scheduleData?.attendance?.expectedLastEndTime;
    const canRegisterSchoolExit = Boolean(
      expectedLastEndTime && toMin(nowHHmm()) >= toMin(expectedLastEndTime)
    );
    const statusColor: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-500',
      present: 'bg-green-100 text-green-700',
      absent: 'bg-red-100 text-red-700',
    };
    const statusLabel: Record<string, string> = {
      pending: 'Pendente',
      present: 'Presente',
      absent: 'Ausente',
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-start justify-center p-4 pt-8 pb-20">
        <AddToHomeScreen label={`Ponto Professor${linkConfig?.schoolName ? ' · ' + linkConfig.schoolName : ''}`} />
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="bg-green-700 rounded-t-2xl p-5 text-white">
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

            {markResult && !markResult.ok && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {markResult.message}
              </div>
            )}

            <AttendanceReminder
              personName={selected?.name || 'Professor(a)'}
              storageKey={`attendance-reminder-teacher-${token}`}
              reminders={classes
                .filter(cls => classStatus(cls) === 'pending')
                .map(cls => ({ time: cls.startTime, label: `${cls.subjectName} - ${cls.className}` }))}
            />

            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-xl bg-blue-600 p-2 text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-blue-950">Permanência na escola</p>
                  <p className="text-xs text-blue-700">Entrada na primeira jornada e saída após o último horário</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="rounded-xl bg-white/80 border border-blue-100 p-2">
                  <span className="text-gray-500">Entrada</span>
                  <p className="font-bold text-blue-800">
                    {scheduleData?.attendance?.schoolEntryTime || 'Não registrada'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 border border-blue-100 p-2">
                  <span className="text-gray-500">Saída</span>
                  <p className="font-bold text-blue-800">
                    {scheduleData?.attendance?.schoolExitTime || 'Não registrada'}
                  </p>
                </div>
              </div>
              {scheduleData?.attendance?.schoolArrivalDelayMinutes ? (
                <p className="text-xs text-orange-700 mb-3">
                  Chegada com {scheduleData.attendance.schoolArrivalDelayMinutes} minuto(s) de atraso.
                </p>
              ) : null}
              {scheduleData?.attendance?.schoolPresenceComplete ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle className="w-4 h-4" /> Permanência diária comprovada
                </div>
              ) : !scheduleData?.attendance?.schoolEntryTime ? (
                <button
                  onClick={() => initiateSchoolPresence('entry')}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Registrar entrada na escola
                </button>
              ) : canRegisterSchoolExit ? (
                <button
                  onClick={() => initiateSchoolPresence('exit')}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Registrar saída da escola
                </button>
              ) : (
                <div className="rounded-xl border border-blue-200 bg-white/80 p-3 text-center text-sm text-blue-800">
                  A entrada já está bloqueada. A saída será liberada às <strong>{expectedLastEndTime}</strong>.
                </div>
              )}
              {scheduleData?.attendance?.expectedLastEndTime && !scheduleData.attendance.schoolPresenceComplete && (
                <p className="text-[11px] text-blue-600 mt-2 text-center">
                  Último horário previsto: {scheduleData.attendance.expectedLastEndTime}
                </p>
              )}
            </div>

            {/* Sábado letivo aviso */}
            {scheduleData?.isMakeupSaturday && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Sábado Letivo — seguindo a grade de <strong>{scheduleData.dayLabel.replace('Sábado Letivo (referência: ', '').replace(')', '')}</strong></span>
              </div>
            )}

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

            {/* Active class banner — removido: presença é registrada de uma vez */}

            {/* Class list */}
            {!loadingSchedule && classes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Aulas de hoje</p>
                {classes.map(cls => {
                  const st = classStatus(cls);
                  const canMark = isEnterable(cls);

                  return (
                    <div
                      key={cls.period}
                      className={`rounded-xl border p-3 transition-all ${
                        st === 'present' ? 'border-green-200 bg-green-50' :
                        st === 'absent' ? 'border-red-200 bg-red-50' :
                        'border-gray-100 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Period badge */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
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
                              {statusLabel[st]}
                            </span>
                          </div>
                          {!cls.isPedagogical && (
                            <p className="text-xs text-gray-500 truncate">{cls.className}{cls.grade ? ` · ${cls.grade}` : ''}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span><Clock className="inline w-3 h-3 mr-0.5" />{cls.startTime}–{cls.endTime}</span>
                            {cls.entryTime && <span className="text-green-600"><LogIn className="inline w-3 h-3 mr-0.5" />{cls.entryTime}</span>}
                          </div>
                          {cls.requiresReview && (
                            <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-[11px] text-orange-800">
                              <strong>Com ressalva:</strong> {cls.exceptionReason}
                              {cls.justification && <span className="block mt-0.5">Justificativa: {cls.justification}</span>}
                            </div>
                          )}
                        </div>

                        {/* Action button */}
                        <div className="flex-shrink-0">
                          {canMark && (
                            <button
                              onClick={() => initiateAction(cls)}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              <LogIn className="w-3 h-3" /> Registrar
                            </button>
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
                Para concluir, será obrigatório escrever uma justificativa. O ponto ficará registrado com ressalva nos relatórios.
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
    const isSchoolPresence = pointAction !== 'class';

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
              {pointAction === 'school-entry'
                ? '🏫 Registrar entrada na escola'
                : pointAction === 'school-exit'
                  ? '🏫 Registrar saída da escola'
                  : '📝 Registrar presença na aula'}
            </p>
            {!isSchoolPresence && cls && (
              <p className="text-green-200 text-sm mt-1">
                Período {cls.period} · {cls.subjectName} · {cls.className}
              </p>
            )}
            {isSchoolPresence && (
              <p className="text-green-200 text-sm mt-1">
                {pointAction === 'school-entry'
                  ? 'Comprovação de chegada para a jornada de hoje'
                  : 'Comprovação de permanência até o último horário'}
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

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                ✉️ E-mail para confirmação do ponto
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                placeholder="seu@email.com"
                autoComplete="email"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${emailError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
              />
              {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Você receberá a confirmação após o registro.
                {scheduleData?.requiresEmail && ' O endereço deve conferir com o cadastro.'}
              </p>
            </div>

            {pointAction === 'class' && needsJustification && (
              <div>
                <label className="block text-xs font-semibold text-orange-800 mb-1">
                  Justificativa do registro fora do horário <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={justification}
                  onChange={event => setJustification(event.target.value)}
                  minLength={10}
                  rows={3}
                  placeholder="Explique por que não está na turma no horário previsto..."
                  className="w-full border border-orange-300 bg-orange-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-[11px] text-orange-700 mt-1">Mínimo de 10 caracteres. A justificativa constará no relatório.</p>
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
              disabled={
                marking
                || (linkConfig?.requirePhoto && !photoData)
                || (pointAction === 'class' && needsJustification && justification.trim().length < 10)
              }
              className="w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
            >
              {pointAction === 'school-exit' ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {marking
                ? 'Registrando...'
                : pointAction === 'school-entry'
                  ? 'Confirmar entrada na escola'
                  : pointAction === 'school-exit'
                    ? 'Confirmar saída da escola'
                    : 'Confirmar presença na aula'}
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
          onClick={() => { setStep('schedule'); setMarkResult(null); }}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm"
        >
          Voltar ao meu ponto
        </button>
      </div>
    </div>
  );
}
