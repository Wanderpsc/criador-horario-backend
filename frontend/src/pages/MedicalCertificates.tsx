import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { isAxiosError } from 'axios';
import { Bell, FileHeart, Plus, Search, ShieldCheck, X, Pencil, Trash2, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { canUseCertificates, certificateStatus, todayLocal } from '../utils/medicalCertificates';

type PersonType = 'employee' | 'teacher' | 'student';
interface Person { id: string; name: string; registration: string }
interface Certificate {
  id: string;
  personType: PersonType;
  personId: string;
  personName: string;
  registration: string;
  className: string;
  deliveredAt: string;
  issuedAt: string;
  startDate: string;
  days: number;
  endDate: string;
  returnDate: string;
  returnedAt: string;
  cids: string[];
  doctorName: string;
  doctorRegistration: string;
  hospital: string;
  documentReference: string;
  alertDays: number;
  makeupDays: number;
  madeUpDays: number;
  makeupReason: string;
  notes: string;
}
type Draft = Omit<Certificate, 'id' | 'endDate' | 'returnDate' | 'cids'> & { cidText: string };
const labels: Record<PersonType, string> = { employee: 'Funcionário', teacher: 'Professor', student: 'Aluno' };
const inputClass = 'w-full border rounded-lg p-2 bg-white disabled:bg-gray-100 disabled:text-gray-700';
const fmt = (value: string) => value ? format(parseISO(value), 'dd/MM/yyyy') : '—';

function newDraft(): Draft {
  return {
    personType: 'employee', personId: '', personName: '', registration: '', className: '',
    deliveredAt: todayLocal(), issuedAt: todayLocal(), startDate: todayLocal(), days: 1,
    returnedAt: '', cidText: '', doctorName: '', doctorRegistration: '', hospital: '',
    documentReference: '', alertDays: 2, makeupDays: 0, madeUpDays: 0, makeupReason: '', notes: '',
  };
}

function errorMessage(error: unknown) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || 'Não foi possível acessar o Controle de Atestados. Tente novamente.'
    : error instanceof Error ? error.message : 'Erro ao processar o atestado.';
}

export default function MedicalCertificates() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const allowed = canUseCertificates(user);
  const key = ['medical-certificates', user?.schoolId || user?.id];
  const [today, setToday] = useState(todayLocal);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ id?: string; readonly: boolean } | null>(null);
  const [draft, setDraft] = useState<Draft>(newDraft);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayLocal()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const recordsQuery = useQuery({
    queryKey: key, enabled: allowed, gcTime: 0, refetchInterval: 60000,
    queryFn: async () => (await api.get<Certificate[]>('/medical-certificates')).data,
  });
  const catalogQuery = useQuery({
    queryKey: [...key, 'catalog'], enabled: allowed,
    queryFn: async () => (await api.get<Record<string, string>>('/medical-certificates/catalog')).data,
  });
  const peopleQuery = useQuery({
    queryKey: [...key, 'people'], enabled: allowed && !!modal, gcTime: 0,
    queryFn: async () => (await api.get<{ employees: Person[]; teachers: Person[] }>('/medical-certificates/people')).data,
  });
  const save = useMutation({
    mutationFn: async () => {
      const { cidText, ...data } = draft;
      const body = { ...data, cids: cidText.split(/[,;\s]+/).filter(Boolean).map(c => c.toUpperCase()) };
      return modal?.id ? api.put(`/medical-certificates/${modal.id}`, body) : api.post('/medical-certificates', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      setModal(null);
      setDraft(newDraft());
      toast.success('Atestado salvo com sucesso.');
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/medical-certificates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success('Atestado excluído.'); },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  if (!allowed) return <div className="p-8 bg-white rounded-xl"><ShieldCheck className="mb-3" />
    <h1 className="text-xl font-bold">Acesso restrito</h1>
    <p>Solicite à gestão permissão de acesso e leitura ao Controle de Atestados. Este módulo contém dados sensíveis.</p>
  </div>;

  const records = recordsQuery.data || [];
  const filtered = records.filter(r =>
    (!type || r.personType === type) &&
    (!statusFilter || certificateStatus(r, today).key === statusFilter) &&
    `${r.personName} ${r.registration} ${r.className} ${r.hospital} ${r.doctorName}`.toLocaleLowerCase('pt-BR')
      .includes(search.toLocaleLowerCase('pt-BR')));
  const alerts = records.filter(r => ['today', 'soon', 'overdue'].includes(certificateStatus(r, today).key));
  const remaining = records.reduce((sum, r) => sum + r.makeupDays - r.madeUpDays, 0);
  const people = draft.personType === 'employee' ? peopleQuery.data?.employees || [] : peopleQuery.data?.teachers || [];
  const validPeriod = /^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) &&
    Number.isFinite(parseISO(draft.startDate).getTime()) && Number.isInteger(draft.days) && draft.days >= 1 && draft.days <= 3650;
  const endDate = validPeriod ? format(addDays(parseISO(draft.startDate), draft.days - 1), 'yyyy-MM-dd') : '';
  const returnDate = validPeriod ? format(addDays(parseISO(draft.startDate), draft.days), 'yyyy-MM-dd') : '';
  const cids = Array.from(new Set(draft.cidText.split(/[,;\s]+/).filter(Boolean).map(c => c.toUpperCase())));
  const overlaps = validPeriod && records.some(r => r.id !== modal?.id && r.personType === draft.personType &&
    (draft.personType === 'student'
      ? !!draft.registration && r.registration === draft.registration
      : !!draft.personId && r.personId === draft.personId) &&
    r.startDate <= endDate && r.endDate >= draft.startDate);

  function open(record?: Certificate, readonly = false) {
    if (record) {
      const { id: _id, endDate: _end, returnDate: _return, cids: codes, ...data } = record;
      setDraft({ ...data, cidText: codes.join(', ') });
    } else setDraft(newDraft());
    setModal({ id: record?.id, readonly });
  }
  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft(previous => ({ ...previous, [field]: value }));
  }
  const numberInput = (field: 'days' | 'alertDays' | 'makeupDays' | 'madeUpDays', label: string, min: number, max: number) =>
    <label className="text-sm font-medium">{label}
      <input type="number" required min={min} max={max} step="1" className={inputClass}
        value={Number.isNaN(draft[field]) ? '' : draft[field]} onChange={e => update(field, e.target.valueAsNumber)} />
    </label>;
  const textInput = (field: 'personName' | 'registration' | 'className' | 'doctorName' | 'doctorRegistration' | 'hospital' | 'documentReference', label: string, required = false) =>
    <label className="text-sm font-medium">{label}
      <input className={inputClass} required={required} maxLength={field === 'doctorRegistration' ? 80 : 200}
        value={draft[field]} onChange={e => update(field, e.target.value)} />
    </label>;

  return <div className="space-y-6">
    <header className="bg-gradient-to-r from-teal-700 to-blue-700 text-white p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileHeart /> Controle de Atestados</h1>
        <p className="mt-2">Funcionários, professores e alunos • afastamentos, retornos e reposições</p></div>
      {canUseCertificates(user, 'create') && <button onClick={() => open()} className="bg-white text-teal-800 px-4 py-2 rounded-xl flex gap-2"><Plus /> Novo atestado</button>}
    </header>
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm">
      <ShieldCheck className="inline mr-2" size={18} /> Dados de saúde são sensíveis. Registre apenas o necessário.
      CID é opcional; a descrição é informativa, não um diagnóstico. Reposição depende da decisão da gestão, não do CID.
    </div>
    {recordsQuery.isPending ? <p role="status">Carregando atestados...</p> : recordsQuery.isError ?
      <div role="alert" className="bg-red-50 p-4 rounded-xl">{errorMessage(recordsQuery.error)}
        <button className="ml-3 underline" onClick={() => recordsQuery.refetch()}>Tentar novamente</button>
      </div> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Atestados cadastrados', records.length], ['Em afastamento', records.filter(r => !r.returnedAt && r.startDate <= today && r.endDate >= today).length],
          ['Alertas de retorno', alerts.length], ['Dias pendentes de reposição', remaining]].map(([label, value]) =>
          <div key={label} className="bg-white border p-4 rounded-xl"><p className="text-sm text-gray-600">{label}</p><p className="text-3xl font-bold text-teal-700">{value}</p></div>)}
      </div>
      {alerts.length > 0 && <section className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
        <h2 className="font-bold flex gap-2 items-center"><Bell size={20} /> Central de retorno</h2>
        <p className="text-sm my-2">Alertas internos atualizados a cada minuto enquanto esta página estiver aberta. Retorno vencido indica falta de confirmação, não falta injustificada.</p>
        <div className="max-h-52 overflow-auto space-y-2">{alerts.map(r => <button key={r.id} onClick={() => open(r, true)}
          className="block w-full text-left bg-white p-3 rounded-lg border">
          <strong>{r.personName}</strong> · {fmt(r.returnDate)} · {certificateStatus(r, today).label}
        </button>)}</div>
      </section>}
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 min-w-[200px] gap-2 items-center bg-white border rounded-lg px-3"><Search size={18} />
          <input aria-label="Buscar atestados" placeholder="Nome, matrícula, turma, médico ou hospital" className="p-2 w-full" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <select aria-label="Filtrar público" className="border p-2 rounded-lg" value={type} onChange={e => setType(e.target.value)}>
          <option value="">Todos os públicos</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filtrar situação" className="border p-2 rounded-lg" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Todas as situações</option>
          <option value="planned">Programado</option><option value="active">Em afastamento</option>
          <option value="soon">Retorno próximo</option><option value="today">Retorno hoje</option>
          <option value="overdue">Retorno não confirmado</option><option value="returned">Retorno confirmado</option>
        </select>
        <button aria-label="Atualizar atestados" disabled={recordsQuery.isFetching} onClick={() => recordsQuery.refetch()} className="border p-2 rounded-lg"><RefreshCw size={20} /></button>
      </div>
      <div className="overflow-x-auto bg-white border rounded-xl">
        <table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr>
          {['Pessoa', 'Entrega', 'Afastamento', 'Retorno previsto', 'Situação', 'Reposição', 'Ações'].map(h => <th key={h} className="p-3 whitespace-nowrap">{h}</th>)}
        </tr></thead><tbody>{filtered.map(r => {
          const status = certificateStatus(r, today);
          return <tr key={r.id} className="border-t">
            <td className="p-3"><strong>{r.personName}</strong><p className="text-gray-500">{labels[r.personType]} {r.registration && `· ${r.registration}`} {r.className && `· ${r.className}`}</p></td>
            <td className="p-3 whitespace-nowrap">{fmt(r.deliveredAt)}</td>
            <td className="p-3 whitespace-nowrap">{fmt(r.startDate)} a {fmt(r.endDate)}<p>{r.days} dia(s) corrido(s)</p></td>
            <td className="p-3 whitespace-nowrap">{fmt(r.returnDate)}{r.returnedAt && <p className="text-green-700">Efetivo: {fmt(r.returnedAt)}</p>}</td>
            <td className="p-3"><span className={`px-2 py-1 rounded-full whitespace-nowrap ${status.color}`}>{status.label}</span></td>
            <td className="p-3">{r.makeupDays - r.madeUpDays} pendente(s)<p className="text-gray-500">{r.madeUpDays}/{r.makeupDays} reposto(s)</p></td>
            <td className="p-3"><div className="flex gap-2">
              <button aria-label={`Ver atestado de ${r.personName}`} onClick={() => open(r, true)}><Eye size={18} /></button>
              {canUseCertificates(user, 'update') && <button aria-label={`Editar atestado de ${r.personName}`} onClick={() => open(r)}><Pencil size={18} /></button>}
              {canUseCertificates(user, 'delete') && <button disabled={remove.isPending} className="text-red-600" aria-label={`Excluir atestado de ${r.personName}`}
                onClick={() => { if (window.confirm(`Excluir definitivamente o atestado de ${r.personName}?`)) remove.mutate(r.id); }}><Trash2 size={18} /></button>}
            </div></td>
          </tr>;
        })}</tbody></table>
        {!filtered.length && <p className="p-8 text-center text-gray-500">Nenhum atestado encontrado.</p>}
      </div>
    </>}
    {modal && <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-4 flex items-start justify-center">
      <section role="dialog" aria-modal="true" aria-labelledby="certificate-title" className="bg-white rounded-2xl w-full max-w-3xl my-8 p-6 shadow-xl">
        <div className="flex justify-between mb-4"><h2 id="certificate-title" className="font-bold text-xl">{modal.readonly ? 'Detalhes do atestado' : modal.id ? 'Editar atestado / registrar retorno' : 'Novo atestado'}</h2>
          <button aria-label="Fechar atestado" disabled={save.isPending} onClick={() => { setModal(null); setDraft(newDraft()); }}><X /></button></div>
        <form onSubmit={e => { e.preventDefault(); save.mutate(); }}>
          <fieldset disabled={modal.readonly || save.isPending} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium">Público<select className={inputClass} value={draft.personType}
                onChange={e => setDraft(d => ({ ...d, personType: e.target.value as PersonType, personId: '', personName: '', registration: '', className: '' }))}>
                {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {draft.personType !== 'student' ? <label className="text-sm font-medium">Pessoa cadastrada *
                <select className={inputClass} required value={draft.personId} onChange={e => {
                  const p = people.find(person => person.id === e.target.value);
                  setDraft(d => ({ ...d, personId: p?.id || '', personName: p?.name || '', registration: p?.registration || '' }));
                }}><option value="">Selecione...</option>
                  {draft.personId && !people.some(p => p.id === draft.personId) && <option value={draft.personId}>{draft.personName} (cadastro vinculado)</option>}
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}{p.registration ? ` · ${p.registration}` : ''}</option>)}
                </select></label> : <>
                {textInput('personName', 'Nome do aluno *', true)}{textInput('registration', 'Matrícula do aluno')}{textInput('className', 'Turma')}
              </>}
            </div>
            {draft.personType === 'student' && <p className="text-sm text-gray-500">Identificação manual: o sistema ainda não possui cadastro individual de alunos. Informe a matrícula para identificar períodos sobrepostos.</p>}
            {peopleQuery.isPending && draft.personType !== 'student' && <p role="status">Carregando pessoas...</p>}
            {peopleQuery.isError && <p role="alert" className="text-red-700">{errorMessage(peopleQuery.error)}</p>}
            <div className="grid sm:grid-cols-3 gap-4">
              {(['issuedAt', 'deliveredAt', 'startDate'] as const).map((field, i) => <label key={field} className="text-sm font-medium">
                {['Data de emissão *', 'Data de entrega *', 'Início do afastamento *'][i]}
                <input className={inputClass} type="date" required value={draft[field]} onChange={e => update(field, e.target.value)} /></label>)}
              {numberInput('days', 'Dias corridos de afastamento *', 1, 3650)}
              {numberInput('alertDays', 'Alertar quantos dias antes?', 0, 30)}
              <label className="text-sm font-medium">Retorno efetivo (confirmação)<input className={inputClass} type="date" min={draft.startDate}
                value={draft.returnedAt} onChange={e => update('returnedAt', e.target.value)} /></label>
            </div>
            <div className="bg-teal-50 p-3 rounded-lg text-sm">
              Último dia de afastamento: <strong>{fmt(endDate)}</strong> · Retorno previsto: <strong>{fmt(returnDate)}</strong>
              <p>A contagem inclui o dia inicial. Retorno é o dia seguinte ao fim do período; confira escala, feriados e dias letivos antes de confirmar.</p>
            </div>
            {overlaps && <p role="alert" className="bg-amber-50 p-3 rounded-lg">Atenção: há outro atestado desta pessoa com período sobreposto. Verifique se é duplicidade ou prorrogação.</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              {textInput('doctorName', 'Médico(a) expedidor(a)')}{textInput('doctorRegistration', 'CRM e UF')}
              {textInput('hospital', 'Hospital / clínica / unidade emissora')}{textInput('documentReference', 'Protocolo / referência do documento')}
            </div>
            <label className="block text-sm font-medium">CID-10 (opcional; separado por vírgulas)
              <input className={inputClass} maxLength={100} placeholder="Ex.: J06.9, R51" value={draft.cidText} onChange={e => update('cidText', e.target.value)} /></label>
            <div className="text-sm space-y-1">
              {catalogQuery.isError && <p role="alert" className="text-red-700">Catálogo indisponível. As descrições não puderam ser carregadas.</p>}
              {cids.map(code => <p key={code}><strong>{code}</strong> — {catalogQuery.isPending ? 'Carregando descrição...' :
                catalogQuery.data?.[code] || 'Descrição não disponível no catálogo local. Confira na fonte oficial CID-10; não há inferência automática.'}</p>)}
              <p className="text-gray-500">Catálogo local de códigos comuns, não exaustivo. Códigos não listados podem ser registrados se estiverem no formato CID-10.</p>
            </div>
            <div className="border rounded-xl p-4 space-y-3">
              <h3 className="font-bold">Controle de reposição</h3>
              <p className="text-sm text-gray-600">O afastamento não gera dívida automaticamente. Informe somente reposições determinadas pela gestão conforme as regras aplicáveis.</p>
              <div className="grid sm:grid-cols-2 gap-4">{numberInput('makeupDays', 'Dias definidos para reposição', 0, draft.days)}
                {numberInput('madeUpDays', 'Dias já repostos', 0, draft.makeupDays)}</div>
              <label className="block text-sm font-medium">Fundamento / justificativa da reposição
                <textarea className={inputClass} required={draft.makeupDays > 0} maxLength={1000} value={draft.makeupReason} onChange={e => update('makeupReason', e.target.value)} /></label>
              <p className="text-sm font-bold">Saldo: {Math.max(0, draft.makeupDays - draft.madeUpDays)} dia(s)</p>
            </div>
            <label className="block text-sm font-medium">Observações administrativas
              <textarea className={inputClass} maxLength={2000} value={draft.notes} onChange={e => update('notes', e.target.value)} /></label>
          </fieldset>
          <div className="flex justify-end gap-3 mt-5">
            {modal.readonly && canUseCertificates(user, 'update') && <button type="button" onClick={() => setModal({ ...modal, readonly: false })} className="border px-4 py-2 rounded-lg">Editar / confirmar retorno</button>}
            {!modal.readonly && <button disabled={save.isPending || !validPeriod || (draft.personType !== 'student' && !draft.personId)}
              className="bg-teal-700 text-white px-5 py-2 rounded-lg disabled:opacity-50">{save.isPending ? 'Salvando...' : 'Salvar atestado'}</button>}
          </div>
        </form>
      </section>
    </div>}
  </div>;
}
