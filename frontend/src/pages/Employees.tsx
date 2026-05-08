import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Users, Plus, Search, Pencil, Trash2, Printer, X, ChevronDown, ChevronUp,
  User, Phone, MapPin, Briefcase, FileText, BookOpen, Eye, Link2, Copy, CheckCheck,
  Upload, FolderOpen, Download, AlertTriangle, Timer, Clock,
} from 'lucide-react';

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface Employee {
  _id: string;
  name: string;
  matricula?: string;
  cpf?: string;
  rg?: string;
  rgOrgao?: string;
  rgDataEmissao?: string;
  dataNascimento?: string;
  naturalidade?: string;
  nacionalidade?: string;
  sexo?: string;
  estadoCivil?: string;
  nomeMae?: string;
  nomePai?: string;
  tipoSanguineo?: string;
  email?: string;
  celular?: string;
  telefoneFixo?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cargo?: string;
  setor?: string;
  tipoContrato?: string;
  dataAdmissao?: string;
  dataInicioInstituicao?: string;
  dataDemissao?: string;
  jornadaTrabalho?: string;
  cargaHorariaSemanal?: number;
  salario?: number;
  ctpsNumero?: string;
  ctpsSerie?: string;
  pisPasep?: string;
  tituloEleitor?: string;
  zonaEleitoral?: string;
  secaoEleitoral?: string;
  certificadoMilitar?: string;
  cnhNumero?: string;
  cnhCategoria?: string;
  cnhValidade?: string;
  reservista?: string;
  observacoes?: string;
  workSchedule?: {
    entryTime: string;
    exitTime: string;
    workDays: string[];
    toleranceMinutes: number;
  };
  isActive: boolean;
}

const EMPTY: Omit<Employee, '_id' | 'isActive'> = {
  name: '', matricula: '', cpf: '', rg: '', rgOrgao: '', rgDataEmissao: '',
  dataNascimento: '', naturalidade: '', nacionalidade: 'Brasileira', sexo: '',
  estadoCivil: '', nomeMae: '', nomePai: '', tipoSanguineo: '',
  email: '', celular: '', telefoneFixo: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  cargo: '', setor: '', tipoContrato: '', dataAdmissao: '', dataInicioInstituicao: '', dataDemissao: '',
  jornadaTrabalho: '', cargaHorariaSemanal: undefined, salario: undefined,
  ctpsNumero: '', ctpsSerie: '', pisPasep: '', tituloEleitor: '', zonaEleitoral: '',
  secaoEleitoral: '', certificadoMilitar: '', cnhNumero: '', cnhCategoria: '',
  cnhValidade: '', reservista: '', observacoes: '',
  workSchedule: { entryTime: '', exitTime: '', workDays: ['monday','tuesday','wednesday','thursday','friday'], toleranceMinutes: 10 },
};

// ─── Máscaras de entrada ────────────────────────────────────────────────────
const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

type FormTab = 'pessoal' | 'contato' | 'endereco' | 'funcional' | 'documentos';

// ─── Tipos de documentos ──────────────────────────────────────────────────────
interface EmployeeDoc {
  _id: string;
  type: string;
  description?: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

const DOC_TYPES = [
  'RG', 'CPF', 'CTPS', 'CNH', 'Título de Eleitor', 'PIS/PASEP',
  'Certificado Reservista', 'Diploma/Certificado', 'Foto 3x4', 'Comprovante de Endereço',
  'Comprovante de Conta Bancária', 'Certidão de Nascimento', 'Certidão de Casamento',
  'Atestado Médico', 'Contrato de Trabalho', 'Exame Admissional', 'Outro',
];

const ICON_FOR_MIME: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️', 'image/jpg': '🖼️', 'image/png': '🖼️',
  'image/gif': '🖼️', 'image/webp': '🖼️', 'image/bmp': '🖼️',
};

const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

// ─── Componente principal ────────────────────────────────────────────────────
export default function Employees() {
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'cargo' | 'setor' | 'matricula'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Employee, '_id' | 'isActive'>>(EMPTY);
  const [formTab, setFormTab] = useState<FormTab>('pessoal');
  const [viewId, setViewId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'relatorio'>('lista');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingReactivateId, setPendingReactivateId] = useState<string | null>(null);

  // ─── Documentos do funcionário ────────────────────────────────────────────
  const [docsModalEmp, setDocsModalEmp] = useState<Employee | null>(null);
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docUploadType, setDocUploadType] = useState(DOC_TYPES[0]);
  const [docUploadDesc, setDocUploadDesc] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docPreviewMime, setDocPreviewMime] = useState<string>('');
  const [docPreviewName, setDocPreviewName] = useState<string>('');
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState<string | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  // ─── Link de convite ──────────────────────────────────────────────────────
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteEmployeeName, setInviteEmployeeName] = useState('');

  // ─── Link de ponto eletrônico ─────────────────────────────────────────────
  const [pontoModalOpen, setPontoModalOpen] = useState(false);
  const [pontoLink, setPontoLink] = useState('');
  const [pontoCopied, setPontoCopied] = useState(false);
  const [pontoEmployeeName, setPontoEmployeeName] = useState('');

  // ─── Link Geral do Ponto (escola inteira) ─────────────────────────────────
  const [geralModalOpen, setGeralModalOpen] = useState(false);
  const [geralLink, setGeralLink] = useState('');
  const [geralCopied, setGeralCopied] = useState(false);
  const [geralGenerating, setGeralGenerating] = useState(false);
  const [geralSettings, setGeralSettings] = useState({
    requireGeolocation: false,
    latitude: '',
    longitude: '',
    areaM2: 1000,
    requirePhoto: false,
    graceMinutes: 10,
  });
  const [geralSettingsSaving, setGeralSettingsSaving] = useState(false);

  // ─── Modal de Horário Rápido ───────────────────────────────────────────────
  const [scheduleModalEmp, setScheduleModalEmp] = useState<Employee | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    entryTime: '', exitTime: '', workDays: ['monday','tuesday','wednesday','thursday','friday'] as string[], toleranceMinutes: 10,
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const openScheduleModal = (emp: Employee) => {
    setScheduleModalEmp(emp);
    setScheduleForm({
      entryTime: emp.workSchedule?.entryTime || '',
      exitTime: emp.workSchedule?.exitTime || '',
      workDays: emp.workSchedule?.workDays || ['monday','tuesday','wednesday','thursday','friday'],
      toleranceMinutes: emp.workSchedule?.toleranceMinutes ?? 10,
    });
  };

  const saveSchedule = async () => {
    if (!scheduleModalEmp?._id) return;
    setScheduleSaving(true);
    try {
      await api.put(`/employees/${scheduleModalEmp._id}`, { workSchedule: scheduleForm });
      toast.success('Horário salvo!');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setScheduleModalEmp(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar horário.');
    } finally {
      setScheduleSaving(false);
    }
  };

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', showInactive],
    queryFn: async () => {
      const res = await api.get('/employees', {
        params: { isActive: showInactive ? undefined : true },
      });
      // api.ts interceptor converts _id → id; normalize so emp._id works everywhere
      const data = (res.data as any[]);
      return data.map((e: any) => ({ ...e, _id: e._id || e.id || '' })) as Employee[];
    },
  });

  // Query de documentos (ativada quando modal aberto)
  const { data: empDocs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['employee-docs', docsModalEmp?._id],
    queryFn: async () => {
      if (!docsModalEmp?._id) return [];
      const res = await api.get(`/employee-documents/${docsModalEmp._id}`);
      return res.data as EmployeeDoc[];
    },
    enabled: !!docsModalEmp,
  });

  const deleteDocMutation = useMutation({
    mutationFn: ({ empId, docId }: { empId: string; docId: string }) =>
      api.delete(`/employee-documents/${empId}/${docId}`),
    onSuccess: () => {
      toast.success('Documento excluído.');
      queryClient.invalidateQueries({ queryKey: ['employee-docs', docsModalEmp?._id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao excluir.'),
    onSettled: () => setPendingDeleteDocId(null),
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingId) return api.put(`/employees/${editingId}`, data);
      return api.post('/employees', data);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Funcionário atualizado!' : 'Funcionário cadastrado!');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao salvar.'),
  });

  const inviteMutation = useMutation({
    mutationFn: (employeeId?: string) =>
      api.post('/employee-invite-links', employeeId ? { employeeId } : {}),
    onSuccess: (res) => {
      const token = res.data.token;
      const base = window.location.origin + window.location.pathname;
      const url = `${base}#/employee-form/${token}`;
      setInviteLink(url);
      setInviteCopied(false);
      setInviteModalOpen(true);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao gerar link.'),
  });

  const pontoMutation = useMutation({
    mutationFn: (employeeId: string) =>
      api.post('/attendance-links', { personType: 'employee', personId: employeeId }),
    onSuccess: (res) => {
      const token = res.data.token;
      const base = window.location.origin + window.location.pathname;
      const url = `${base}#/ponto/${token}`;
      setPontoLink(url);
      setPontoCopied(false);
      setPontoModalOpen(true);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao gerar link de ponto.'),
  });

  const copyPontoLink = () => {
    navigator.clipboard.writeText(pontoLink).then(() => {
      setPontoCopied(true);
      setTimeout(() => setPontoCopied(false), 2500);
    });
  };

  const generateGeralLink = async () => {
    setGeralGenerating(true);
    try {
      const res = await api.post('/attendance-links/school-link');
      const token = res.data.token;
      const base = window.location.origin + window.location.pathname;
      setGeralLink(`${base}#/ponto-geral/${token}`);
      setGeralCopied(false);
      // Carregar configurações existentes
      try {
        const cfg = await api.get('/attendance-links/school-link');
        const d = cfg.data;
        setGeralSettings({
          requireGeolocation: d.requireGeolocation || false,
          latitude: d.latitude != null ? String(d.latitude) : '',
          longitude: d.longitude != null ? String(d.longitude) : '',
          areaM2: d.areaM2 || 1000,
          requirePhoto: d.requirePhoto || false,
          graceMinutes: d.graceMinutes ?? 10,
        });
      } catch {}
      setGeralModalOpen(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao gerar link geral.');
    } finally {
      setGeralGenerating(false);
    }
  };

  const copyGeralLink = () => {
    navigator.clipboard.writeText(geralLink).then(() => {
      setGeralCopied(true);
      setTimeout(() => setGeralCopied(false), 2500);
    });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      toast.success('Funcionário desativado.');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao desativar funcionário.'),
    onSettled: () => setPendingDeleteId(null),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/employees/${id}`, { isActive: true }),
    onSuccess: () => {
      toast.success('Funcionário reativado!');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao reativar funcionário.'),
    onSettled: () => setPendingReactivateId(null),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormTab('pessoal');
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp._id);
    const { _id, isActive, ...rest } = emp;
    setForm({ ...EMPTY, ...rest });
    setFormTab('pessoal');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const setField = (key: keyof typeof form, val: string | number | undefined) =>
    setForm(f => ({ ...f, [key]: val }));

  const setFieldUpper = (key: keyof typeof form, val: string) =>
    setForm(f => ({ ...f, [key]: val.toUpperCase() }));

  const setFieldCPF = (val: string) =>
    setForm(f => ({ ...f, cpf: maskCPF(val) }));

  const setFieldPhone = (key: 'celular' | 'telefoneFixo', val: string) =>
    setForm(f => ({ ...f, [key]: maskPhone(val) }));

  const uploadDoc = async () => {
    if (!docUploadFile || !docsModalEmp) return;
    if (!docUploadType.trim()) { toast.error('Selecione o tipo de documento.'); return; }
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', docUploadFile);
      fd.append('type', docUploadType);
      fd.append('description', docUploadDesc);
      await api.post(`/employee-documents/${docsModalEmp._id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Documento enviado!');
      setDocUploadFile(null);
      setDocUploadDesc('');
      if (docFileRef.current) docFileRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['employee-docs', docsModalEmp._id] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar documento.');
    } finally {
      setDocUploading(false);
    }
  };

  const openDocPreview = async (emp: Employee, doc: EmployeeDoc) => {
    try {
      const res = await api.get(`/employee-documents/${emp._id}/${doc._id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      setDocPreviewUrl(url);
      setDocPreviewMime(doc.mimeType);
      setDocPreviewName(doc.filename);
    } catch {
      toast.error('Erro ao abrir documento.');
    }
  };

  const filtered = employees
    .filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.matricula || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.cargo || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.setor || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.cpf || '').includes(search)
    )
    .sort((a, b) => {
      const av = (sortBy === 'name' ? a.name : sortBy === 'cargo' ? (a.cargo || '') : sortBy === 'setor' ? (a.setor || '') : (a.matricula || '')).toLowerCase();
      const bv = (sortBy === 'name' ? b.name : sortBy === 'cargo' ? (b.cargo || '') : sortBy === 'setor' ? (b.setor || '') : (b.matricula || '')).toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv, 'pt-BR') : bv.localeCompare(av, 'pt-BR');
    });

  const viewEmployee = employees.find(e => e._id === viewId) || null;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const handlePrint = () => window.print();

  const fmtDate = (d?: string) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const fmtCurrency = (v?: number) =>
    v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Funcionários</h1>
            <p className="text-sm text-gray-500">Cadastro geral de servidores e colaboradores</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Funcionário
        </button>
        <button
          onClick={() => {
            setInviteEmployeeName('novo funcionário');
            inviteMutation.mutate(undefined);
          }}
          disabled={inviteMutation.isPending}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-60"
          title="Gerar link para novo funcionário preencher seu próprio cadastro"
        >
          <Link2 className="w-4 h-4" />
          {inviteMutation.isPending ? 'Gerando...' : 'Gerar Link de Cadastro'}
        </button>
        <button
          onClick={generateGeralLink}
          disabled={geralGenerating}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 text-sm font-medium disabled:opacity-60"
          title="Link único de ponto eletrônico para todos os funcionários e professores"
        >
          <Timer className="w-4 h-4" />
          {geralGenerating ? 'Gerando...' : 'Link Geral do Ponto'}
        </button>
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200 gap-1 no-print overflow-x-auto whitespace-nowrap">
        {(['lista', 'relatorio'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'lista' ? '👥 Lista de Funcionários' : '🖨️ Relatório'}
          </button>
        ))}
      </div>

      {/* ── ABA: LISTA ───────────────────────────────────────────────────── */}
      {activeTab === 'lista' && (
        <div className="space-y-4">
          {/* Barra de pesquisa */}
          <div className="flex flex-col sm:flex-row gap-3 no-print">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, matrícula, cargo, setor ou CPF..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {/* Ordenar por */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-gray-500 mr-1">Ordenar:</span>
              {(['name', 'cargo', 'setor', 'matricula'] as const).map(col => (
                <button
                  key={col}
                  onClick={() => toggleSort(col)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                    sortBy === col
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {col === 'name' ? 'Nome' : col === 'cargo' ? 'Cargo' : col === 'setor' ? 'Setor' : 'Matrícula'}
                  {sortBy === col && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Mostrar inativos
            </label>
          </div>

          {/* Contador */}
          {filtered.length > 0 && (
            <p className="text-xs text-gray-500 no-print">
              {filtered.length} funcionário{filtered.length !== 1 ? 's' : ''} — ordenado{sortDir === 'asc' ? ' A→Z' : ' Z→A'} por{' '}
              <strong>{sortBy === 'name' ? 'nome' : sortBy === 'cargo' ? 'cargo' : sortBy === 'setor' ? 'setor' : 'matrícula'}</strong>
            </p>
          )}

          {/* Lista */}
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum funcionário encontrado</p>
              <p className="text-sm">Clique em "Novo Funcionário" para cadastrar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(emp => (
                <div
                  key={emp._id}
                  className={`bg-white border rounded-xl shadow-sm ${emp.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}
                >
                  {/* Cabeçalho do card */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === emp._id ? null : emp._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${emp.isActive ? 'bg-indigo-500' : 'bg-gray-400'}`}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{emp.name}</p>
                        <p className="text-xs text-gray-500">
                          {[emp.cargo, emp.setor].filter(Boolean).join(' • ') || '—'}
                          {emp.matricula && ` • Mat: ${emp.matricula}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!emp.isActive && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inativo</span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setViewId(emp._id); }}
                        className="p-1.5 text-gray-400 hover:text-blue-500"
                        title="Ver ficha completa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDocsModalEmp(emp); }}
                        className="p-1.5 text-gray-400 hover:text-teal-600"
                        title="Documentos do funcionário"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setInviteEmployeeName(emp.name);
                          inviteMutation.mutate(emp._id);
                        }}
                        disabled={inviteMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-emerald-500 disabled:opacity-50"
                        title="Gerar link para o funcionário atualizar seus dados"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setPontoEmployeeName(emp.name);
                          pontoMutation.mutate(emp._id);
                        }}
                        disabled={pontoMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-50"
                        title="Gerar link de ponto eletrônico"
                      >
                        <Timer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); openScheduleModal(emp); }}
                        className={`p-1.5 hover:text-indigo-600 ${emp.workSchedule?.entryTime ? 'text-indigo-400' : 'text-gray-300'}`}
                        title="Configurar horário de entrada/saída"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(emp); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-500"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {emp.isActive ? (
                        <button
                          onClick={e => { e.stopPropagation(); if (emp._id && confirm(`Desativar ${emp.name}?`)) { setPendingDeleteId(emp._id); deleteMutation.mutate(emp._id); } }}
                          disabled={pendingDeleteId === emp._id}
                          className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
                          title="Desativar funcionário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); if (emp._id && confirm(`Reativar ${emp.name}?`)) { setPendingReactivateId(emp._id); reactivateMutation.mutate(emp._id); } }}
                          disabled={pendingReactivateId === emp._id}
                          className="p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-50"
                          title="Reativar funcionário"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                      )}
                      {expandedId === emp._id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expansão resumida */}
                  {expandedId === emp._id && (
                    <div className="border-t border-gray-100 px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-sm">
                      <div><span className="text-gray-400 text-xs">CPF</span><p>{emp.cpf || '—'}</p></div>
                      <div><span className="text-gray-400 text-xs">Admissão</span><p>{fmtDate(emp.dataAdmissao)}</p></div>
                      <div><span className="text-gray-400 text-xs">Celular</span><p>{emp.celular || '—'}</p></div>
                      <div><span className="text-gray-400 text-xs">Contrato</span><p>{emp.tipoContrato || '—'}</p></div>
                      <div><span className="text-gray-400 text-xs">E-mail</span><p className="truncate">{emp.email || '—'}</p></div>
                      <div><span className="text-gray-400 text-xs">Cidade/UF</span><p>{[emp.cidade, emp.estado].filter(Boolean).join('/') || '—'}</p></div>
                      <div><span className="text-gray-400 text-xs">Nasc.</span><p>{fmtDate(emp.dataNascimento)}</p></div>
                      <div><span className="text-gray-400 text-xs">C/H Semanal</span><p>{emp.cargaHorariaSemanal ? `${emp.cargaHorariaSemanal}h` : '—'}</p></div>
                      {/* Horário de trabalho */}
                      <div className="col-span-2 sm:col-span-4 border-t border-gray-100 pt-3 mt-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-xs font-semibold text-indigo-700">Horário de Trabalho</span>
                          <button
                            onClick={e => { e.stopPropagation(); openScheduleModal(emp); }}
                            className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 underline"
                          >editar</button>
                        </div>
                        {emp.workSchedule?.entryTime ? (
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span><span className="text-gray-400 text-xs">Entrada: </span><strong>{emp.workSchedule.entryTime}</strong></span>
                            <span><span className="text-gray-400 text-xs">Saída: </span><strong>{emp.workSchedule.exitTime || '—'}</strong></span>
                            <span><span className="text-gray-400 text-xs">Tolerância: </span><strong>{emp.workSchedule.toleranceMinutes ?? 10} min</strong></span>
                            <span><span className="text-gray-400 text-xs">Dias: </span><strong>{
                              (emp.workSchedule.workDays || []).map(d => ({ monday:'Seg',tuesday:'Ter',wednesday:'Qua',thursday:'Qui',friday:'Sex',saturday:'Sáb',sunday:'Dom' }[d] || d)).join(', ')
                            }</strong></span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Horário não configurado — clique em "editar" para definir.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA: RELATÓRIO ────────────────────────────────────────────────── */}
      {activeTab === 'relatorio' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Ordenar:</span>
              {(['name', 'cargo', 'setor', 'matricula'] as const).map(col => (
                <button
                  key={col}
                  onClick={() => toggleSort(col)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                    sortBy === col
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {col === 'name' ? 'Nome' : col === 'cargo' ? 'Cargo' : col === 'setor' ? 'Setor' : 'Matrícula'}
                  {sortBy === col && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </button>
              ))}
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>

          <div id="employee-report-print" ref={printRef}>
            <div className="text-center mb-6 print-only hidden">
              <h2 className="text-lg font-bold">RELAÇÃO DE FUNCIONÁRIOS</h2>
              <p className="text-sm text-gray-500">
                Ordenado por: {sortBy === 'name' ? 'Nome' : sortBy === 'cargo' ? 'Cargo' : sortBy === 'setor' ? 'Setor' : 'Matrícula'} ({sortDir === 'asc' ? 'A→Z' : 'Z→A'}) — Emitido em {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-indigo-600 text-white">
                    <tr>
                      <th className="text-left px-3 py-3">Matrícula</th>
                      <th className="text-left px-3 py-3">Nome Completo</th>
                      <th className="text-left px-3 py-3">Cargo / Setor</th>
                      <th className="text-left px-3 py-3">Contrato</th>
                      <th className="text-left px-3 py-3">CPF</th>
                      <th className="text-left px-3 py-3">Celular</th>
                      <th className="text-left px-3 py-3">Admissão</th>
                      <th className="text-left px-3 py-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp, i) => (
                      <tr key={emp._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 font-mono text-xs">{emp.matricula || '—'}</td>
                        <td className="px-3 py-2 font-medium">{emp.name}</td>
                        <td className="px-3 py-2 text-xs">{[emp.cargo, emp.setor].filter(Boolean).join(' / ') || '—'}</td>
                        <td className="px-3 py-2 text-xs">{emp.tipoContrato || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{emp.cpf || '—'}</td>
                        <td className="px-3 py-2 text-xs">{emp.celular || '—'}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(emp.dataAdmissao)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {emp.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50">
                      <td colSpan={8} className="px-3 py-2 text-sm font-semibold text-indigo-700">
                        Total: {filtered.length} funcionário(s) — Ativos: {filtered.filter(e => e.isActive).length} — Inativos: {filtered.filter(e => !e.isActive).length}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Assinaturas */}
            <div className="mt-10 grid grid-cols-2 gap-10 print-only hidden">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 text-sm">Responsável / Direção</div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 text-sm">Setor de Pessoal / RH</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DOCUMENTOS ──────────────────────────────────────────────── */}
      {docsModalEmp && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-teal-600" />
                <div>
                  <h2 className="text-base font-bold text-gray-800">Documentos</h2>
                  <p className="text-xs text-gray-500">{docsModalEmp.name}</p>
                </div>
              </div>
              <button onClick={() => { setDocsModalEmp(null); setDocUploadFile(null); setDocPreviewUrl(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Upload */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Adicionar Documento
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo do documento *</label>
                    <select
                      value={docUploadType}
                      onChange={e => setDocUploadType(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                    >
                      {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descrição (opcional)</label>
                    <input
                      value={docUploadDesc}
                      onChange={e => setDocUploadDesc(e.target.value)}
                      placeholder="Ex: Frente, verso, 2024..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Arquivo (foto, scan ou PDF — máx. 10 MB)</label>
                  <input
                    ref={docFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={e => setDocUploadFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-100 file:text-teal-700 hover:file:bg-teal-200 cursor-pointer"
                  />
                  {docUploadFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      {ICON_FOR_MIME[docUploadFile.type] || '📎'} {docUploadFile.name} — {fmtBytes(docUploadFile.size)}
                    </p>
                  )}
                </div>
                <button
                  onClick={uploadDoc}
                  disabled={!docUploadFile || docUploading}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {docUploading ? 'Enviando...' : <><Upload className="w-4 h-4" /> Enviar Documento</>}
                </button>
              </div>

              {/* Lista de documentos */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Documentos Cadastrados
                  {!docsLoading && <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{empDocs.length}</span>}
                </p>

                {docsLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
                ) : empDocs.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">Nenhum documento cadastrado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {empDocs.map(doc => (
                      <div key={doc._id} className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:bg-gray-50">
                        <span className="text-2xl flex-shrink-0">{ICON_FOR_MIME[doc.mimeType] || '📎'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{doc.type}{doc.description ? ` — ${doc.description}` : ''}</p>
                          <p className="text-xs text-gray-400 truncate">{doc.filename} · {fmtBytes(doc.size)}</p>
                          <p className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openDocPreview(docsModalEmp, doc)}
                            className="p-1.5 text-gray-400 hover:text-blue-600"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={`${(api.defaults.baseURL || '')}employee-documents/${docsModalEmp._id}/${doc._id}/download`}
                            download={doc.filename}
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                const res = await api.get(`/employee-documents/${docsModalEmp._id}/${doc._id}/download`, { responseType: 'blob' });
                                const url = URL.createObjectURL(res.data as Blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = doc.filename; a.click();
                                setTimeout(() => URL.revokeObjectURL(url), 5000);
                              } catch { toast.error('Erro ao baixar.'); }
                            }}
                            className="p-1.5 text-gray-400 hover:text-teal-600"
                            title="Baixar"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir "${doc.type}"?`)) {
                                setPendingDeleteDocId(doc._id);
                                deleteDocMutation.mutate({ empId: docsModalEmp._id, docId: doc._id });
                              }
                            }}
                            disabled={pendingDeleteDocId === doc._id}
                            className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nota */}
              <p className="text-xs text-gray-400 flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                Arquivos são armazenados com segurança no servidor. Máx. 10 MB por arquivo. Formatos aceitos: imagens (JPG, PNG, GIF, WEBP) e PDF.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW DE DOCUMENTO ──────────────────────────────────────────── */}
      {docPreviewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => { URL.revokeObjectURL(docPreviewUrl); setDocPreviewUrl(null); }}
        >
          <div className="relative max-w-4xl w-full max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full mb-2 px-1">
              <p className="text-white text-sm font-medium truncate">{docPreviewName}</p>
              <button
                onClick={() => { URL.revokeObjectURL(docPreviewUrl); setDocPreviewUrl(null); }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {docPreviewMime === 'application/pdf' ? (
              <iframe
                src={docPreviewUrl}
                className="w-full rounded-lg bg-white"
                style={{ height: '80vh' }}
                title={docPreviewName}
              />
            ) : (
              <img
                src={docPreviewUrl}
                alt={docPreviewName}
                className="max-h-[80vh] max-w-full rounded-lg object-contain bg-white"
              />
            )}
          </div>
        </div>
      )}

      {/* ── MODAL HORÁRIO RÁPIDO ───────────────────────────────────────────── */}
      {scheduleModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-base font-bold text-gray-800">Horário de Trabalho</h2>
                  <p className="text-xs text-gray-500">{scheduleModalEmp.name}</p>
                </div>
              </div>
              <button onClick={() => setScheduleModalEmp(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora de Entrada</label>
                  <input type="time" value={scheduleForm.entryTime}
                    onChange={e => setScheduleForm(s => ({ ...s, entryTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora de Saída</label>
                  <input type="time" value={scheduleForm.exitTime}
                    onChange={e => setScheduleForm(s => ({ ...s, exitTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tolerância de atraso (minutos)</label>
                <input type="number" min={0} max={60} value={scheduleForm.toleranceMinutes}
                  onChange={e => setScheduleForm(s => ({ ...s, toleranceMinutes: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Dias de trabalho</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'monday', label: 'Seg' }, { key: 'tuesday', label: 'Ter' },
                    { key: 'wednesday', label: 'Qua' }, { key: 'thursday', label: 'Qui' },
                    { key: 'friday', label: 'Sex' }, { key: 'saturday', label: 'Sáb' },
                    { key: 'sunday', label: 'Dom' },
                  ].map(({ key, label }) => {
                    const selected = scheduleForm.workDays.includes(key);
                    return (
                      <button key={key} type="button"
                        onClick={() => setScheduleForm(s => ({
                          ...s,
                          workDays: selected ? s.workDays.filter(d => d !== key) : [...s.workDays, key],
                        }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setScheduleModalEmp(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={saveSchedule} disabled={scheduleSaving || !scheduleForm.entryTime || !scheduleForm.exitTime}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {scheduleSaving ? 'Salvando...' : '💾 Salvar Horário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL LINK DE CONVITE ──────────────────────────────────────────── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-gray-800">Link de Cadastro Gerado</h2>
              </div>
              <button onClick={() => setInviteModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Envie o link abaixo para <strong>{inviteEmployeeName}</strong> preencher seus dados.
                O link é válido por <strong>30 dias</strong>.
              </p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <span className="text-xs text-gray-700 break-all flex-1 font-mono">{inviteLink}</span>
                <button
                  onClick={copyInviteLink}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium"
                >
                  {inviteCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {inviteCopied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
                <p>📋 <strong>Como usar:</strong></p>
                <p>1. Copie o link acima e envie ao funcionário (WhatsApp, e-mail etc.)</p>
                <p>2. O funcionário abrirá o link e preencherá seus próprios dados</p>
                <p>3. Ao enviar, o sistema será preenchido automaticamente</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    const text = `Olá! Por favor, preencha seu cadastro escolar pelo link abaixo:\n${inviteLink}`;
                    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(wa, '_blank');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 font-medium"
                >
                  📱 Enviar via WhatsApp
                </button>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PONTO ELETRÔNICO ────────────────────────────────────────── */}
      {pontoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-gray-800">Link de Ponto Eletrônico</h2>
              </div>
              <button onClick={() => setPontoModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Envie o link abaixo para <strong>{pontoEmployeeName}</strong> marcar o ponto diariamente.
                O link é <strong>permanente</strong> — use sempre o mesmo.
              </p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <span className="text-xs text-gray-700 break-all flex-1 font-mono">{pontoLink}</span>
                <button
                  onClick={copyPontoLink}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-medium"
                >
                  {pontoCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {pontoCopied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
                <p>🕐 <strong>Como usar:</strong></p>
                <p>1. Envie este link ao funcionário (salvar no celular ou via QR Code)</p>
                <p>2. A cada dia, o funcionário acessa o link e registra entrada/saída</p>
                <p>3. O ponto é lançado automaticamente no sistema</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    const text = `Olá ${pontoEmployeeName}! Acesse o link abaixo para registrar seu ponto diário:\n${pontoLink}`;
                    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(wa, '_blank');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 font-medium"
                >
                  📱 Enviar via WhatsApp
                </button>
                <button
                  onClick={() => setPontoModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL LINK GERAL DO PONTO ─────────────────────────────────────── */}
      {geralModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-xl">
                  <Timer className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Link Geral do Ponto</h2>
              </div>
              <button onClick={() => setGeralModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Envie este único link para <strong>todos</strong> os funcionários e professores.
              Ao acessar, cada pessoa escolhe o próprio nome na lista e registra o ponto.
            </p>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <span className="text-xs text-gray-700 break-all flex-1 font-mono">{geralLink}</span>
              <button
                onClick={copyGeralLink}
                className={`p-1.5 rounded-lg ${geralCopied ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                title="Copiar link"
              >
                {geralCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = `Acesse o link abaixo para registrar seu ponto eletrônico diário:\n${geralLink}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar no WhatsApp
              </button>
              <button
                onClick={() => setGeralModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <div className="bg-orange-50 rounded-xl p-3 text-xs text-orange-700">
              <strong>Este link é permanente</strong> — funciona para todos ao mesmo tempo.
              Ao abrir, cada pessoa seleciona o próprio nome e registra entrada ou saída.
            </div>

            {/* ── Configurações ──────────────────────────────────────── */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">⚙️ Configurações</p>

              {/* Geolocalizacão */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={geralSettings.requireGeolocation}
                  onChange={e => setGeralSettings(s => ({ ...s, requireGeolocation: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm font-medium text-gray-700">📍 Exigir geolocalização</span>
              </label>
              {geralSettings.requireGeolocation && (
                <div className="ml-6 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Latitude</label>
                    <input type="number" step="0.000001" value={geralSettings.latitude}
                      onChange={e => setGeralSettings(s => ({ ...s, latitude: e.target.value }))}
                      placeholder="-3.7172"
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Longitude</label>
                    <input type="number" step="0.000001" value={geralSettings.longitude}
                      onChange={e => setGeralSettings(s => ({ ...s, longitude: e.target.value }))}
                      placeholder="-38.5433"
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Área (m²)</label>
                    <input type="number" min="100" value={geralSettings.areaM2}
                      onChange={e => setGeralSettings(s => ({ ...s, areaM2: Number(e.target.value) }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none" />
                    <p className="text-xs text-gray-400 mt-0.5">Raio ≈ {Math.round(Math.sqrt(Number(geralSettings.areaM2 || 1000) / Math.PI))}m</p>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(p => {
                          setGeralSettings(s => ({ ...s, latitude: String(p.coords.latitude), longitude: String(p.coords.longitude) }));
                          toast.success('Coordenadas capturadas!');
                        }, () => toast.error('Não foi possível obter localização.'));
                      }}
                      className="w-full text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-2 py-1.5 hover:bg-blue-100"
                    >
                      📍 Minha localização
                    </button>
                  </div>
                </div>
              )}

              {/* Foto */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={geralSettings.requirePhoto}
                  onChange={e => setGeralSettings(s => ({ ...s, requirePhoto: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm font-medium text-gray-700">📸 Exigir foto ao vivo</span>
              </label>

              {/* Tolerância */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">⏱️ Tolerância de entrada (minutos)</label>
                <input type="number" min="0" max="60" value={geralSettings.graceMinutes}
                  onChange={e => setGeralSettings(s => ({ ...s, graceMinutes: Number(e.target.value) }))}
                  className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none" />
                <span className="text-xs text-gray-400">antes e depois</span>
              </div>

              <button
                type="button"
                disabled={geralSettingsSaving}
                onClick={async () => {
                  setGeralSettingsSaving(true);
                  try {
                    await api.put('/attendance-links/school-link/settings', {
                      requireGeolocation: geralSettings.requireGeolocation,
                      latitude: geralSettings.latitude !== '' ? Number(geralSettings.latitude) : undefined,
                      longitude: geralSettings.longitude !== '' ? Number(geralSettings.longitude) : undefined,
                      areaM2: geralSettings.areaM2,
                      requirePhoto: geralSettings.requirePhoto,
                      graceMinutes: Number(geralSettings.graceMinutes),
                    });
                    toast.success('Configurações salvas!');
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || 'Erro ao salvar.');
                  } finally {
                    setGeralSettingsSaving(false);
                  }
                }}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {geralSettingsSaving ? 'Salvando...' : '💾 Salvar configurações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FORMULÁRIO ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
            {/* Header modal */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas do formulário */}
            <div className="flex overflow-x-auto border-b border-gray-100 gap-0">
              {(
                [
                  { key: 'pessoal', icon: User, label: 'Pessoal' },
                  { key: 'contato', icon: Phone, label: 'Contato' },
                  { key: 'endereco', icon: MapPin, label: 'Endereço' },
                  { key: 'funcional', icon: Briefcase, label: 'Funcional' },
                  { key: 'documentos', icon: FileText, label: 'Documentos' },
                ] as { key: FormTab; icon: any; label: string }[]
              ).map(t => (
                <button
                  key={t.key}
                  onClick={() => setFormTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    formTab === t.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {/* ── Aba Pessoal ── */}
              {formTab === 'pessoal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome Completo *</label>
                    <input value={form.name} onChange={e => setFieldUpper('name', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nome completo do funcionário" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Matrícula</label>
                    <input value={form.matricula} onChange={e => setFieldUpper('matricula', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: 20260001" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                    <input value={form.cpf} onChange={e => setFieldCPF(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="000.000.000-00" maxLength={14} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">RG</label>
                    <input value={form.rg} onChange={e => setFieldUpper('rg', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="0000000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Órgão Emissor RG</label>
                    <input value={form.rgOrgao} onChange={e => setFieldUpper('rgOrgao', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="SSP/MA" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Emissão do RG</label>
                    <input type="date" value={form.rgDataEmissao} onChange={e => setField('rgDataEmissao', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Nascimento</label>
                    <input type="date" value={form.dataNascimento} onChange={e => setField('dataNascimento', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Naturalidade</label>
                    <input value={form.naturalidade} onChange={e => setFieldUpper('naturalidade', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Cidade/UF de nascimento" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nacionalidade</label>
                    <input value={form.nacionalidade} onChange={e => setFieldUpper('nacionalidade', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="BRASILEIRA" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sexo</label>
                    <select value={form.sexo} onChange={e => setField('sexo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Selecione —</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado Civil</label>
                    <select value={form.estadoCivil} onChange={e => setField('estadoCivil', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Selecione —</option>
                      {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Outro'].map(v =>
                        <option key={v} value={v}>{v}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Sanguíneo</label>
                    <select value={form.tipoSanguineo} onChange={e => setField('tipoSanguineo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Selecione —</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v =>
                        <option key={v} value={v}>{v}</option>
                      )}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome da Mãe</label>
                    <input value={form.nomeMae} onChange={e => setFieldUpper('nomeMae', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nome completo da mãe" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Pai</label>
                    <input value={form.nomePai} onChange={e => setFieldUpper('nomePai', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nome completo do pai" />
                  </div>
                </div>
              )}

              {/* ── Aba Contato ── */}
              {formTab === 'contato' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                    <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="funcionario@email.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                    <input value={form.celular} onChange={e => setFieldPhone('celular', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="(99) 99999-9999" maxLength={16} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefone Fixo</label>
                    <input value={form.telefoneFixo} onChange={e => setFieldPhone('telefoneFixo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="(99) 3333-4444" maxLength={15} />
                  </div>
                </div>
              )}

              {/* ── Aba Endereço ── */}
              {formTab === 'endereco' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                    <input value={form.cep} onChange={e => setField('cep', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="00000-000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado (UF)</label>
                    <input value={form.estado} onChange={e => setFieldUpper('estado', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="MA" maxLength={2} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Logradouro</label>
                    <input value={form.logradouro} onChange={e => setFieldUpper('logradouro', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="RUA / AV. / TRAVESSA..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                    <input value={form.numero} onChange={e => setFieldUpper('numero', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="123" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Complemento</label>
                    <input value={form.complemento} onChange={e => setFieldUpper('complemento', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="APTO, BLOCO..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
                    <input value={form.bairro} onChange={e => setFieldUpper('bairro', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="BAIRRO" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                    <input value={form.cidade} onChange={e => setFieldUpper('cidade', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="CIDADE" />
                  </div>
                </div>
              )}

              {/* ── Aba Funcional ── */}
              {formTab === 'funcional' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cargo / Função</label>
                    <input value={form.cargo} onChange={e => setFieldUpper('cargo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: COORDENADOR, SECRETÁRIO, AUXILIAR..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Setor / Departamento</label>
                    <input value={form.setor} onChange={e => setFieldUpper('setor', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: SECRETARIA, ADMINISTRAÇÃO..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Contrato</label>
                    <select value={form.tipoContrato} onChange={e => setField('tipoContrato', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Selecione —</option>
                      {['CLT', 'Estatutário', 'Temporário', 'Terceirizado', 'Contrato', 'Outro'].map(v =>
                        <option key={v} value={v}>{v}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Jornada de Trabalho</label>
                    <input value={form.jornadaTrabalho} onChange={e => setFieldUpper('jornadaTrabalho', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: 08H ÀS 17H" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Início na Instituição</label>
                    <input type="date" value={form.dataInicioInstituicao} onChange={e => setField('dataInicioInstituicao', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Admissão</label>
                    <input type="date" value={form.dataAdmissao} onChange={e => setField('dataAdmissao', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Demissão</label>
                    <input type="date" value={form.dataDemissao} onChange={e => setField('dataDemissao', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Carga Horária Semanal (h)</label>
                    <input type="number" value={form.cargaHorariaSemanal ?? ''} onChange={e => setField('cargaHorariaSemanal', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="40" min={0} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Salário (R$)</label>
                    <input type="number" value={form.salario ?? ''} onChange={e => setField('salario', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="0,00" min={0} step={0.01} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                    <textarea value={form.observacoes} onChange={e => setField('observacoes', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Informações adicionais..." />
                  </div>

                  {/* ── Escala / Horário de Trabalho ── */}
                  <div className="sm:col-span-2 border-t pt-4 mt-2">
                    <h3 className="text-sm font-semibold text-indigo-700 mb-3">Escala / Horário de Trabalho</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hora de Entrada</label>
                        <input type="time" value={form.workSchedule?.entryTime || ''}
                          onChange={e => setField('workSchedule', { ...form.workSchedule, entryTime: e.target.value } as any)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hora de Saída</label>
                        <input type="time" value={form.workSchedule?.exitTime || ''}
                          onChange={e => setField('workSchedule', { ...form.workSchedule, exitTime: e.target.value } as any)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tolerância (min)</label>
                        <input type="number" min={0} max={60} value={form.workSchedule?.toleranceMinutes ?? 10}
                          onChange={e => setField('workSchedule', { ...form.workSchedule, toleranceMinutes: Number(e.target.value) } as any)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-2">Dias de Trabalho</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'monday', label: 'Seg' },
                            { key: 'tuesday', label: 'Ter' },
                            { key: 'wednesday', label: 'Qua' },
                            { key: 'thursday', label: 'Qui' },
                            { key: 'friday', label: 'Sex' },
                            { key: 'saturday', label: 'Sáb' },
                            { key: 'sunday', label: 'Dom' },
                          ].map(({ key, label }) => {
                            const selected = (form.workSchedule?.workDays || []).includes(key);
                            return (
                              <button key={key} type="button"
                                onClick={() => {
                                  const days = form.workSchedule?.workDays || [];
                                  const newDays = selected ? days.filter(d => d !== key) : [...days, key];
                                  setField('workSchedule', { ...form.workSchedule, workDays: newDays } as any);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Aba Documentos ── */}
              {formTab === 'documentos' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CTPS — Número</label>
                    <input value={form.ctpsNumero} onChange={e => setFieldUpper('ctpsNumero', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Número da carteira" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CTPS — Série</label>
                    <input value={form.ctpsSerie} onChange={e => setFieldUpper('ctpsSerie', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Série" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">PIS / PASEP</label>
                    <input value={form.pisPasep} onChange={e => setFieldUpper('pisPasep', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="000.00000.00-0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Título de Eleitor</label>
                    <input value={form.tituloEleitor} onChange={e => setFieldUpper('tituloEleitor', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Número do título" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Zona Eleitoral</label>
                    <input value={form.zonaEleitoral} onChange={e => setFieldUpper('zonaEleitoral', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Zona" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Seção Eleitoral</label>
                    <input value={form.secaoEleitoral} onChange={e => setFieldUpper('secaoEleitoral', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Seção" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cert. Militar / Reservista</label>
                    <input value={form.reservista} onChange={e => setFieldUpper('reservista', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Número do certificado" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CNH — Número</label>
                    <input value={form.cnhNumero} onChange={e => setFieldUpper('cnhNumero', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Número da CNH" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CNH — Categoria</label>
                    <select value={form.cnhCategoria} onChange={e => setField('cnhCategoria', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Selecione —</option>
                      {['A', 'B', 'AB', 'C', 'D', 'E'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CNH — Validade</label>
                    <input type="date" value={form.cnhValidade} onChange={e => setField('cnhValidade', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.name.trim() || saveMutation.isPending}
                className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FICHA COMPLETA ──────────────────────────────────────────── */}
      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4" id="employee-ficha-print">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 no-print">
              <h2 className="text-lg font-bold text-gray-800">Ficha do Funcionário</h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button onClick={() => setViewId(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Cabeçalho da ficha */}
              <div className="text-center border-b pb-4">
                <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                  {viewEmployee.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-800">{viewEmployee.name}</h3>
                <p className="text-sm text-gray-500">{[viewEmployee.cargo, viewEmployee.setor].filter(Boolean).join(' • ') || 'Sem cargo/setor definido'}</p>
                {viewEmployee.matricula && <p className="text-xs text-indigo-600 font-mono mt-1">Mat: {viewEmployee.matricula}</p>}
                <span className={`inline-block mt-2 text-xs px-3 py-0.5 rounded-full font-medium ${viewEmployee.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {viewEmployee.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {/* Seções da ficha */}
              {[
                {
                  title: '📋 Dados Pessoais', icon: User,
                  rows: [
                    ['CPF', viewEmployee.cpf], ['RG', viewEmployee.rg ? `${viewEmployee.rg}${viewEmployee.rgOrgao ? ` / ${viewEmployee.rgOrgao}` : ''}${viewEmployee.rgDataEmissao ? ` (${fmtDate(viewEmployee.rgDataEmissao)})` : ''}` : undefined],
                    ['Data de Nascimento', viewEmployee.dataNascimento ? fmtDate(viewEmployee.dataNascimento) : undefined],
                    ['Naturalidade', viewEmployee.naturalidade], ['Nacionalidade', viewEmployee.nacionalidade],
                    ['Sexo', viewEmployee.sexo === 'M' ? 'Masculino' : viewEmployee.sexo === 'F' ? 'Feminino' : viewEmployee.sexo],
                    ['Estado Civil', viewEmployee.estadoCivil], ['Tipo Sanguíneo', viewEmployee.tipoSanguineo],
                    ['Mãe', viewEmployee.nomeMae], ['Pai', viewEmployee.nomePai],
                  ],
                },
                {
                  title: '📞 Contato', icon: Phone,
                  rows: [
                    ['E-mail', viewEmployee.email], ['Celular', viewEmployee.celular], ['Telefone Fixo', viewEmployee.telefoneFixo],
                  ],
                },
                {
                  title: '📍 Endereço', icon: MapPin,
                  rows: [
                    ['Endereço', viewEmployee.logradouro ? `${viewEmployee.logradouro}, ${viewEmployee.numero || 'S/N'}${viewEmployee.complemento ? `, ${viewEmployee.complemento}` : ''}` : undefined],
                    ['Bairro', viewEmployee.bairro],
                    ['Cidade/UF', [viewEmployee.cidade, viewEmployee.estado].filter(Boolean).join('/') || undefined],
                    ['CEP', viewEmployee.cep],
                  ],
                },
                {
                  title: '💼 Dados Funcionais', icon: Briefcase,
                  rows: [
                    ['Cargo', viewEmployee.cargo], ['Setor', viewEmployee.setor],
                    ['Tipo de Contrato', viewEmployee.tipoContrato],
                    ['Início na Instituição', viewEmployee.dataInicioInstituicao ? fmtDate(viewEmployee.dataInicioInstituicao) : undefined],
                    ['Admissão', viewEmployee.dataAdmissao ? fmtDate(viewEmployee.dataAdmissao) : undefined],
                    ['Demissão', viewEmployee.dataDemissao ? fmtDate(viewEmployee.dataDemissao) : undefined],
                    ['Jornada', viewEmployee.jornadaTrabalho],
                    ['C/H Semanal', viewEmployee.cargaHorariaSemanal ? `${viewEmployee.cargaHorariaSemanal}h` : undefined],
                    ['Salário', viewEmployee.salario ? fmtCurrency(viewEmployee.salario) : undefined],
                  ],
                },
                {
                  title: '📄 Documentos', icon: FileText,
                  rows: [
                    ['CTPS', viewEmployee.ctpsNumero ? `${viewEmployee.ctpsNumero}${viewEmployee.ctpsSerie ? ` — Série ${viewEmployee.ctpsSerie}` : ''}` : undefined],
                    ['PIS/PASEP', viewEmployee.pisPasep],
                    ['Título de Eleitor', viewEmployee.tituloEleitor ? `${viewEmployee.tituloEleitor}${viewEmployee.zonaEleitoral ? ` — Zona ${viewEmployee.zonaEleitoral}` : ''}${viewEmployee.secaoEleitoral ? ` / Seção ${viewEmployee.secaoEleitoral}` : ''}` : undefined],
                    ['Reservista', viewEmployee.reservista],
                    ['CNH', viewEmployee.cnhNumero ? `${viewEmployee.cnhNumero}${viewEmployee.cnhCategoria ? ` — Cat. ${viewEmployee.cnhCategoria}` : ''}${viewEmployee.cnhValidade ? ` (Val: ${fmtDate(viewEmployee.cnhValidade)})` : ''}` : undefined],
                  ],
                },
              ].map(section => {
                const visible = section.rows.filter(([, v]) => v);
                if (!visible.length) return null;
                return (
                  <div key={section.title}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">{section.title}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      {visible.map(([label, value]) => (
                        <div key={label} className="flex gap-2 text-sm">
                          <span className="text-gray-400 min-w-[110px] flex-shrink-0">{label}:</span>
                          <span className="text-gray-800 font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {viewEmployee.observacoes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">📝 Observações</h4>
                  <p className="text-sm text-gray-600">{viewEmployee.observacoes}</p>
                </div>
              )}

              {/* Assinatura */}
              <div className="mt-8 grid grid-cols-2 gap-10 pt-6 border-t border-dashed border-gray-300">
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2 text-xs text-gray-500">Funcionário / Assinatura</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2 text-xs text-gray-500">Responsável / Direção</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #employee-report-print, #employee-report-print *,
          #employee-ficha-print, #employee-ficha-print * { visibility: visible !important; }
          #employee-report-print { position: fixed; top: 0; left: 0; width: 100%; }
          #employee-ficha-print { position: fixed; top: 0; left: 0; width: 100%; box-shadow: none; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>
    </div>
  );
}
