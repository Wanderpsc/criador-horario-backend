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
  BookOpen, LogIn, LogOut, Search, ChevronRight, ArrowLeft,
} from 'lucide-react';

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
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
}

interface Attendance {
  entryTime?: string;
  exitTime?: string;
  workedMinutes?: number;
  totalPresentClasses?: number;
  totalScheduledClasses?: number;
}

interface PersonInfo {
  schoolName: string;
  personType: 'employee' | 'teacher';
  personName: string;
  cargo?: string;
  setor?: string;
  jornadaTrabalho?: string;
  workSchedule?: { entryTime: string; exitTime: string; workDays: string[]; toleranceMinutes: number } | null;
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

export default function PontoPublicoGeral() {
  const { token } = useParams<{ token: string }>();

  // Step 1 state
  const [step, setStep] = useState<Step>('select');
  const [schoolName, setSchoolName] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [errorPeople, setErrorPeople] = useState('');
  const [search, setSearch] = useState('');
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
  const [requireGeolocation, setRequireGeolocation] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [schoolGeoConfig, setSchoolGeoConfig] = useState<{ latitude?: number; longitude?: number; areaM2?: number }>({});

  // Carregar lista de pessoas
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/attendance-links/school-public/${token}`)
      .then(r => {
        setSchoolName(r.data.schoolName);
        setPeople(r.data.people);
        setRequireGeolocation(r.data.requireGeolocation || false);
        setRequirePhoto(r.data.requirePhoto || false);
        setSchoolGeoConfig({ latitude: r.data.latitude, longitude: r.data.longitude, areaM2: r.data.areaM2 });
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
  async function markAttendance(action: 'entry' | 'exit' | 'confirm') {
    if (!selected) return;
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
        lat,
        lng,
        photoData: photoData || undefined,
      });
      setResult(r.data);
      setUpdatedAttendance(r.data.attendance);
      setStep('done');
    } catch (e: any) {
      setResult({ message: e.response?.data?.message || 'Erro ao registrar ponto.' });
      setStep('done');
    } finally {
      setMarking(false);
    }
  }

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Loading da lista ───────────────────────────────────────────────────────
  if (loadingPeople) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (errorPeople) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-start justify-center p-4 pt-8">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="bg-indigo-600 rounded-t-2xl p-6 text-white text-center">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-90" />
            <h1 className="text-xl font-bold">Ponto Eletrônico</h1>
            {schoolName && <p className="text-indigo-200 text-sm mt-1">{schoolName}</p>}
          </div>

          <div className="p-5 space-y-4">
            <p className="text-gray-600 text-sm text-center font-medium">
              Selecione seu nome para registrar o ponto
            </p>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pelo nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
            </div>

            {/* Lista */}
            <div className="max-h-[60vh] overflow-y-auto space-y-1 rounded-xl border border-gray-100">
              {filteredPeople.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Nenhum resultado.</p>
              ) : (
                filteredPeople.map(p => (
                  <button
                    key={p._id}
                    onClick={() => selectPerson(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className={`p-1.5 rounded-full ${p.type === 'teacher' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      {p.type === 'teacher'
                        ? <BookOpen className="w-4 h-4 text-purple-600" />
                        : <User className="w-4 h-4 text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {p.type === 'teacher' ? 'Professor(a)' : (p.cargo || 'Funcionário(a)')}
                        {p.setor ? ` · ${p.setor}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            <p className="text-center text-xs text-gray-400">
              <Users className="inline w-3 h-3 mr-1" />
              {people.filter(p => p.type === 'teacher').length} professor(es) ·{' '}
              {people.filter(p => p.type === 'employee').length} funcionário(s)
            </p>
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
    const teacherMarked = isTeacher && att !== null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-start justify-center p-4 pt-8">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className={`rounded-t-2xl p-5 text-white ${isTeacher ? 'bg-purple-600' : 'bg-indigo-600'}`}>
            <button
              onClick={() => { setStep('select'); setSelected(null); setPersonInfo(null); }}
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs mb-3"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                {isTeacher ? <BookOpen className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">{personInfo?.personName || selected?.name}</p>
                <p className="text-white/80 text-xs">
                  {isTeacher ? 'Professor(a)' : (personInfo?.cargo || 'Funcionário(a)')}
                  {personInfo?.setor ? ` · ${personInfo.setor}` : ''}
                </p>
              </div>
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
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{personInfo?.dayLabel} · {personInfo?.today}</span>
                </div>

                {/* PROFESSOR: aulas do dia */}
                {isTeacher && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Aulas de Hoje</p>
                    {(personInfo?.schedule?.length ?? 0) === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Sem aulas programadas hoje.</p>
                    ) : (
                      <div className="space-y-2">
                        {personInfo?.schedule?.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
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
                      <div className="flex justify-between bg-indigo-50 rounded-lg p-3 text-sm">
                        <span className="text-indigo-700">⏰ Horário previsto:</span>
                        <span className="font-bold text-indigo-800">
                          {personInfo.workSchedule.entryTime} – {personInfo.workSchedule.exitTime}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-xl p-3 text-center ${hasEntry ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
                        <LogIn className={`w-5 h-5 mx-auto mb-1 ${hasEntry ? 'text-green-600' : 'text-gray-300'}`} />
                        <p className="text-xs text-gray-500">Entrada</p>
                        <p className={`font-bold text-sm ${hasEntry ? 'text-green-700' : 'text-gray-300'}`}>
                          {hasEntry ? (att as any).entryTime : '--:--'}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${hasExit ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-100'}`}>
                        <LogOut className={`w-5 h-5 mx-auto mb-1 ${hasExit ? 'text-red-600' : 'text-gray-300'}`} />
                        <p className="text-xs text-gray-500">Saída</p>
                        <p className={`font-bold text-sm ${hasExit ? 'text-red-700' : 'text-gray-300'}`}>
                          {hasExit ? (att as any).exitTime : '--:--'}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Foto de confirmação */}
                {!isTeacher && !hasExit && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      📸 Foto de confirmação {requirePhoto && <span className="text-red-500">*obrigatória</span>}
                    </p>
                    <input type="file" accept="image/*" capture="environment"
                      onChange={e => {
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
                      }}
                      className="block w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium" />
                    {photoData && <img src={photoData} alt="preview" className="mt-2 rounded-lg h-20 object-cover border" />}
                    {geoPos && <p className="text-xs text-green-600 mt-1">📍 Localização obtida</p>}
                    {geoError && <p className="text-xs text-orange-500 mt-1">⚠️ {geoError}</p>}
                  </div>
                )}

                {/* Botão de ação */}
                {isTeacher ? (
                  teacherMarked ? (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 p-4 rounded-xl justify-center">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium text-sm">Presença já registrada hoje</span>
                    </div>
                  ) : (personInfo?.schedule?.length ?? 0) > 0 ? (
                    <button
                      onClick={() => markAttendance('confirm')}
                      disabled={marking}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {marking ? 'Registrando...' : 'Confirmar Presença'}
                    </button>
                  ) : null
                ) : hasExit ? (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 p-4 rounded-xl justify-center">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">Ponto completo hoje</span>
                  </div>
                ) : hasEntry ? (
                  <button
                    onClick={() => markAttendance('exit')}
                    disabled={marking}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-5 h-5" />
                    {marking ? 'Registrando...' : 'Registrar Saída'}
                  </button>
                ) : (
                  <button
                    onClick={() => markAttendance('entry')}
                    disabled={marking}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-5 h-5" />
                    {marking ? 'Registrando...' : 'Registrar Entrada'}
                  </button>
                )}
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm text-center p-8">
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
