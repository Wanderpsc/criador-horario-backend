/**
 * Página pública de Ponto Eletrônico.
 * Acessível via link: /#/ponto/:token
 * Sem necessidade de autenticação.
 *
 * Se professor → exibe aulas do dia e confirma presença.
 * Se funcionário → exibe turno e registra entrada/saída.
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
  User, Clock, CheckCircle, XCircle, AlertCircle,
  BookOpen, LogIn, LogOut, Calendar, MapPin,
} from 'lucide-react';
import LiveCamera from '../components/LiveCamera';
import AddToHomeScreen from '../components/AddToHomeScreen';
import AttendanceReminder from '../components/AttendanceReminder';
import ActivationBrowserGate from '../components/ActivationBrowserGate';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface TeacherClass {
  period: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
}

interface TeacherAttendance {
  classes: { period: number; status: string }[];
  totalPresentClasses: number;
  totalScheduledClasses: number;
}

interface EmployeeAttendance {
  entryTime?: string;
  exitTime?: string;
  entryTime2?: string;
  exitTime2?: string;
  entryTime3?: string;
  exitTime3?: string;
  status: string;
  workedMinutes?: number;
  expectedMinutes?: number;
  deficitMinutes?: number;
  overtimeMinutes?: number;
}

interface EmployeePunchState {
  nextAction: 'entry' | 'exit' | null;
  shiftNumber: 1 | 2 | 3 | null;
  complete: boolean;
  allowedNow: boolean;
  availableAt?: string;
  isExtraDay: boolean;
  message: string;
}

interface PageData {
  schoolName: string;
  personType: 'teacher' | 'employee';
  personName: string;
  cargo?: string;
  setor?: string;
  today: string;
  dayLabel: string;
  requiresEmail?: boolean;
  // teacher
  schedule?: TeacherClass[];
  // employee
  jornadaTrabalho?: string;
  workSchedule?: {
    shiftMode?: 'fixed' | 'rotating';
    shiftType?: 'single' | 'split2' | 'split3';
    entryTime: string;
    exitTime: string;
    shift2EntryTime?: string;
    shift2ExitTime?: string;
    shift3EntryTime?: string;
    shift3ExitTime?: string;
    rotatingEntryTime?: string;
    workDays: string[];
    toleranceMinutes: number;
  } | null;
  // common
  attendance: TeacherAttendance | EmployeeAttendance | null;
  punchState?: EmployeePunchState;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function minutesToHHmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}min`;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function PontoPublico() {
  const { token } = useParams<{ token: string }>();

  const [pageStatus, setPageStatus] = useState<'loading' | 'external-browser' | 'error' | 'ok'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [data, setData] = useState<PageData | null>(null);
  const [marking, setMarking] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [markError, setMarkError] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [geoPos, setGeoPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string>('');
  const [email, setEmail] = useState('');
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Relógio em tempo real
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const load = async () => {
    if (!token) { setPageStatus('error'); setErrorMsg('Token inválido.'); return; }
    try {
      const headers = await getAttendanceDeviceHeaders(token);
      const res = await axios.get(`${API_URL}/attendance-links/public/${token}`, { headers });
      setData(res.data);
      setPageStatus('ok');
    } catch (err: any) {
      if (!err.response) {
        setErrorCode('NETWORK');
        setErrorMsg('Não foi possível conectar ao servidor. Verifique a internet do celular e tente novamente.');
      } else {
        setErrorCode(err.response.data?.code || '');
        setErrorMsg(err.response.data?.message || 'Erro ao carregar dados.');
      }
      setPageStatus('error');
    }
  };

  useEffect(() => {
    async function activateAndLoad() {
      if (!token) return;
      const activationToken = getActivationTokenFromHash();
      if (activationToken) {
        if (isEmbeddedMobileBrowser()) {
          setPageStatus('external-browser');
          return;
        }
        try {
          await activateAttendanceDevice(API_URL, token, activationToken);
        } catch (error: any) {
          setPageStatus('error');
          if (!error.response) {
            setErrorCode('NETWORK');
            setErrorMsg('Não foi possível conectar ao servidor para ativar o dispositivo. Verifique a internet e tente novamente.');
          } else {
            setErrorCode(error.response.data?.code || '');
            setErrorMsg(error.response.data?.message || 'Não foi possível cadastrar este dispositivo.');
          }
          return;
        }
      }
      await load();
    }
    activateAndLoad();
  }, [token]);

  if (pageStatus === 'external-browser') {
    return <ActivationBrowserGate />;
  }

  const handleMark = async (action: 'entry' | 'exit' | 'confirm') => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMarkError('Informe um e-mail válido para receber a confirmação do ponto.');
      return;
    }
    setMarking(true);
    setMarkError('');
    setSuccessMsg('');

    // Geolocalização (tenta sempre obter, backend valida se requireGeolocation)
    let lat: number | undefined;
    let lng: number | undefined;
    let accuracy: number | undefined;
    if (navigator.geolocation) {
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
      const res = await axios.post(`${API_URL}/attendance-links/public/${token}/mark`, {
        action,
        lat,
        lng,
        accuracy,
        photoData: photoData || undefined,
        email: email.trim() || undefined,
      }, { headers });
      setSuccessMsg(res.data.message || 'Ponto registrado!');
      setPhotoData(null);
      // Recarregar dados após marcação
      await load();
    } catch (err: any) {
      setMarkError(err.response?.data?.message || 'Erro ao registrar ponto.');
    } finally {
      setMarking(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  // ── Erro ──────────────────────────────────────────────────────────────────
  if (pageStatus === 'error' || !data) {
    const isDeviceError = errorCode === 'DEVICE_NOT_REGISTERED' || errorCode === 'DEVICE_NOT_AUTHORIZED';
    const isNetworkError = errorCode === 'NETWORK';
    const errorTitle = isNetworkError
      ? 'Falha de conexão'
      : isDeviceError
      ? 'Dispositivo não autorizado'
      : 'Link inválido';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          {isNetworkError
            ? <AlertCircle className="mx-auto mb-4 text-orange-500" size={48} />
            : <XCircle className="mx-auto mb-4 text-red-500" size={48} />}
          <h2 className="text-xl font-bold text-gray-800 mb-2">{errorTitle}</h2>
          <p className="text-gray-500">{errorMsg}</p>
          {isDeviceError && (
            <p className="mt-3 text-xs text-gray-400">
              O link continua válido, mas só o celular cadastrado pode abrir este ponto.
              Se este é o seu celular, peça à administração um novo link de ativação.
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const isTeacher = data.personType === 'teacher';
  const reminderItems = isTeacher
    ? (data.schedule || []).map(cls => ({
        time: cls.startTime,
        label: `${cls.subjectName} - ${cls.className}`,
      }))
    : [
        { time: data.workSchedule?.shiftMode === 'rotating' ? data.workSchedule.rotatingEntryTime : data.workSchedule?.entryTime, label: 'Entrada' },
        { time: data.workSchedule?.exitTime, label: 'Saída' },
        { time: data.workSchedule?.shift2EntryTime, label: '2ª entrada' },
        { time: data.workSchedule?.shift2ExitTime, label: '2ª saída' },
        { time: data.workSchedule?.shift3EntryTime, label: '3ª entrada' },
        { time: data.workSchedule?.shift3ExitTime, label: '3ª saída' },
      ]
        .filter((item): item is { time: string; label: string } => !!item.time);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-32 flex items-start justify-center">
      <AddToHomeScreen label={`Ponto${data?.schoolName ? ' · ' + data.schoolName : ''}`} />
      <div className="w-full max-w-md">
        {/* Cabeçalho */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${isTeacher ? 'bg-purple-100' : 'bg-blue-100'}`}>
              <User size={28} className={isTeacher ? 'text-purple-600' : 'text-blue-600'} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {data.schoolName}
              </p>
              <h1 className="text-xl font-bold text-gray-800">{data.personName}</h1>
              {!isTeacher && (data.cargo || data.setor) && (
                <p className="text-sm text-gray-500">
                  {[data.cargo, data.setor].filter(Boolean).join(' · ')}
                </p>
              )}
              {isTeacher && (
                <span className="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5">
                  Professor(a)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
            <Calendar size={16} />
            <span>{data.dayLabel}, {formatDate(data.today)}</span>
            <span className="ml-auto font-mono font-bold text-gray-700 text-base tracking-wider">{clock}</span>
          </div>
        </div>

        {/* Feedback de sucesso/erro */}
        <div className="mb-4">
          <AttendanceReminder
            personName={data.personName}
            storageKey={`attendance-reminder-${token}`}
            reminders={reminderItems}
          />
        </div>

        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-green-700">
            <CheckCircle size={18} />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}
        {markError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            <span className="font-medium">{markError}</span>
          </div>
        )}

        {(isTeacher || !data.punchState?.complete) && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              E-mail para confirmação do ponto
            </label>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="seu-email@exemplo.com"
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Você receberá neste endereço a confirmação após cada registro.
              {data.requiresEmail && ' O endereço deve conferir com o cadastro.'}
            </p>
          </div>
        )}

        {/* ── PROFESSOR ───────────────────────────────────────────────────── */}
        {isTeacher && (
          <>
            {/* Aulas do dia */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
              <h2 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                <BookOpen size={18} className="text-purple-500" />
                Aulas de Hoje
              </h2>

              {(!data.schedule || data.schedule.length === 0) ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhuma aula programada para hoje.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.schedule.map((cls) => {
                    const att = data.attendance as TeacherAttendance | null;
                    const clsAtt = att?.classes?.find((c) => c.period === cls.period);
                    const status = clsAtt?.status;

                    return (
                      <div
                        key={cls.period}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          status === 'present'
                            ? 'bg-green-50 border-green-200'
                            : status === 'absent'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                          {cls.period}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{cls.subjectName}</p>
                          <p className="text-xs text-gray-500 truncate">{cls.className}</p>
                          {(cls.startTime || cls.endTime) && (
                            <p className="text-xs text-gray-400">
                              {cls.startTime}{cls.endTime ? ` – ${cls.endTime}` : ''}
                            </p>
                          )}
                        </div>
                        {status === 'present' && <CheckCircle size={18} className="text-green-500 flex-shrink-0" />}
                        {status === 'absent' && <XCircle size={18} className="text-red-500 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botão confirmar presença */}
            {data.schedule && data.schedule.length > 0 && (
              <button
                onClick={() => handleMark('confirm')}
                disabled={marking || !email.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-colors text-lg"
              >
                <CheckCircle size={22} />
                {marking ? 'Confirmando...' : 'Confirmar Presença'}
              </button>
            )}
          </>
        )}

        {/* ── FUNCIONÁRIO ─────────────────────────────────────────────────── */}
        {!isTeacher && (
          <>
            {/* Status atual */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
              <h2 className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
                <Clock size={18} className="text-blue-500" />
                Registro de Ponto
              </h2>

              {data.jornadaTrabalho && (
                <p className="text-sm text-gray-500 mb-2 bg-blue-50 rounded-lg p-3">
                  Jornada: <span className="font-medium text-gray-700">{data.jornadaTrabalho}</span>
                </p>
              )}

              {data.workSchedule?.shiftMode === 'rotating' && data.workSchedule.rotatingEntryTime && (
                <div className="flex justify-between bg-indigo-50 rounded-lg p-3 mb-3 text-sm">
                  <span className="text-indigo-700">⏰ Entrada do plantão:</span>
                  <span className="font-bold text-indigo-800">{data.workSchedule.rotatingEntryTime}</span>
                </div>
              )}

              {data.workSchedule?.shiftMode !== 'rotating' && data.workSchedule?.entryTime && (
                <div className="bg-indigo-50 rounded-lg p-3 mb-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-indigo-700">⏰ 1º turno:</span>
                    <span className="font-bold text-indigo-800">
                      {data.workSchedule.entryTime} – {data.workSchedule.exitTime}
                    </span>
                  </div>
                  {['split2', 'split3'].includes(data.workSchedule.shiftType || 'single') && data.workSchedule.shift2EntryTime && (
                    <div className="flex justify-between">
                      <span className="text-indigo-700">⏰ 2º turno:</span>
                      <span className="font-bold text-indigo-800">
                        {data.workSchedule.shift2EntryTime} – {data.workSchedule.shift2ExitTime}
                      </span>
                    </div>
                  )}
                  {data.workSchedule.shiftType === 'split3' && data.workSchedule.shift3EntryTime && (
                    <div className="flex justify-between">
                      <span className="text-indigo-700">⏰ 3º turno:</span>
                      <span className="font-bold text-indigo-800">
                        {data.workSchedule.shift3EntryTime} – {data.workSchedule.shift3ExitTime}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const att = data.attendance as EmployeeAttendance | null;
                if (!att) {
                  return (
                    <p className="text-sm text-gray-400 text-center py-2">
                      Nenhum registro para hoje.
                    </p>
                  );
                }
                const empAtt = att as any;
                return (
                  <div className="space-y-3">
                    {empAtt.workedMinutes !== undefined && empAtt.workedMinutes > 0 && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Clock size={16} className="text-blue-500" /> Total trabalhado
                        </span>
                        <span className="font-bold text-blue-700">{minutesToHHmm(empAtt.workedMinutes)}</span>
                      </div>
                    )}
                    {/* Déficit / Saldo */}
                    {(empAtt.lateArrivalMinutes > 0 || empAtt.earlyDepartureMinutes > 0) && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
                        <span className="font-semibold text-red-700">⚠️ Déficit:</span>
                        {empAtt.lateArrivalMinutes > 0 && (
                          <span className="ml-2 text-red-600">Atraso: {minutesToHHmm(empAtt.lateArrivalMinutes)}</span>
                        )}
                        {empAtt.earlyDepartureMinutes > 0 && (
                          <span className="ml-2 text-red-600">Saída antecip.: {minutesToHHmm(empAtt.earlyDepartureMinutes)}</span>
                        )}
                      </div>
                    )}
                    {empAtt.overtimeMinutes > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                        <span className="font-semibold text-green-700">✅ Hora extra: {minutesToHHmm(empAtt.overtimeMinutes)}</span>
                      </div>
                    )}
                    {empAtt.deficitMinutes !== undefined && empAtt.deficitMinutes > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
                        <span className="font-semibold text-red-700">
                          Saldo deficitário atual: {minutesToHHmm(empAtt.deficitMinutes)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {data.punchState?.isExtraDay && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <strong>Dia extra:</strong> o período trabalhado será registrado como hora extra.
              </div>
            )}

            {data.punchState?.allowedNow && !data.punchState.complete && (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">📸 Foto ao vivo para confirmação</p>
                  <LiveCamera
                    captured={photoData}
                    onCapture={setPhotoData}
                    onClear={() => setPhotoData(null)}
                  />
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <MapPin size={15} className="text-indigo-500" /> Localização
                  </p>
                  {!geoPos && !geoError && (
                    <p className="text-xs text-gray-400">A localização será capturada automaticamente ao registrar o ponto.</p>
                  )}
                  {geoPos && (
                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-1">
                      ✅ Localização obtida — pronta para validação
                    </div>
                  )}
                  {geoError && (
                    <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2">
                      ⚠️ {geoError} — se a escola exigir localização, o registro será bloqueado.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Botões entrada / saída de todos os turnos */}
            {(() => {
              const state = data.punchState;
              if (!state) return null;

              const ws = data.workSchedule;
              const att = data.attendance as EmployeeAttendance | null;
              const isRotating = ws?.shiftMode === 'rotating';
              const shiftType = state.isExtraDay || isRotating ? 'single' : (ws?.shiftType || 'single');
              const shifts: {
                n: 1 | 2 | 3;
                schedEntry?: string;
                schedExit?: string;
                entry?: string;
                exit?: string;
              }[] = [
                {
                  n: 1,
                  schedEntry: isRotating ? ws?.rotatingEntryTime : ws?.entryTime,
                  schedExit: isRotating ? undefined : ws?.exitTime,
                  entry: att?.entryTime,
                  exit: att?.exitTime,
                },
                ...(['split2', 'split3'].includes(shiftType)
                  ? [{
                      n: 2 as const,
                      schedEntry: ws?.shift2EntryTime,
                      schedExit: ws?.shift2ExitTime,
                      entry: att?.entryTime2,
                      exit: att?.exitTime2,
                    }]
                  : []),
                ...(shiftType === 'split3'
                  ? [{
                      n: 3 as const,
                      schedEntry: ws?.shift3EntryTime,
                      schedExit: ws?.shift3ExitTime,
                      entry: att?.entryTime3,
                      exit: att?.exitTime3,
                    }]
                  : []),
              ];
              const multiShift = shifts.length > 1;

              const renderCell = (shift: typeof shifts[number], action: 'entry' | 'exit') => {
                const registered = action === 'entry' ? shift.entry : shift.exit;
                const scheduled = action === 'entry' ? shift.schedEntry : shift.schedExit;
                const isNext = !state.complete
                  && state.nextAction === action
                  && state.shiftNumber === shift.n;
                const canMark = isNext && state.allowedNow && !marking && !!email.trim();
                const Icon = action === 'entry' ? LogIn : LogOut;
                const actionLabel = `${multiShift ? `${shift.n}ª ` : ''}${action === 'entry' ? 'Entrada' : 'Saída'}`;

                let cellClass = 'rounded-2xl p-3 text-center border transition-colors ';
                if (registered) {
                  cellClass += 'bg-green-50 border-green-200 text-green-700';
                } else if (isNext && state.allowedNow) {
                  cellClass += action === 'entry'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg active:scale-[0.98]'
                    : 'bg-orange-500 border-orange-500 text-white shadow-lg active:scale-[0.98]';
                } else if (isNext) {
                  cellClass += 'bg-blue-50 border-blue-200 text-blue-700';
                } else {
                  cellClass += 'bg-gray-50 border-gray-200 text-gray-400';
                }

                return (
                  <button
                    type="button"
                    onClick={() => canMark && handleMark(action)}
                    disabled={!canMark}
                    className={cellClass}
                  >
                    <Icon size={20} className="mx-auto mb-1" />
                    <span className="block text-sm font-bold">{actionLabel}</span>
                    <span className="block text-xs mt-0.5">
                      {registered
                        ? `✓ Registrada às ${registered}`
                        : isNext && state.allowedNow
                        ? (marking
                            ? 'Registrando...'
                            : email.trim()
                            ? 'Toque para registrar'
                            : 'Informe o e-mail acima')
                        : isNext && state.availableAt
                        ? `Libera às ${state.availableAt}`
                        : scheduled
                        ? `Previsto: ${scheduled}`
                        : 'Aguardando'}
                    </span>
                  </button>
                );
              };

              return (
                <div className="space-y-3">
                  {state.complete ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center text-green-700 font-medium">
                      <CheckCircle className="mx-auto mb-2" size={28} />
                      {state.message}
                    </div>
                  ) : !state.allowedNow ? (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center text-blue-800">
                      <Clock className="mx-auto mb-2" size={28} />
                      <p className="font-semibold">{state.message}</p>
                      <p className="mt-1 text-xs">Os registros já enviados estão bloqueados e só podem ser corrigidos pela administração.</p>
                    </div>
                  ) : null}

                  {shifts.map(shift => (
                    <div key={shift.n} className="grid grid-cols-2 gap-3">
                      {renderCell(shift, 'entry')}
                      {renderCell(shift, 'exit')}
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Sistema Escolar · Ponto Eletrônico
        </p>
      </div>
    </div>
  );
}
