import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Palmtree, Plus, Search, Pencil, Trash2, X, Printer, FileText,
  ChevronDown, ChevronUp, User, CalendarDays, AlertCircle, BarChart2,
} from 'lucide-react';
import {
  loadPrintHeader, buildPrintHeaderHtml, printHeaderCss,
  printFooterCss, buildPrintFooterHtml,
} from '../utils/printHeader';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Employee {
  _id: string;
  name: string;
  cpf?: string;
  matricula?: string;
  cargo?: string;
  setor?: string;
  tipoContrato?: string;
  dataAdmissao?: string;
  isActive: boolean;
}

interface Ferias {
  _id: string;
  employeeId: string;
  nomeCompleto: string;
  cpf?: string;
  matricula?: string;
  cargo?: string;
  setor?: string;
  tipoContrato?: string;
  dataAdmissao?: string;
  anoReferencia: number;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  dataInicio: string;
  dataFim: string;
  diasFerias: number;
  diasAbono: number;
  dataAviso?: string;
  status: 'agendado' | 'em_gozo' | 'concluido' | 'cancelado';
  observacoes?: string;
}

interface FeriasForm {
  employeeId: string;
  nomeCompleto: string;
  cpf: string;
  matricula: string;
  cargo: string;
  setor: string;
  tipoContrato: string;
  dataAdmissao: string;
  anoReferencia: number;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  dataInicio: string;
  dataFim: string;
  diasFerias: number;
  diasAbono: number;
  dataAviso: string;
  status: 'agendado' | 'em_gozo' | 'concluido' | 'cancelado';
  observacoes: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  agendado:  { label: 'Agendado',  color: 'bg-blue-100 text-blue-800' },
  em_gozo:   { label: 'Em Gozo',   color: 'bg-green-100 text-green-800' },
  concluido: { label: 'Concluído', color: 'bg-gray-100 text-gray-800' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function calcDias(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  return Math.round(ms / 86400000) + 1;
}

const emptyForm = (): FeriasForm => ({
  employeeId: '',
  nomeCompleto: '',
  cpf: '',
  matricula: '',
  cargo: '',
  setor: '',
  tipoContrato: '',
  dataAdmissao: '',
  anoReferencia: new Date().getFullYear(),
  periodoAquisitivoInicio: '',
  periodoAquisitivoFim: '',
  dataInicio: '',
  dataFim: '',
  diasFerias: 30,
  diasAbono: 0,
  dataAviso: '',
  status: 'agendado',
  observacoes: '',
});

// ─── Componente Principal ────────────────────────────────────────────────────

export default function Ferias() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FeriasForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: ferias = [], isLoading } = useQuery<Ferias[]>({
    queryKey: ['ferias'],
    queryFn: () => api.get('/ferias').then(r => r.data),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-active'],
    queryFn: () => api.get('/employees?isActive=true').then(r => r.data),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: Partial<FeriasForm>) =>
      editingId
        ? api.put(`/ferias/${editingId}`, data).then(r => r.data)
        : api.post('/ferias', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ferias'] });
      toast.success(editingId ? 'Férias atualizadas!' : 'Férias cadastradas!');
      closeModal();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao salvar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ferias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ferias'] });
      toast.success('Registro excluído.');
    },
    onError: () => toast.error('Erro ao excluir.'),
  });

  // ── Auto-cálculo de dias ──────────────────────────────────────────────────
  useEffect(() => {
    if (form.dataInicio && form.dataFim) {
      const d = calcDias(form.dataInicio, form.dataFim);
      setForm(f => ({ ...f, diasFerias: d }));
    }
  }, [form.dataInicio, form.dataFim]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleEmployeeSelect(id: string) {
    const emp = employees.find(e => e._id === id);
    if (!emp) {
      setForm(f => ({ ...f, employeeId: id }));
      return;
    }
    setForm(f => ({
      ...f,
      employeeId: emp._id,
      nomeCompleto: emp.name,
      cpf: emp.cpf || '',
      matricula: emp.matricula || '',
      cargo: emp.cargo || '',
      setor: emp.setor || '',
      tipoContrato: emp.tipoContrato || '',
      dataAdmissao: emp.dataAdmissao || '',
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEdit(f: Ferias) {
    setEditingId(f._id);
    setForm({
      employeeId: f.employeeId,
      nomeCompleto: f.nomeCompleto,
      cpf: f.cpf || '',
      matricula: f.matricula || '',
      cargo: f.cargo || '',
      setor: f.setor || '',
      tipoContrato: f.tipoContrato || '',
      dataAdmissao: f.dataAdmissao || '',
      anoReferencia: f.anoReferencia,
      periodoAquisitivoInicio: f.periodoAquisitivoInicio,
      periodoAquisitivoFim: f.periodoAquisitivoFim,
      dataInicio: f.dataInicio,
      dataFim: f.dataFim,
      diasFerias: f.diasFerias,
      diasAbono: f.diasAbono,
      dataAviso: f.dataAviso || '',
      status: f.status,
      observacoes: f.observacoes || '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId) return toast.error('Selecione um funcionário.');
    if (!form.dataInicio || !form.dataFim) return toast.error('Informe as datas de gozo.');
    saveMutation.mutate(form);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir registro de férias de "${name}"?`)) return;
    deleteMutation.mutate(id);
  }

  // ── Filtro ────────────────────────────────────────────────────────────────
  const filtered = ferias.filter(f => {
    const matchSearch = !search || f.nomeCompleto.toLowerCase().includes(search.toLowerCase())
      || (f.matricula || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Impressão ─────────────────────────────────────────────────────────────
  async function printDocumento(f: Ferias, tipo: 'aviso' | 'termo') {
    const header = await loadPrintHeader();
    const headerHtml = buildPrintHeaderHtml(header);
    const footerHtml = buildPrintFooterHtml();
    const now = new Date();
    const dataEmissao = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const local = header.line3 || header.line2 || '';

    const localData = `${local ? local + ', ' : ''}${dataEmissao}`;

    const corpo = tipo === 'aviso'
      ? buildAvisoHtml(f, localData)
      : buildTermoHtml(f, localData);

    const win = window.open('', '_blank');
    if (!win) return toast.error('Permita pop-ups para imprimir.');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>${tipo === 'aviso' ? 'Aviso de Férias' : 'Termo de Férias'} — ${f.nomeCompleto}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #111; background: #fff; padding: 20mm 20mm 20mm 25mm; }
        ${printHeaderCss}
        ${printFooterCss}
        .doc-title { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
        .doc-body { line-height: 1.9; text-align: justify; margin-bottom: 18px; }
        .doc-body p { margin-bottom: 12px; }
        .campo { font-weight: bold; text-decoration: underline; }
        .assinaturas { display: flex; gap: 60px; justify-content: center; margin-top: 60px; flex-wrap: wrap; }
        .assinatura-bloco { text-align: center; min-width: 200px; }
        .assinatura-linha { border-top: 1px solid #333; margin: 0 auto 6px; width: 220px; }
        .assinatura-nome { font-size: 10pt; }
        .assinatura-cargo { font-size: 9pt; color: #555; }
        @media print { body { padding: 15mm; } }
      </style>
    </head><body>
      ${headerHtml}
      ${corpo}
      ${footerHtml}
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  function buildAvisoHtml(f: Ferias, localData: string): string {
    return `
      <div class="doc-title">Aviso de Férias</div>
      <div class="doc-body">
        <p>Comunicamos ao(à) servidor(a) / funcionário(a) <span class="campo">${f.nomeCompleto}</span>,
        ${f.cargo ? `ocupante do cargo de <span class="campo">${f.cargo}</span>,` : ''}
        ${f.matricula ? `matrícula n.º <span class="campo">${f.matricula}</span>,` : ''}
        ${f.cpf ? `CPF <span class="campo">${f.cpf}</span>,` : ''}
        que suas férias regulamentares referentes ao período aquisitivo de
        <span class="campo">${formatDate(f.periodoAquisitivoInicio)}</span> a
        <span class="campo">${formatDate(f.periodoAquisitivoFim)}</span>
        (Ano de Referência: <span class="campo">${f.anoReferencia}</span>)
        foram programadas para o período de
        <span class="campo">${formatDate(f.dataInicio)}</span> a
        <span class="campo">${formatDate(f.dataFim)}</span>,
        totalizando <span class="campo">${f.diasFerias} (${porExtenso(f.diasFerias)}) dias</span> de férias.
        ${f.diasAbono > 0 ? `Haverá ainda a conversão de <span class="campo">${f.diasAbono} dias</span> em abono pecuniário (venda de 1/3), conforme solicitação do servidor.` : ''}
        </p>
        <p>Nos termos do art. 135 da CLT / legislação aplicável, este aviso é concedido com antecedência mínima de 30 (trinta) dias do início do período de gozo.</p>
        <p>Por ser verdade, firmamos o presente Aviso de Férias em duas vias de igual teor e forma.</p>
        <p style="text-align:right; margin-top: 10px;">${localData}</p>
      </div>
      <div class="assinaturas">
        <div class="assinatura-bloco">
          <div class="assinatura-linha"></div>
          <div class="assinatura-nome">${f.nomeCompleto}</div>
          <div class="assinatura-cargo">Funcionário(a) — Ciente</div>
        </div>
        <div class="assinatura-bloco">
          <div class="assinatura-linha"></div>
          <div class="assinatura-nome">Diretor(a) / Responsável</div>
          <div class="assinatura-cargo">Unidade Escolar</div>
        </div>
      </div>
    `;
  }

  function buildTermoHtml(f: Ferias, localData: string): string {
    return `
      <div class="doc-title">Termo de Concessão de Férias</div>
      <div class="doc-body">
        <p>Pelo presente Termo, a Unidade Escolar <strong>(${localData})</strong> concede ao(à)
        servidor(a) / funcionário(a) <span class="campo">${f.nomeCompleto}</span>,
        ${f.cargo ? `cargo: <span class="campo">${f.cargo}</span>,` : ''}
        ${f.setor ? `setor: <span class="campo">${f.setor}</span>,` : ''}
        ${f.matricula ? `matrícula n.º <span class="campo">${f.matricula}</span>,` : ''}
        ${f.cpf ? `CPF <span class="campo">${f.cpf}</span>,` : ''}
        ${f.tipoContrato ? `regime: <span class="campo">${f.tipoContrato}</span>,` : ''}
        ${f.dataAdmissao ? `admitido(a) em <span class="campo">${formatDate(f.dataAdmissao)}</span>,` : ''}
        as férias regulamentares a que faz jus, referentes ao período aquisitivo de
        <span class="campo">${formatDate(f.periodoAquisitivoInicio)}</span> a
        <span class="campo">${formatDate(f.periodoAquisitivoFim)}</span>
        (Ano de Referência: <span class="campo">${f.anoReferencia}</span>).</p>

        <p>Período de gozo: de <span class="campo">${formatDate(f.dataInicio)}</span> a
        <span class="campo">${formatDate(f.dataFim)}</span>, correspondendo a
        <span class="campo">${f.diasFerias} (${porExtenso(f.diasFerias)}) dias corridos</span> de férias.
        ${f.diasAbono > 0 ? `Conversão de <span class="campo">${f.diasAbono} dias</span> em abono pecuniário conforme solicitação.` : ''}
        </p>

        ${f.dataAviso ? `<p>Aviso de férias comunicado em: <span class="campo">${formatDate(f.dataAviso)}</span>.</p>` : ''}

        ${f.observacoes ? `<p><strong>Observações:</strong> ${f.observacoes}</p>` : ''}

        <p>O(A) funcionário(a) deverá retornar ao trabalho no dia útil seguinte ao término do período de gozo,
        sob pena de configurar falta injustificada, salvo disposição legal em contrário.</p>

        <p>Por ser expressão da verdade, as partes firmam o presente Termo em duas vias de igual teor.</p>
        <p style="text-align:right; margin-top: 10px;">${localData}</p>
      </div>
      <div class="assinaturas">
        <div class="assinatura-bloco">
          <div class="assinatura-linha"></div>
          <div class="assinatura-nome">${f.nomeCompleto}</div>
          <div class="assinatura-cargo">Funcionário(a)</div>
        </div>
        <div class="assinatura-bloco">
          <div class="assinatura-linha"></div>
          <div class="assinatura-nome">Diretor(a) / Responsável</div>
          <div class="assinatura-cargo">Unidade Escolar</div>
        </div>
      </div>
    `;
  }

  // ── Relatório geral ─────────────────────────────────────────────────────
  async function printRelatorio() {
    const header = await loadPrintHeader();
    const headerHtml = buildPrintHeaderHtml(header);
    const footerHtml = buildPrintFooterHtml();
    const now = new Date();
    const dataEmissao = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

    // Usa os registros visíveis no filtro atual
    const lista = filtered.slice().sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));

    // Contadores
    const total = lista.length;
    const porStatus = {
      agendado: lista.filter(f => f.status === 'agendado').length,
      em_gozo:  lista.filter(f => f.status === 'em_gozo').length,
      concluido: lista.filter(f => f.status === 'concluido').length,
      cancelado: lista.filter(f => f.status === 'cancelado').length,
    };
    const totalDias = lista.reduce((s, f) => s + (f.diasFerias || 0), 0);

    const linhas = lista.map((f, i) => `
      <tr class="${i % 2 === 0 ? 'par' : 'impar'}">
        <td>${i + 1}</td>
        <td>${f.nomeCompleto}</td>
        <td>${f.matricula || '—'}</td>
        <td>${f.cargo || '—'}</td>
        <td>${f.setor || '—'}</td>
        <td>${f.anoReferencia}</td>
        <td>${formatDate(f.dataInicio)}</td>
        <td>${formatDate(f.dataFim)}</td>
        <td style="text-align:center">${f.diasFerias}</td>
        <td style="text-align:center">${f.diasAbono > 0 ? f.diasAbono : '—'}</td>
        <td><span class="status-badge status-${f.status}">${STATUS_LABEL[f.status].label}</span></td>
      </tr>
    `).join('');

    const win = window.open('', '_blank');
    if (!win) return toast.error('Permita pop-ups para imprimir.');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Relatório de Férias — ${dataEmissao}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; background: #fff; padding: 15mm 15mm 15mm 20mm; }
        ${printHeaderCss}
        ${printFooterCss}
        h2 { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase;
             letter-spacing: 1px; margin: 18px 0 4px; color: #1e3a5f; }
        .subtitulo { text-align: center; font-size: 9pt; color: #555; margin-bottom: 16px; }
        .resumo { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; justify-content: center; }
        .resumo-card { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 16px;
                       text-align: center; min-width: 100px; }
        .resumo-card .num { font-size: 18pt; font-weight: bold; color: #1e3a5f; }
        .resumo-card .leg { font-size: 8pt; color: #555; }
        table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
        th { background: #1e3a5f; color: #fff; padding: 6px 5px; text-align: left; }
        td { padding: 5px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
        tr.par { background: #fff; }
        tr.impar { background: #f0f4ff; }
        .status-badge { display: inline-block; padding: 1px 7px; border-radius: 9px; font-size: 8pt; font-weight: bold; }
        .status-agendado  { background: #dbeafe; color: #1e40af; }
        .status-em_gozo   { background: #dcfce7; color: #166534; }
        .status-concluido { background: #f3f4f6; color: #374151; }
        .status-cancelado { background: #fee2e2; color: #991b1b; }
        @media print { body { padding: 10mm; } }
      </style>
    </head><body>
      ${headerHtml}
      <h2>Relatório de Controle de Férias</h2>
      <p class="subtitulo">Emitido em ${dataEmissao}${search || filterStatus ? ' · Filtro ativo' : ''}</p>
      <div class="resumo">
        <div class="resumo-card"><div class="num">${total}</div><div class="leg">Total de Registros</div></div>
        <div class="resumo-card"><div class="num">${porStatus.agendado}</div><div class="leg">Agendados</div></div>
        <div class="resumo-card"><div class="num">${porStatus.em_gozo}</div><div class="leg">Em Gozo</div></div>
        <div class="resumo-card"><div class="num">${porStatus.concluido}</div><div class="leg">Concluídos</div></div>
        <div class="resumo-card"><div class="num">${porStatus.cancelado}</div><div class="leg">Cancelados</div></div>
        <div class="resumo-card"><div class="num">${totalDias}</div><div class="leg">Total de Dias</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Nome</th><th>Matrícula</th><th>Cargo</th><th>Setor</th>
            <th>Ano Ref.</th><th>Início Gozo</th><th>Fim Gozo</th>
            <th>Dias</th><th>Abono</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      ${footerHtml}
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 p-2 rounded-lg">
            <Palmtree className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Controle de Férias</h1>
            <p className="text-sm text-gray-500">Funcionários e professores</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={printRelatorio}
            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <BarChart2 className="w-4 h-4" /> Relatório
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Registro
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm text-gray-700"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none"
        >
          <option value="">Todos os status</option>
          <option value="agendado">Agendado</option>
          <option value="em_gozo">Em Gozo</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Palmtree className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum registro de férias encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const st = STATUS_LABEL[f.status];
            const expanded = expandedId === f._id;
            return (
              <div key={f._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* linha principal */}
                <div className="flex items-center justify-between p-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-teal-100 p-2 rounded-lg shrink-0">
                      <User className="w-5 h-5 text-teal-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{f.nomeCompleto}</p>
                      <p className="text-xs text-gray-500">
                        {f.cargo || '—'}{f.matricula ? ` · Matrícula ${f.matricula}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      {formatDate(f.dataInicio)} → {formatDate(f.dataFim)} ({f.diasFerias} dias)
                    </span>
                    <button onClick={() => setExpandedId(expanded ? null : f._id)} className="text-gray-400 hover:text-gray-600">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(f)} className="text-blue-500 hover:text-blue-700 p-1">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(f._id, f.nomeCompleto)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* detalhe expandido */}
                {expanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                      <InfoCell label="CPF" value={f.cpf} />
                      <InfoCell label="Setor" value={f.setor} />
                      <InfoCell label="Contrato" value={f.tipoContrato} />
                      <InfoCell label="Admissão" value={formatDate(f.dataAdmissao)} />
                      <InfoCell label="Ano Ref." value={String(f.anoReferencia)} />
                      <InfoCell label="Per. Aquisitivo" value={`${formatDate(f.periodoAquisitivoInicio)} a ${formatDate(f.periodoAquisitivoFim)}`} />
                      <InfoCell label="Dias Abono" value={f.diasAbono > 0 ? String(f.diasAbono) : '—'} />
                      <InfoCell label="Aviso em" value={formatDate(f.dataAviso)} />
                    </div>
                    {f.observacoes && (
                      <p className="text-xs text-gray-500 mb-4 italic">Obs.: {f.observacoes}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => printDocumento(f, 'aviso')}
                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Printer className="w-4 h-4" /> Aviso de Férias
                      </button>
                      <button
                        onClick={() => printDocumento(f, 'termo')}
                        className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        <FileText className="w-4 h-4" /> Termo de Férias
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-teal-600" />
                {editingId ? 'Editar Férias' : 'Novo Registro de Férias'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Seleção do funcionário */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Funcionário</h3>
                <div className="mb-3">
                  <label className="text-xs text-gray-500 block mb-1">Selecionar funcionário *</label>
                  <select
                    value={form.employeeId}
                    onChange={e => handleEmployeeSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                  >
                    <option value="">— Selecione —</option>
                    {employees.map(e => (
                      <option key={e._id} value={e._id}>{e.name}{e.matricula ? ` (${e.matricula})` : ''}</option>
                    ))}
                  </select>
                </div>

                {form.employeeId && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                    <FieldRow label="Nome" value={form.nomeCompleto} />
                    <FieldRow label="CPF" value={form.cpf} />
                    <FieldRow label="Matrícula" value={form.matricula} />
                    <FieldRow label="Cargo" value={form.cargo} />
                    <FieldRow label="Setor" value={form.setor} />
                    <FieldRow label="Contrato" value={form.tipoContrato} />
                    <FieldRow label="Admissão" value={formatDate(form.dataAdmissao)} />
                  </div>
                )}

                {form.employeeId && (
                  <p className="text-xs text-teal-600 flex items-center gap-1 mt-2">
                    <AlertCircle className="w-3 h-3" />
                    Dados preenchidos automaticamente do cadastro do funcionário.
                  </p>
                )}
              </section>

              {/* Período aquisitivo */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Período Aquisitivo</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Ano de Referência *</label>
                    <input type="number" min={2000} max={2099}
                      value={form.anoReferencia}
                      onChange={e => setForm(f => ({ ...f, anoReferencia: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Início Aquisitivo *</label>
                    <input type="date"
                      value={form.periodoAquisitivoInicio}
                      onChange={e => setForm(f => ({ ...f, periodoAquisitivoInicio: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Fim Aquisitivo *</label>
                    <input type="date"
                      value={form.periodoAquisitivoFim}
                      onChange={e => setForm(f => ({ ...f, periodoAquisitivoFim: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </section>

              {/* Gozo */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Período de Gozo</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Início do Gozo *</label>
                    <input type="date"
                      value={form.dataInicio}
                      onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Fim do Gozo *</label>
                    <input type="date"
                      value={form.dataFim}
                      onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Dias de Férias (calculado)</label>
                    <input type="number"
                      value={form.diasFerias}
                      onChange={e => setForm(f => ({ ...f, diasFerias: Number(e.target.value) }))}
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Dias de Abono Pecuniário (0–10)</label>
                    <input type="number" min={0} max={10}
                      value={form.diasAbono}
                      onChange={e => setForm(f => ({ ...f, diasAbono: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </section>

              {/* Aviso e status */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Aviso e Status</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Data do Aviso</label>
                    <input type="date"
                      value={form.dataAviso}
                      onChange={e => setForm(f => ({ ...f, dataAviso: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as FeriasForm['status'] }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    >
                      <option value="agendado">Agendado</option>
                      <option value="em_gozo">Em Gozo</option>
                      <option value="concluido">Concluído</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-500 block mb-1">Observações</label>
                  <textarea rows={2}
                    value={form.observacoes}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
                  />
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saveMutation.isPending}
                  className="px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}: </span>
      <span className="text-xs font-medium text-gray-700">{value || '—'}</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex gap-1">
      <span className="text-teal-700 font-medium">{label}:</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

// ─── Número por extenso (1–31) ───────────────────────────────────────────────
function porExtenso(n: number): string {
  const map: Record<number, string> = {
    1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',
    8:'oito',9:'nove',10:'dez',11:'onze',12:'doze',13:'treze',
    14:'quatorze',15:'quinze',16:'dezesseis',17:'dezessete',18:'dezoito',
    19:'dezenove',20:'vinte',21:'vinte e um',22:'vinte e dois',
    23:'vinte e três',24:'vinte e quatro',25:'vinte e cinco',
    26:'vinte e seis',27:'vinte e sete',28:'vinte e oito',
    29:'vinte e nove',30:'trinta',31:'trinta e um',
  };
  return map[n] ?? String(n);
}
