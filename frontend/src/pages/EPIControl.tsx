/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Página: Controle de EPIs
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import {
  Shield, Plus, Pencil, Trash2, Printer, Search, RefreshCw,
  AlertTriangle, CheckCircle, X, Save, FileText,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Employee {
  _id: string; id?: string; name: string; cargo?: string; setor?: string;
}

interface EpiRecord {
  _id?: string; id?: string;
  employeeId: string;
  employeeName: string;
  cargo?: string;
  setor?: string;
  epiType: string;
  epiDescription?: string;
  quantity: number;
  caNumber?: string;
  brand?: string;
  deliveryDate: string;
  expirationDate?: string;
  nextInspectionDate?: string;
  returnDate?: string;
  condition: string;
  signedReceipt: boolean;
  observations?: string;
  isActive: boolean;
}

const EMPTY_EPI: Omit<EpiRecord, '_id' | 'id' | 'isActive'> = {
  employeeId: '', employeeName: '', cargo: '', setor: '',
  epiType: '', epiDescription: '', quantity: 1,
  caNumber: '', brand: '', deliveryDate: '',
  expirationDate: '', nextInspectionDate: '', returnDate: '',
  condition: 'novo', signedReceipt: false, observations: '',
};

const EPI_TYPES = [
  'Capacete de Segurança', 'Luva de Borracha', 'Luva de Couro', 'Luva de Malha de Aço',
  'Óculos de Proteção', 'Protetor Facial', 'Protetor Auditivo (Fone)', 'Protetor Auditivo (Plug)',
  'Bota de Segurança', 'Bota Impermeável', 'Sapato de Segurança',
  'Cinto de Segurança', 'Trava-quedas', 'Capa de Chuva',
  'Uniforme de Trabalho', 'Avental de PVC', 'Colete Refletivo',
  'Máscara PFF2', 'Máscara Respiratória', 'Respirador',
  'Luva de Procedimento', 'Óculos de Solda', 'Protetor de Coluna',
  'Creme de Proteção Dermatológica', 'Calça de Trabalho', 'Camisa de Manga Longa',
  'Outros',
];

// ─── Componente: campo de busca/seleção ──────────────────────────────────────
function SearchableSelect({
  label, value, onChange, options, placeholder, required = false,
}: {
  label: string;
  value: string;
  onChange: (val: string, label?: string) => void;
  options: { value: string; label: string; sub?: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() =>
    options.filter(o =>
      !query || o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.sub && o.sub.toLowerCase().includes(query.toLowerCase()))
    ), [options, query]);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-semibold mb-1">{label}{required && ' *'}</label>
      <div
        className="input w-full flex items-center gap-2 cursor-pointer"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        <Search size={14} className="text-gray-400 shrink-0" />
        {open ? (
          <input
            ref={inputRef}
            className="flex-1 outline-none bg-transparent text-sm"
            placeholder={placeholder || 'Digite para buscar...'}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${selectedLabel ? 'text-gray-800' : 'text-gray-400'}`}>
            {selectedLabel || placeholder || 'Selecione...'}
          </span>
        )}
        {value && (
          <button type="button" className="text-gray-400 hover:text-red-500" onClick={e => { e.stopPropagation(); onChange('', ''); setQuery(''); }}>
            <X size={14} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.map(o => (
            <button
              key={o.value}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex flex-col ${o.value === value ? 'bg-blue-100 font-semibold' : ''}`}
              onClick={() => { onChange(o.value, o.label); setQuery(''); setOpen(false); }}
            >
              <span>{o.label}</span>
              {o.sub && <span className="text-xs text-gray-400">{o.sub}</span>}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-3 text-sm text-gray-400">
          Nenhum resultado encontrado.
        </div>
      )}
    </div>
  );
}

const CONDITION_OPTS = [
  { value: 'novo',       label: 'Novo',        color: 'bg-green-100 text-green-800' },
  { value: 'bom',        label: 'Bom',         color: 'bg-blue-100 text-blue-800' },
  { value: 'desgastado', label: 'Desgastado',  color: 'bg-yellow-100 text-yellow-800' },
  { value: 'danificado', label: 'Danificado',  color: 'bg-orange-100 text-orange-800' },
  { value: 'vencido',    label: 'Vencido',     color: 'bg-red-100 text-red-800' },
  { value: 'devolvido',  label: 'Devolvido',   color: 'bg-gray-100 text-gray-700' },
];

const TODAY = new Date().toISOString().split('T')[0];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function daysUntil(d?: string) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d + 'T12:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function EPIControlPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const schoolName = user?.schoolName || user?.name || 'Escola';

  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EpiRecord | null>(null);
  const [form, setForm] = useState<Omit<EpiRecord, '_id' | 'id' | 'isActive'>>(EMPTY_EPI);

  // ── Entrega em Lote ──────────────────────────────────────────────────────────
  const [batchMode, setBatchMode] = useState(false);
  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
  const [selectedEpis, setSelectedEpis] = useState<Set<string>>(new Set());
  const [empSearch, setEmpSearch] = useState('');
  const [epiSearch, setEpiSearch] = useState('');
  const [batchForm, setBatchForm] = useState({
    deliveryDate: TODAY,
    condition: 'novo',
    caNumber: '',
    brand: '',
    quantity: 1,
    signedReceipt: false,
    observations: '',
  });

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { isActive: true } });
      return (res.data as any[]).map((e: any) => ({ ...e, _id: e._id || e.id || '' }));
    },
  });

  const { data: records = [], isLoading, refetch } = useQuery<EpiRecord[]>({
    queryKey: ['epi-control'],
    queryFn: async () => {
      const res = await api.get('/epi-control');
      return (res.data as any[]).map((r: any) => ({ ...r, _id: r._id || r.id || '' }));
    },
  });

  const { data: expiring = [] } = useQuery<EpiRecord[]>({
    queryKey: ['epi-expiring'],
    queryFn: async () => {
      const res = await api.get('/epi-control/expiring/soon');
      return res.data;
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.employeeId || !form.epiType || !form.deliveryDate) {
        throw new Error('Funcionário, tipo de EPI e data de entrega são obrigatórios.');
      }
      if (editing?._id) {
        return api.put(`/epi-control/${editing._id}`, form);
      }
      return api.post('/epi-control', form);
    },
    onSuccess: () => {
      toast.success(editing ? 'EPI atualizado!' : 'EPI registrado!');
      qc.invalidateQueries({ queryKey: ['epi-control'] });
      qc.invalidateQueries({ queryKey: ['epi-expiring'] });
      setShowModal(false);
      setEditing(null);
      setForm(EMPTY_EPI);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/epi-control/${id}`),
    onSuccess: () => {
      toast.success('Registro removido.');
      qc.invalidateQueries({ queryKey: ['epi-control'] });
      qc.invalidateQueries({ queryKey: ['epi-expiring'] });
    },
    onError: () => toast.error('Erro ao remover.'),
  });

  const batchMutation = useMutation({
    mutationFn: async (records: Omit<EpiRecord, '_id' | 'id' | 'isActive'>[]) =>
      Promise.all(records.map(r => api.post('/epi-control', r))),
    onSuccess: (_, variables) => {
      toast.success(`${variables.length} registro(s) de EPI criado(s) com sucesso!`);
      qc.invalidateQueries({ queryKey: ['epi-control'] });
      qc.invalidateQueries({ queryKey: ['epi-expiring'] });
      setBatchMode(false);
      setSelectedEmps(new Set());
      setSelectedEpis(new Set());
      setBatchForm({ deliveryDate: TODAY, condition: 'novo', caNumber: '', brand: '', quantity: 1, signedReceipt: false, observations: '' });
    },
    onError: () => toast.error('Erro ao salvar registros em lote.'),
  });

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_EPI);
    setShowModal(true);
  };

  const openEdit = (r: EpiRecord) => {
    setEditing(r);
    setForm({
      employeeId: r.employeeId, employeeName: r.employeeName, cargo: r.cargo || '', setor: r.setor || '',
      epiType: r.epiType, epiDescription: r.epiDescription || '', quantity: r.quantity,
      caNumber: r.caNumber || '', brand: r.brand || '', deliveryDate: r.deliveryDate,
      expirationDate: r.expirationDate || '', nextInspectionDate: r.nextInspectionDate || '',
      returnDate: r.returnDate || '', condition: r.condition, signedReceipt: r.signedReceipt,
      observations: r.observations || '',
    });
    setShowModal(true);
  };

  const onEmployeeChange = (id: string) => {
    const emp = employees.find(e => e._id === id || e.id === id);
    setForm(f => ({
      ...f,
      employeeId: id,
      employeeName: emp?.name || '',
      cargo: emp?.cargo || '',
      setor: emp?.setor || '',
    }));
  };

  const employeeOptions = useMemo(() =>
    employees.map(e => ({
      value: e._id || e.id || '',
      label: e.name,
      sub: [e.cargo, e.setor].filter(Boolean).join(' · '),
    })), [employees]);

  const epiTypeOptions = useMemo(() =>
    EPI_TYPES.map(t => ({ value: t, label: t })), []);

  const filtered = useMemo(() => records.filter(r => {
    const matchSearch = !search ||
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.epiType.toLowerCase().includes(search.toLowerCase());
    const matchCond = !filterCondition || r.condition === filterCondition;
    return matchSearch && matchCond;
  }), [records, search, filterCondition]);

  const filteredBatchEmps = useMemo(() =>
    employees.filter(e =>
      !empSearch || e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      (e.cargo || '').toLowerCase().includes(empSearch.toLowerCase()) ||
      (e.setor || '').toLowerCase().includes(empSearch.toLowerCase())
    ), [employees, empSearch]);

  const filteredBatchEpis = useMemo(() =>
    EPI_TYPES.filter(t =>
      !epiSearch || t.toLowerCase().includes(epiSearch.toLowerCase())
    ), [epiSearch]);

  // ─── IMPRESSÃO: Recibo de entrega de EPI ─────────────────────────────────────
  const printReceipt = (r: EpiRecord) => {
    const now = new Date().toLocaleString('pt-BR');
    const today = new Date().toLocaleDateString('pt-BR');

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><title>Recibo de EPI</title>
<style>
  @page { size: A4 portrait; margin: 18mm 18mm 22mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; line-height: 1.6; }
  .school { text-align: center; font-size: 13px; font-weight: 900; color: #d97706; margin-bottom: 4px; }
  .doc-title { text-align: center; font-size: 14px; font-weight: 900; text-transform: uppercase;
    border-bottom: 2px solid #d97706; padding-bottom: 6px; margin-bottom: 14px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
  .field { margin-bottom: 6px; }
  .label { font-weight: bold; color: #374151; }
  .body-text { margin: 14px 0; text-align: justify; line-height: 1.8; }
  .legal { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 8px 12px;
    margin: 12px 0; font-size: 10px; }
  .sign-area { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .sign-box { text-align: center; }
  .sign-line { border-top: 1px solid #374151; margin-top: 28px; padding-top: 4px; font-size: 10px; }
  .footer { margin-top: 16px; border-top: 1px solid #d1d5db; padding-top: 4px;
    display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>

<div class="school">${schoolName}</div>
<div class="doc-title">Ficha de Entrega de EPI — Comprovante de Recebimento</div>

<div class="grid">
  <div class="field"><span class="label">Funcionário(a): </span>${r.employeeName}</div>
  <div class="field"><span class="label">Matrícula/CPF: </span>—</div>
  <div class="field"><span class="label">Cargo: </span>${r.cargo || '—'}</div>
  <div class="field"><span class="label">Setor: </span>${r.setor || '—'}</div>
</div>

<div style="border:1px solid #d1d5db;border-radius:4px;padding:10px;margin-bottom:12px">
  <div class="field"><span class="label">EPI Entregue: </span><strong>${r.epiType}</strong></div>
  ${r.epiDescription ? `<div class="field"><span class="label">Descrição: </span>${r.epiDescription}</div>` : ''}
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
    <div class="field"><span class="label">Qtd: </span>${r.quantity}</div>
    ${r.caNumber ? `<div class="field"><span class="label">Nº CA: </span>${r.caNumber}</div>` : ''}
    ${r.brand ? `<div class="field"><span class="label">Marca: </span>${r.brand}</div>` : ''}
    <div class="field"><span class="label">Data de Entrega: </span>${fmtDate(r.deliveryDate)}</div>
    ${r.expirationDate ? `<div class="field"><span class="label">Validade: </span>${fmtDate(r.expirationDate)}</div>` : ''}
    ${r.nextInspectionDate ? `<div class="field"><span class="label">Próx. Inspeção: </span>${fmtDate(r.nextInspectionDate)}</div>` : ''}
  </div>
</div>

<div class="body-text">
  <p>Declaro, para os devidos fins, que recebi o(s) Equipamento(s) de Proteção Individual (EPI) descrito(s) acima, em perfeito estado de conservação, e comprometo-me a:</p><br>
  <ul style="list-style:disc;padding-left:20px;margin-top:4px">
    <li>Utilizar o EPI somente para a finalidade a que se destina;</li>
    <li>Responsabilizar-me pela guarda e conservação do equipamento;</li>
    <li>Comunicar ao empregador qualquer alteração que o torne impróprio para uso;</li>
    <li>Cumprir as determinações do empregador sobre o uso adequado (NR-6, Lei 6.514/77).</li>
  </ul>
</div>

<div class="legal">
  <strong>Base Legal:</strong> NR-6 (Equipamentos de Proteção Individual), CLT Art. 157, CLT Art. 158, Lei 6.514/77.
  O empregado tem <strong>obrigação de usar o EPI</strong> fornecido pelo empregador; a recusa injustificada constitui infração disciplinar.
</div>

${r.observations ? `<div class="field"><span class="label">Observações: </span>${r.observations}</div>` : ''}

<div class="sign-area">
  <div class="sign-box">
    <div class="sign-line">Assinatura do(a) Funcionário(a)<br><strong>${r.employeeName}</strong><br>Data: ${today}</div>
  </div>
  <div class="sign-box">
    <div class="sign-line">Responsável pela Entrega / RH<br><strong>${schoolName}</strong><br>Data: ${today}</div>
  </div>
</div>

<div class="footer">
  <span>© 2025 Wander Pires Silva Coelho · wanderpsc@gmail.com · Sistema Criador de Horário de Aula Escolar</span>
  <span>Gerado em ${now}</span>
</div>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus(); iframe.contentWindow?.print();
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 2000);
    }, 600);
  };

  // ─── IMPRESSÃO: Termo de Recebimento de EPIs ──────────────────────────────────
  const printTermoRecebimento = (empId: string) => {
    const empRecords = records.filter(r => r.employeeId === empId && r.isActive !== false);
    if (empRecords.length === 0) {
      toast.error('Nenhum EPI encontrado para este funcionário.');
      return;
    }
    const emp = empRecords[0];
    const now = new Date().toLocaleString('pt-BR');
    const today = new Date().toLocaleDateString('pt-BR');
    const docNum = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(empRecords.length).padStart(3, '0')}`;

    const itemRows = empRecords.map((r, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td><strong>${r.epiType}</strong>${r.epiDescription ? `<br><span style="font-size:8px;color:#555">${r.epiDescription}</span>` : ''}</td>
        <td style="text-align:center">${r.caNumber || '—'}</td>
        <td style="text-align:center">${r.brand || '—'}</td>
        <td style="text-align:center">${r.quantity}</td>
        <td style="text-align:center">${fmtDate(r.deliveryDate)}</td>
        <td style="text-align:center">${r.expirationDate ? fmtDate(r.expirationDate) : '—'}</td>
        <td style="text-align:center">${CONDITION_OPTS.find(c => c.value === r.condition)?.label || r.condition}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><title>Termo de Recebimento de EPIs</title>
<style>
  @page { size: A4 portrait; margin: 20mm 18mm 22mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; line-height: 1.6; }

  .header { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px double #000; }
  .school-name { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .school-sub { font-size: 10px; color: #555; margin-top: 2px; }
  .doc-title { display: inline-block; font-size: 12px; font-weight: 900; margin-top: 10px;
    text-transform: uppercase; letter-spacing: 0.5px; border: 2px solid #111; padding: 5px 20px; }
  .doc-meta { font-size: 9px; color: #666; margin-top: 6px; }

  .section { margin: 12px 0; }
  .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase;
    background: #ddd; padding: 3px 8px; margin-bottom: 8px; border-left: 4px solid #555; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .field { display: flex; gap: 4px; align-items: baseline; }
  .field-label { font-weight: bold; white-space: nowrap; min-width: 90px; font-size: 10px; }
  .field-value { flex: 1; border-bottom: 1px solid #555; padding-bottom: 1px; font-size: 10px; }

  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th { background: #333; color: #fff; padding: 5px 5px; text-align: center; }
  td { border: 1px solid #bbb; padding: 4px 5px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f5f5f5; }

  .declaration { border: 1px solid #888; padding: 10px 12px; text-align: justify;
    font-size: 10px; line-height: 1.9; background: #fafafa; }
  .declaration ol { padding-left: 18px; margin-top: 6px; }
  .declaration li { margin-bottom: 2px; }

  .sign-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; }
  .sign-box { text-align: center; }
  .sign-line { border-top: 1.5px solid #333; padding-top: 6px; font-size: 10px; line-height: 1.8; }
  .sign-blank { height: 48px; }

  .legal { margin-top: 14px; font-size: 9px; color: #666; border-top: 1px dashed #aaa; padding-top: 6px; }
  .footer { margin-top: 14px; border-top: 1px solid #ccc; padding-top: 6px;
    display: flex; justify-content: space-between; font-size: 8px; color: #999; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>

<div class="header">
  <div class="school-name">${schoolName}</div>
  <div class="school-sub">Gestão de Pessoal · Controle de EPIs · NR-6</div>
  <div class="doc-title">Termo de Recebimento de Equipamentos de Proteção Individual</div>
  <div class="doc-meta">Nº ${docNum} &nbsp;|&nbsp; Data de Emissão: ${today}</div>
</div>

<div class="section">
  <div class="section-title">I — Identificação do Funcionário</div>
  <div class="info-grid">
    <div class="field"><span class="field-label">Nome:</span><span class="field-value">&nbsp;${emp.employeeName}</span></div>
    <div class="field"><span class="field-label">CPF / Matrícula:</span><span class="field-value">&nbsp;</span></div>
    <div class="field"><span class="field-label">Cargo:</span><span class="field-value">&nbsp;${emp.cargo || ''}</span></div>
    <div class="field"><span class="field-label">Setor / Turno:</span><span class="field-value">&nbsp;${emp.setor || ''}</span></div>
    <div class="field"><span class="field-label">Instituição:</span><span class="field-value">&nbsp;${schoolName}</span></div>
    <div class="field"><span class="field-label">Data de Admissão:</span><span class="field-value">&nbsp;</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">II — Equipamentos de Proteção Individual Recebidos</div>
  <table>
    <thead><tr>
      <th>#</th>
      <th style="text-align:left">Equipamento (EPI)</th>
      <th>Nº CA</th>
      <th>Marca / Fabricante</th>
      <th>Qtd</th>
      <th>Data de Entrega</th>
      <th>Validade</th>
      <th>Estado</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">III — Declaração de Recebimento e Compromisso</div>
  <div class="declaration">
    <p>Eu, <strong>${emp.employeeName}</strong>, portador(a) do cargo de <strong>${emp.cargo || '_______________'}</strong>,
    vinculado(a) ao setor <strong>${emp.setor || '_______________'}</strong> da instituição
    <strong>${schoolName}</strong>, declaro para os devidos fins legais que recebi, na data indicada no Quadro II acima,
    os Equipamentos de Proteção Individual (EPIs) nele discriminados, em perfeitas condições de uso, e me comprometo a:</p>
    <ol>
      <li>Utilizar o EPI fornecido exclusivamente para a finalidade a que se destina, conforme as orientações recebidas;</li>
      <li>Responsabilizar-me pela guarda, conservação e higienização adequada dos equipamentos;</li>
      <li>Comunicar imediatamente ao empregador/responsável qualquer avaria, extravio ou necessidade de reposição;</li>
      <li>Devolver todos os EPIs listados ao término do contrato de trabalho ou sempre que for solicitado;</li>
      <li>Cumprir integralmente as obrigações estabelecidas pela <strong>NR-6</strong> (MTE), <strong>CLT Art. 157 e 158</strong> e <strong>Lei 6.514/77</strong>;
        estando ciente de que a recusa injustificada ao uso constitui infração disciplinar sujeita às penalidades cabíveis.</li>
    </ol>
  </div>
</div>

<div class="sign-area">
  <div class="sign-box">
    <div class="sign-blank"></div>
    <div class="sign-line">
      <strong>${emp.employeeName}</strong><br>
      Funcionário(a) — Assinatura e Identificação<br>
      Data: _____ / _____ / _____________
    </div>
  </div>
  <div class="sign-box">
    <div class="sign-blank"></div>
    <div class="sign-line">
      <strong>Gestor(a) / Responsável pelo RH</strong><br>
      ${schoolName}<br>
      Data: _____ / _____ / _____________
    </div>
  </div>
</div>

<div class="legal">
  <strong>Base Legal:</strong> NR-6 (Portaria MTE) — Obrigações do empregador (fornecer, treinar, fiscalizar) e do empregado (usar, guardar, comunicar).
  CLT Art. 157 — Dever de fornecer EPI. CLT Art. 158 — Obrigação de uso. Lei 6.514/77 — Segurança e Medicina do Trabalho.
  O Certificado de Aprovação (CA) é documento emitido pelo Ministério do Trabalho e Emprego que homologa o EPI para uso nas atividades laborais.
</div>

<div class="footer">
  <span>© 2025 Wander Pires Silva Coelho · wanderpsc@gmail.com · Sistema Criador de Horário de Aula Escolar</span>
  <span>Gerado em ${now}</span>
</div>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus(); iframe.contentWindow?.print();
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 2000);
    }, 600);
  };

  // ─── IMPRESSÃO: Lista geral de EPIs ──────────────────────────────────────────
  const printAllEpis = () => {
    const now = new Date().toLocaleString('pt-BR');
    const rows = filtered.map(r => {
      const days = daysUntil(r.expirationDate);
      const condInfo = CONDITION_OPTS.find(c => c.value === r.condition);
      return `<tr>
        <td>${r.employeeName}</td>
        <td>${r.cargo || '—'} / ${r.setor || '—'}</td>
        <td>${r.epiType}</td>
        <td>${r.caNumber || '—'}</td>
        <td>${r.quantity}</td>
        <td>${fmtDate(r.deliveryDate)}</td>
        <td>${r.expirationDate ? fmtDate(r.expirationDate) + (days !== null && days <= 30 ? ' ⚠️' : '') : '—'}</td>
        <td>${fmtDate(r.nextInspectionDate)}</td>
        <td>${condInfo?.label || r.condition}</td>
        <td>${r.signedReceipt ? '✓' : '—'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><title>Controle de EPIs</title>
<style>
  @page { size: A4 landscape; margin: 12mm 10mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #d97706; padding-bottom: 6px; margin-bottom: 8px; }
  h1 { font-size: 13px; font-weight: 900; color: #d97706; }
  .sub { font-size: 9px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #d97706; color: #fff; padding: 4px 3px; font-size: 8px; text-align: center; }
  td { border: 1px solid #d1d5db; padding: 3px; font-size: 8px; }
  tr:nth-child(even) td { background: #fffbeb; }
  .footer { margin-top: 8px; border-top: 1px solid #d1d5db; padding-top: 4px;
    display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <div>
    <div class="sub">${schoolName}</div>
    <h1>Controle de EPIs — Lista Geral</h1>
    <div class="sub">${filtered.length} registro(s) · Gerado em ${now}</div>
  </div>
</div>
<table>
  <thead><tr>
    <th>Funcionário</th><th>Cargo / Setor</th><th>EPI</th><th>Nº CA</th>
    <th>Qtd</th><th>Entrega</th><th>Validade</th><th>Próx. Inspeção</th>
    <th>Estado</th><th>Assinado</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <span>© 2025 Wander Pires Silva Coelho · wanderpsc@gmail.com · Sistema Criador de Horário de Aula Escolar</span>
  <span>⚠️ = vencendo em 30 dias</span>
</div>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus(); iframe.contentWindow?.print();
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 600);
    }, 600);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-amber-800">
          <Shield className="text-amber-600" />
          Controle de EPIs
        </h1>
        <p className="text-amber-700 mt-1">
          Registro de entrega, fiscalização e comprovantes de EPIs por funcionário — NR-6 / CLT Art. 157
        </p>
      </div>

      {/* Alertas de vencimento */}
      {expiring.length > 0 && (
        <div className="card bg-red-50 border-2 border-red-300">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-600" size={20} />
            <h3 className="font-bold text-red-800">⚠️ EPIs Vencendo nos Próximos 30 Dias ({expiring.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiring.map(r => {
              const days = daysUntil(r.expirationDate);
              return (
                <div key={r._id || r.id} className="bg-white border border-red-200 rounded p-3 text-sm">
                  <div className="font-semibold">{r.employeeName}</div>
                  <div className="text-gray-600">{r.epiType}</div>
                  <div className={`text-xs font-bold mt-1 ${days !== null && days <= 7 ? 'text-red-700' : 'text-orange-600'}`}>
                    Vence em {days !== null ? days : '?'} dia(s) — {fmtDate(r.expirationDate)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de ações */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-semibold mb-1">🔍 Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
              <input type="text" placeholder="Funcionário, cargo ou tipo de EPI..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-7 w-full" />
              {search && (
                <button className="absolute right-2 top-2 text-gray-400 hover:text-red-500" onClick={() => setSearch('')}><X size={14}/></button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)} className="input">
              <option value="">Todos os estados</option>
              {CONDITION_OPTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="btn btn-outline flex items-center gap-1">
              <RefreshCw size={14} /> Atualizar
            </button>
            <button onClick={printAllEpis} className="btn btn-outline flex items-center gap-1">
              <Printer size={14} /> Imprimir Lista / PDF
            </button>
            <button
              onClick={() => setBatchMode(b => !b)}
              className={`btn flex items-center gap-2 ${batchMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'btn-outline border-amber-400 text-amber-700 hover:bg-amber-50'}`}
            >
              <Shield size={14} /> {batchMode ? 'Fechar Lote' : 'Entrega em Lote'}
            </button>
            <button onClick={openNew} className="btn btn-primary flex items-center gap-2">
              <Plus size={16} /> Registrar Entrega de EPI
            </button>
          </div>
        </div>
        {/* Resumo rápido dos filtros ativos */}
        {(search || filterCondition) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
            <span>Mostrando {filtered.length} de {records.length} registros</span>
            <button onClick={() => { setSearch(''); setFilterCondition(''); }} className="text-red-500 hover:underline">Limpar filtros</button>
          </div>
        )}
      </div>

      {/* ── Painel de Entrega em Lote ─────────────────────────────────────── */}
      {batchMode && (
        <div className="card border-2 border-amber-300 bg-amber-50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2">
              <Shield size={18} className="text-amber-600" />
              Entrega em Lote de EPIs
            </h2>
            <button
              onClick={() => { setBatchMode(false); setSelectedEmps(new Set()); setSelectedEpis(new Set()); }}
              className="btn btn-sm btn-outline flex items-center gap-1"
            >
              <X size={14} /> Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna 1: Funcionários */}
            <div className="bg-white border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-amber-800">
                  👥 Funcionários ({selectedEmps.size} selecionado{selectedEmps.size !== 1 ? 's' : ''})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEmps.size === filteredBatchEmps.length) {
                      setSelectedEmps(new Set());
                    } else {
                      setSelectedEmps(new Set(filteredBatchEmps.map(e => e._id || e.id || '')));
                    }
                  }}
                  className="text-xs text-amber-700 underline"
                >
                  {selectedEmps.size === filteredBatchEmps.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Buscar funcionário..."
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className="input w-full mb-2 text-sm"
              />
              <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                {filteredBatchEmps.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">Nenhum funcionário encontrado</p>
                ) : filteredBatchEmps.map(emp => {
                  const id = emp._id || emp.id || '';
                  const checked = selectedEmps.has(id);
                  return (
                    <label
                      key={id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${checked ? 'bg-amber-100 border border-amber-300' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedEmps(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 accent-amber-600 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{emp.name}</div>
                        {(emp.cargo || emp.setor) && (
                          <div className="text-xs text-gray-400 truncate">{[emp.cargo, emp.setor].filter(Boolean).join(' · ')}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Coluna 2: EPIs */}
            <div className="bg-white border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-amber-800">
                  🦺 EPIs ({selectedEpis.size} selecionado{selectedEpis.size !== 1 ? 's' : ''})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEpis.size === filteredBatchEpis.length) {
                      setSelectedEpis(new Set());
                    } else {
                      setSelectedEpis(new Set(filteredBatchEpis));
                    }
                  }}
                  className="text-xs text-amber-700 underline"
                >
                  {selectedEpis.size === filteredBatchEpis.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Buscar EPI..."
                value={epiSearch}
                onChange={e => setEpiSearch(e.target.value)}
                className="input w-full mb-2 text-sm"
              />
              <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                {filteredBatchEpis.map(epi => {
                  const checked = selectedEpis.has(epi);
                  return (
                    <label
                      key={epi}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${checked ? 'bg-amber-100 border border-amber-300' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedEpis(prev => {
                            const next = new Set(prev);
                            if (next.has(epi)) next.delete(epi); else next.add(epi);
                            return next;
                          });
                        }}
                        className="w-4 h-4 accent-amber-600 flex-shrink-0"
                      />
                      <span className="truncate">{epi}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Campos comuns — só aparece quando há seleção em ambos */}
          {selectedEmps.size > 0 && selectedEpis.size > 0 && (
            <div className="bg-white border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-amber-800 mb-3">
                📋 Dados da Entrega (aplicados a todos os selecionados)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Data de Entrega *</label>
                  <input
                    type="date"
                    value={batchForm.deliveryDate}
                    onChange={e => setBatchForm(f => ({ ...f, deliveryDate: e.target.value }))}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Estado / Condição</label>
                  <select
                    value={batchForm.condition}
                    onChange={e => setBatchForm(f => ({ ...f, condition: e.target.value }))}
                    className="input w-full text-sm"
                  >
                    {CONDITION_OPTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Quantidade (por item)</label>
                  <input
                    type="number"
                    min={1}
                    value={batchForm.quantity}
                    onChange={e => setBatchForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nº CA</label>
                  <input
                    type="text"
                    value={batchForm.caNumber}
                    onChange={e => setBatchForm(f => ({ ...f, caNumber: e.target.value }))}
                    className="input w-full text-sm"
                    placeholder="Certificado de Aprovação"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Marca / Fabricante</label>
                  <input
                    type="text"
                    value={batchForm.brand}
                    onChange={e => setBatchForm(f => ({ ...f, brand: e.target.value }))}
                    className="input w-full text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="batchSigned"
                    checked={batchForm.signedReceipt}
                    onChange={e => setBatchForm(f => ({ ...f, signedReceipt: e.target.checked }))}
                    className="w-4 h-4 accent-amber-600"
                  />
                  <label htmlFor="batchSigned" className="text-xs font-semibold cursor-pointer">
                    Recibo assinado pelos funcionários
                  </label>
                </div>
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold mb-1">Observações</label>
                  <textarea
                    value={batchForm.observations}
                    onChange={e => setBatchForm(f => ({ ...f, observations: e.target.value }))}
                    className="input w-full text-sm h-16 resize-none"
                    placeholder="Observações gerais para todos os registros..."
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-amber-100">
                <p className="text-sm text-amber-800">
                  Serão criados{' '}
                  <strong>{selectedEmps.size} funcionário(s) × {selectedEpis.size} EPI(s) = {selectedEmps.size * selectedEpis.size} registro(s)</strong>
                </p>
                <button
                  onClick={() => {
                    if (!batchForm.deliveryDate) { toast.error('Informe a data de entrega.'); return; }
                    const empList = employees.filter(e => selectedEmps.has(e._id || e.id || ''));
                    const records = empList.flatMap(emp =>
                      Array.from(selectedEpis).map(epi => ({
                        employeeId: emp._id || emp.id || '',
                        employeeName: emp.name,
                        cargo: emp.cargo || '',
                        setor: emp.setor || '',
                        epiType: epi,
                        epiDescription: '',
                        quantity: batchForm.quantity,
                        caNumber: batchForm.caNumber,
                        brand: batchForm.brand,
                        deliveryDate: batchForm.deliveryDate,
                        expirationDate: '',
                        nextInspectionDate: '',
                        returnDate: '',
                        condition: batchForm.condition,
                        signedReceipt: batchForm.signedReceipt,
                        observations: batchForm.observations,
                      }))
                    );
                    batchMutation.mutate(records);
                  }}
                  disabled={batchMutation.isPending || !batchForm.deliveryDate}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Save size={16} />
                  {batchMutation.isPending
                    ? 'Registrando...'
                    : `Registrar ${selectedEmps.size * selectedEpis.size} entrega(s)`}
                </button>
              </div>
            </div>
          )}

          {(selectedEmps.size === 0 || selectedEpis.size === 0) && (
            <p className="text-center text-amber-700 text-sm py-1">
              {selectedEmps.size === 0 && selectedEpis.size === 0
                ? 'Selecione funcionários à esquerda e EPIs à direita para prosseguir.'
                : selectedEmps.size === 0
                ? '⬅️ Selecione ao menos um funcionário.'
                : '➡️ Selecione ao menos um EPI.'}
            </p>
          )}
        </div>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Registros', value: records.length, color: 'bg-blue-50 border-blue-300 text-blue-800' },
          { label: 'Ativos', value: records.filter(r => r.isActive && r.condition !== 'devolvido' && r.condition !== 'vencido').length, color: 'bg-green-50 border-green-300 text-green-800' },
          { label: 'Vencidos', value: records.filter(r => r.condition === 'vencido').length, color: 'bg-red-50 border-red-300 text-red-800' },
          { label: 'Recibo Assinado', value: records.filter(r => r.signedReceipt).length, color: 'bg-purple-50 border-purple-300 text-purple-800' },
        ].map(c => (
          <div key={c.label} className={`card border-2 text-center ${c.color}`}>
            <div className="text-2xl font-black">{c.value}</div>
            <div className="text-xs font-semibold mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Carregando EPIs...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">Nenhum EPI registrado.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-amber-600 text-white">
                <tr>
                  <th className="p-3 text-left">Funcionário</th>
                  <th className="p-3 text-left">Cargo / Setor</th>
                  <th className="p-3 text-left">EPI</th>
                  <th className="p-3 text-center">Nº CA</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-center">Entrega</th>
                  <th className="p-3 text-center">Validade</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Assinado</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const condInfo = CONDITION_OPTS.find(c => c.value === r.condition);
                  const days = daysUntil(r.expirationDate);
                  const isExpiring = days !== null && days <= 30 && r.condition !== 'devolvido';
                  const id = r._id || r.id || '';
                  return (
                    <tr key={id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isExpiring ? 'border-l-4 border-l-red-400' : ''}`}>
                      <td className="p-3 font-semibold">{r.employeeName}</td>
                      <td className="p-3 text-xs text-gray-600">{r.cargo || '—'}<br/><span className="text-gray-400">{r.setor}</span></td>
                      <td className="p-3">
                        <div className="font-medium">{r.epiType}</div>
                        {r.epiDescription && <div className="text-xs text-gray-500">{r.epiDescription}</div>}
                        {r.brand && <div className="text-xs text-gray-400">{r.brand}</div>}
                      </td>
                      <td className="p-3 text-center text-xs">{r.caNumber || '—'}</td>
                      <td className="p-3 text-center">{r.quantity}</td>
                      <td className="p-3 text-center text-xs">{fmtDate(r.deliveryDate)}</td>
                      <td className={`p-3 text-center text-xs ${isExpiring ? 'text-red-700 font-bold' : ''}`}>
                        {r.expirationDate ? fmtDate(r.expirationDate) : '—'}
                        {isExpiring && <div className="text-red-600">⚠️ {days}d</div>}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${condInfo?.color || ''}`}>
                          {condInfo?.label || r.condition}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {r.signedReceipt
                          ? <CheckCircle size={16} className="text-green-500 mx-auto" />
                          : <X size={16} className="text-gray-300 mx-auto" />}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-center flex-wrap">
                          <button onClick={() => printReceipt(r)} className="btn btn-sm bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1" title="Imprimir ficha de entrega">
                            <Printer size={13} />
                          </button>
                          <button onClick={() => printTermoRecebimento(r.employeeId)} className="btn btn-sm bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1" title="Imprimir Termo de Recebimento de EPIs">
                            <FileText size={13} />
                          </button>
                          <button onClick={() => openEdit(r)} className="btn btn-sm btn-outline flex items-center gap-1" title="Editar">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => { if (confirm('Remover este registro de EPI?')) deleteMutation.mutate(id); }} className="btn btn-sm btn-error flex items-center gap-1" title="Remover">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Base legal */}
      <div className="card bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <p className="font-semibold mb-1">📌 Base Legal — EPIs:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>NR-6</strong> — Define os tipos de EPI, obrigações do empregador e do empregado</li>
          <li><strong>CLT Art. 157</strong> — Obrigação do empregador de fornecer EPIs</li>
          <li><strong>CLT Art. 158</strong> — Obrigação do empregado de usar o EPI fornecido</li>
          <li><strong>Lei 6.514/77</strong> — Segurança e Medicina do Trabalho</li>
          <li>O CA (Certificado de Aprovação) é emitido pelo Ministério do Trabalho e valida o EPI para uso</li>
        </ul>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Shield size={20} className="text-amber-600" />
                  {editing ? 'Editar Registro de EPI' : 'Registrar Entrega de EPI'}
                </h3>
                <button onClick={() => setShowModal(false)} className="btn btn-sm btn-outline"><X size={16} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <SearchableSelect
                    label="Funcionário"
                    required
                    value={form.employeeId}
                    onChange={onEmployeeChange}
                    options={employeeOptions}
                    placeholder="Digite o nome ou cargo do funcionário..."
                  />
                  {form.employeeName && (
                    <div className="mt-1 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      {[form.cargo, form.setor].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <SearchableSelect
                    label="Tipo de EPI"
                    required
                    value={form.epiType}
                    onChange={(val) => setForm(f => ({ ...f, epiType: val }))}
                    options={epiTypeOptions}
                    placeholder="Digite ou selecione o tipo de EPI..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Descrição / Especificação</label>
                  <input type="text" value={form.epiDescription} onChange={e => setForm(f => ({ ...f, epiDescription: e.target.value }))} className="input w-full" placeholder="Ex: Luva de borracha tamanho G..." />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Marca / Fabricante</label>
                  <input type="text" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="input w-full" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Nº CA (Certificado de Aprovação)</label>
                  <input type="text" value={form.caNumber} onChange={e => setForm(f => ({ ...f, caNumber: e.target.value }))} className="input w-full" placeholder="Ex: 12345" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Quantidade</label>
                  <input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="input w-full" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Data de Entrega *</label>
                  <input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} className="input w-full" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Data de Validade</label>
                  <input type="date" value={form.expirationDate} onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))} className="input w-full" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Próxima Inspeção</label>
                  <input type="date" value={form.nextInspectionDate} onChange={e => setForm(f => ({ ...f, nextInspectionDate: e.target.value }))} className="input w-full" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Data de Devolução</label>
                  <input type="date" value={form.returnDate} onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))} className="input w-full" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Estado / Condição</label>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="input w-full">
                    {CONDITION_OPTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="signedReceipt" checked={form.signedReceipt} onChange={e => setForm(f => ({ ...f, signedReceipt: e.target.checked }))} className="w-5 h-5" />
                  <label htmlFor="signedReceipt" className="font-semibold text-sm cursor-pointer">
                    ✅ Funcionário assinou o recibo de recebimento
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Observações</label>
                  <textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} className="input w-full h-20 resize-none" placeholder="Observações adicionais..." />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setShowModal(false)} className="btn btn-outline">Cancelar</button>
                <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn btn-primary flex items-center gap-2">
                  <Save size={16} />
                  {saveMutation.isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Registrar EPI'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
