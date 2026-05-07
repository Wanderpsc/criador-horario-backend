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
import {
  User, Clock, CheckCircle, XCircle, AlertCircle,
  BookOpen, LogIn, LogOut, Calendar,
} from 'lucide-react';

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
  status: string;
  workedMinutes?: number;
}

interface PageData {
  schoolName: string;
  personType: 'teacher' | 'employee';
  personName: string;
  cargo?: string;
  setor?: string;
  today: string;
  dayLabel: string;
  // teacher
  schedule?: TeacherClass[];
  // employee
  jornadaTrabalho?: string;
  workSchedule?: {
    entryTime: string;
    exitTime: string;
    workDays: string[];
    toleranceMinutes: number;
  } | null;
  // common
  attendance: TeacherAttendance | EmployeeAttendance | null;
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

  const [pageStatus, setPageStatus] = useState<'loading' | 'error' | 'ok'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<PageData | null>(null);
  const [marking, setMarking] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [markError, setMarkError] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [geoPos, setGeoPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string>('');

  const load = async () => {
    if (!token) { setPageStatus('error'); setErrorMsg('Token inválido.'); return; }
    try {
      const res = await axios.get(`${API_URL}/attendance-links/public/${token}`);
      setData(res.data);
      setPageStatus('ok');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao carregar dados.';
      setErrorMsg(msg);
      setPageStatus('error');
    }
  };

  useEffect(() => { load(); }, [token]);

  const handleMark = async (action: 'entry' | 'exit' | 'confirm') => {
    setMarking(true);
    setMarkError('');
    setSuccessMsg('');

    // Geolocalização (tenta sempre obter, backend valida se requireGeolocation)
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
      const res = await axios.post(`${API_URL}/attendance-links/public/${token}/mark`, {
        action,
        lat,
        lng,
        photoData: photoData || undefined,
      });
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

  // ── Captura de foto ────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoData(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h2>
          <p className="text-gray-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const isTeacher = data.personType === 'teacher';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-start justify-center">
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
          </div>
        </div>

        {/* Feedback de sucesso/erro */}
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
                disabled={marking}
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

              {data.workSchedule?.entryTime && (
                <div className="flex justify-between bg-indigo-50 rounded-lg p-3 mb-3 text-sm">
                  <span className="text-indigo-700">⏰ Horário previsto:</span>
                  <span className="font-bold text-indigo-800">
                    {data.workSchedule.entryTime} – {data.workSchedule.exitTime}
                  </span>
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
                    <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-xl">
                      <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <LogIn size={16} className="text-green-600" /> Entrada
                      </span>
                      <span className="font-bold text-green-700">{empAtt.entryTime || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <LogOut size={16} className="text-gray-500" /> Saída
                      </span>
                      <span className="font-bold text-gray-700">{empAtt.exitTime || '—'}</span>
                    </div>
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
                  </div>
                );
              })()}
            </div>

            {/* Captura de foto (opcional / obrigatória conforme configuração) */}
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">📸 Foto de confirmação</p>
              <input type="file" accept="image/*" capture="environment"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100" />
              {photoData && (
                <img src={photoData} alt="preview" className="mt-2 rounded-lg h-28 object-cover border" />
              )}
            </div>

            {/* Status de geolocalização */}
            {geoPos && (
              <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2 mb-2 flex items-center gap-1">
                📍 Localização capturada ({geoPos.lat.toFixed(5)}, {geoPos.lng.toFixed(5)})
              </div>
            )}
            {geoError && (
              <div className="text-xs text-orange-600 bg-orange-50 rounded-lg p-2 mb-2">
                ⚠️ {geoError}
              </div>
            )}

            {/* Botões entrada / saída */}
            {(() => {
              const att = data.attendance as EmployeeAttendance | null;
              const hasEntry = !!(att as any)?.entryTime;
              const hasExit = !!(att as any)?.exitTime;

              if (hasExit) {
                return (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center text-green-700 font-medium">
                    <CheckCircle className="mx-auto mb-2" size={28} />
                    Ponto completo registrado hoje!
                  </div>
                );
              }

              if (!hasEntry) {
                return (
                  <button
                    onClick={() => handleMark('entry')}
                    disabled={marking}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-colors text-lg"
                  >
                    <LogIn size={22} />
                    {marking ? 'Registrando...' : 'Registrar Entrada'}
                  </button>
                );
              }

              return (
                <button
                  onClick={() => handleMark('exit')}
                  disabled={marking}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-colors text-lg"
                >
                  <LogOut size={22} />
                  {marking ? 'Registrando...' : 'Registrar Saída'}
                </button>
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
