import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Users, Plus, Search, Pencil, Trash2, Printer, X, ChevronDown, ChevronUp,
  User, Phone, MapPin, Briefcase, FileText, BookOpen, Eye, Link2, Copy, CheckCheck,
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

// ─── Componente principal ────────────────────────────────────────────────────
export default function Employees() {
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Employee, '_id' | 'isActive'>>(EMPTY);
  const [formTab, setFormTab] = useState<FormTab>('pessoal');
  const [viewId, setViewId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'relatorio'>('lista');

  // ─── Link de convite ──────────────────────────────────────────────────────
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteEmployeeName, setInviteEmployeeName] = useState('');

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', showInactive],
    queryFn: async () => {
      const res = await api.get('/employees', {
        params: { isActive: showInactive ? undefined : true },
      });
      return res.data as Employee[];
    },
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
    onSuccess: (res, employeeId) => {
      const token = res.data.token;
      const base = window.location.origin + window.location.pathname;
      const url = `${base}#/employee-form/${token}`;
      setInviteLink(url);
      setInviteCopied(false);
      setInviteModalOpen(true);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao gerar link.'),
  });

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      setPendingDeleteId(id);
      return api.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      toast.success('Funcionário desativado.');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao desativar funcionário.'),
    onSettled: () => setPendingDeleteId(null),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => {
      setPendingReactivateId(id);
      return api.put(`/employees/${id}`, { isActive: true });
    },
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

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.matricula || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.cargo || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.setor || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.cpf || '').includes(search)
  );

  const viewEmployee = employees.find(e => e._id === viewId) || null;

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
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Mostrar inativos
            </label>
          </div>

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
                        onClick={e => { e.stopPropagation(); openEdit(emp); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-500"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {emp.isActive ? (
                        <button
                          onClick={e => { e.stopPropagation(); if (emp._id && confirm(`Desativar ${emp.name}?`)) deleteMutation.mutate(emp._id); }}
                          disabled={pendingDeleteId === emp._id}
                          className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
                          title="Desativar funcionário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); if (emp._id && confirm(`Reativar ${emp.name}?`)) reactivateMutation.mutate(emp._id); }}
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
          <div className="flex justify-end no-print">
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
              <p className="text-sm text-gray-500">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
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
