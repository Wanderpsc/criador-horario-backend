/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Página: Ponto e Frequência de Funcionários
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import {
  Clock, Printer, ChevronDown, ChevronUp,
  RefreshCw, Save, Search, Bell, BarChart2,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface AttendanceRow {
  _id?: string;
  employeeId: string;
  employeeName: string;
  cargo?: string;
  setor?: string;
  date?: string;
  status: string | null;
  shift: string;
  expectedEntryTime: string;
  expectedExitTime: string;
  entryTime: string;
  exitTime: string;
  isPlantao?: boolean;
  plantaoStart?: string;
  plantaoEnd?: string;
  overtimeMinutes?: number;
  earlyDepartureMinutes?: number;
  lateArrivalMinutes?: number;
  workedMinutes?: number;
  expectedMinutes?: number;
  justification?: string;
  observations?: string;
  notificationGenerated?: boolean;
}

interface ReportEmployee {
  employeeId: string;
  employeeName: string;
  cargo?: string;
  setor?: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  partialDays: number;
  medicalLeaveDays: number;
  vacationDays: number;
  justifiedDays: number;
  totalWorkedMinutes: number;
  totalExpectedMinutes: number;
  totalOvertimeMinutes: number;
  totalEarlyDepartureMinutes: number;
  totalLateArrivalMinutes: number;
  absenceDates: string[];
  records: AttendanceRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtMin = (min: number) => {
  if (!min || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;
};

const STATUS_OPTS = [
  { value: 'present',       label: 'Presente',           color: 'bg-green-100 text-green-800',   dot: 'bg-green-500' },
  { value: 'absent',        label: 'Falta',              color: 'bg-red-100 text-red-800',       dot: 'bg-red-500' },
  { value: 'partial',       label: 'Parcial',            color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  { value: 'medical_leave', label: 'Afastamento/Atestado',color: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500' },
  { value: 'vacation',      label: 'Férias',             color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  { value: 'justified',     label: 'Falta Justificada',  color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  { value: 'holiday',       label: 'Feriado/Folga',      color: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-400' },
  { value: 'remote',        label: 'Teletrabalho/Remoto',color: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500' },
  { value: 'overtime_only', label: 'Hora Extra',         color: 'bg-pink-100 text-pink-800',    dot: 'bg-pink-500' },
];

const SHIFT_OPTS = [
  { value: 'integral', label: 'Integral' },
  { value: 'manha',    label: 'Manhã' },
  { value: 'tarde',    label: 'Tarde' },
  { value: 'noturno',  label: 'Noturno' },
  { value: 'plantao',  label: 'Plantão' },
];

const TODAY = new Date().toISOString().split('T')[0];

const getStatusInfo = (s: string | null) =>
  STATUS_OPTS.find(o => o.value === s) || { label: '—', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' };

const DAYS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function EmployeeAttendancePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'ponto' | 'relatorios' | 'notificacoes' | 'configuracoes'>('ponto');

  // ── Configurações de geolocalização / foto
  const [geoSettings, setGeoSettings] = useState({
    requireGeolocation: false,
    latitude: '',
    longitude: '',
    areaM2: 1000,
    requirePhoto: false,
    graceMinutes: 10,
  });
  const [geoSaving, setGeoSaving] = useState(false);
  const [geoLoaded, setGeoLoaded] = useState(false);

  // ── Ponto diário
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // ── Relatórios
  const [rptStart, setRptStart] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [rptEnd, setRptEnd] = useState(TODAY);
  const [rptSearch, setRptSearch] = useState('');
  const [expandedRpt, setExpandedRpt] = useState<string | null>(null);

  // ── Notificações
  const [ntfStart, setNtfStart] = useState(rptStart);
  const [ntfEnd, setNtfEnd] = useState(TODAY);

  const schoolName = user?.schoolName || user?.name || 'Escola';

  // ── Query: pré-carregar ponto do dia ────────────────────────────────────────
  const { isLoading: loadingDay, refetch: refetchDay } = useQuery({
    queryKey: ['emp-attendance-day', selectedDate],
    queryFn: async () => {
      const res = await api.get('/employee-attendance/init-day', { params: { date: selectedDate } });
      const data = res.data.rows as AttendanceRow[];
      setRows(data.map(r => ({ ...r, status: r.status || null })));
      return data;
    },
    staleTime: 0,
  });

  // ── Query: configurações do link geral (geolocalização / foto) ────────────
  useQuery({
    queryKey: ['school-link-settings'],
    queryFn: async () => {
      const res = await api.get('/attendance-links/school-link');
      const d = res.data;
      setGeoSettings({
        requireGeolocation: d.requireGeolocation || false,
        latitude: d.latitude != null ? String(d.latitude) : '',
        longitude: d.longitude != null ? String(d.longitude) : '',
        areaM2: d.areaM2 || 1000,
        requirePhoto: d.requirePhoto || false,
        graceMinutes: d.graceMinutes ?? 10,
      });
      setGeoLoaded(true);
      return d;
    },
    retry: false,
    staleTime: 30000,
  });

  // ── Query: relatório ────────────────────────────────────────────────────────
  const { data: reportData = [], isLoading: loadingRpt, refetch: refetchRpt } = useQuery<ReportEmployee[]>({
    queryKey: ['emp-attendance-report', rptStart, rptEnd],
    queryFn: async () => {
      const res = await api.get('/employee-attendance/report', { params: { startDate: rptStart, endDate: rptEnd } });
      return res.data;
    },
    enabled: tab === 'relatorios',
  });

  // ── Query: faltosos para notificação ────────────────────────────────────────
  const { data: ntfRecords = [], isLoading: loadingNtf, refetch: refetchNtf } = useQuery<AttendanceRow[]>({
    queryKey: ['emp-attendance-ntf', ntfStart, ntfEnd],
    queryFn: async () => {
      const res = await api.get('/employee-attendance', {
        params: { startDate: ntfStart, endDate: ntfEnd, status: 'absent' },
      });
      return res.data;
    },
    enabled: tab === 'notificacoes',
  });

  // ── Mutação: salvar ponto em bloco ──────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const toSave = rows.filter(r => r.status !== null);
      if (toSave.length === 0) throw new Error('Marque pelo menos um status antes de salvar.');
      const res = await api.post('/employee-attendance/bulk', { date: selectedDate, records: toSave });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.saved} registro(s) salvo(s)!`);
      qc.invalidateQueries({ queryKey: ['emp-attendance-day'] });
      qc.invalidateQueries({ queryKey: ['emp-attendance-report'] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar.'),
  });

  // ── Mutação: marcar notificação enviada ─────────────────────────────────────
  const markNtfMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post('/employee-attendance/mark-notification', { ids });
    },
    onSuccess: () => {
      toast.success('Notificações marcadas como geradas.');
      qc.invalidateQueries({ queryKey: ['emp-attendance-ntf'] });
    },
  });

  // ── Manipular linha ─────────────────────────────────────────────────────────
  const updateRow = (idx: number, field: keyof AttendanceRow, value: any) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const setAllPresent = () => setRows(prev => prev.map(r => ({ ...r, status: 'present' })));
  const setAllAbsent = () => setRows(prev => prev.map(r => ({ ...r, status: 'absent' })));

  // ── Filtrar linhas ──────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => rows.filter(r => {
    const matchSearch = !search || r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.cargo?.toLowerCase().includes(search.toLowerCase());
    const matchSetor = !filterSetor || r.setor === filterSetor;
    return matchSearch && matchSetor;
  }), [rows, search, filterSetor]);

  const setores = useMemo(() => Array.from(new Set(rows.map(r => r.setor).filter(Boolean))), [rows]);

  const filteredRpt = useMemo(() =>
    reportData.filter(r => !rptSearch || r.employeeName.toLowerCase().includes(rptSearch.toLowerCase())),
    [reportData, rptSearch]
  );

  // ─── IMPRESSÃO: PONTO DO DIA ─────────────────────────────────────────────────
  const printDayAttendance = () => {
    const dayName = DAYS_PT[new Date(selectedDate + 'T12:00:00').getDay()];
    const dateStr = fmtDate(selectedDate);
    const now = new Date().toLocaleString('pt-BR');

    const tableRows = filteredRows.map(r => {
      const si = getStatusInfo(r.status);
      return `<tr>
        <td>${r.employeeName}</td>
        <td>${r.cargo || '—'}</td>
        <td>${r.setor || '—'}</td>
        <td>${SHIFT_OPTS.find(s => s.value === r.shift)?.label || r.shift}</td>
        <td>${r.expectedEntryTime || '—'}</td>
        <td>${r.expectedExitTime || '—'}</td>
        <td>${r.entryTime || '—'}</td>
        <td>${r.exitTime || '—'}</td>
        <td><strong>${si.label}</strong></td>
        <td>${r.justification || r.observations || '—'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8">
<title>Ponto – ${dateStr}</title>
<style>
  @page { size: A4 landscape; margin: 12mm 10mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #1d4ed8; padding-bottom: 6px; margin-bottom: 8px; }
  .header h1 { font-size: 14px; font-weight: 900; color: #1d4ed8; }
  .header .sub { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .header-right { text-align: right; font-size: 9px; color: #374151; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1d4ed8; color: #fff; padding: 4px 3px; text-align: left; font-size: 8px; }
  td { border: 1px solid #d1d5db; padding: 3px; font-size: 8px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer { margin-top: 8px; border-top: 1px solid #d1d5db; padding-top: 4px;
    display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="h1">${schoolName}</div>
    <h1>Ponto de Funcionários — ${dayName}, ${dateStr}</h1>
    <div class="sub">${filteredRows.length} funcionário(s)</div>
  </div>
  <div class="header-right">Gerado em: ${now}</div>
</div>
<table>
  <thead><tr>
    <th>Nome</th><th>Cargo</th><th>Setor</th><th>Turno</th>
    <th>Entrada Prev.</th><th>Saída Prev.</th><th>Entrada Real</th><th>Saída Real</th>
    <th>Status</th><th>Observação</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<div class="footer">
  <span><strong>© 2025 Wander Pires Silva Coelho</strong> · wanderpsc@gmail.com · Sistema Criador de Horário de Aula Escolar</span>
  <span>Para PDF: "Salvar como PDF" no diálogo de impressão</span>
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

  // ─── IMPRESSÃO: RELATÓRIO MENSAL ──────────────────────────────────────────────
  const printReport = () => {
    const now = new Date().toLocaleString('pt-BR');
    const tableRows = filteredRpt.map(r => `<tr>
      <td>${r.employeeName}</td>
      <td>${r.cargo || '—'}</td>
      <td>${r.setor || '—'}</td>
      <td>${r.totalDays}</td>
      <td style="color:#16a34a;font-weight:bold">${r.presentDays}</td>
      <td style="color:#dc2626;font-weight:bold">${r.absentDays}</td>
      <td style="color:#d97706">${r.partialDays}</td>
      <td>${r.medicalLeaveDays}</td>
      <td>${r.vacationDays}</td>
      <td>${r.justifiedDays}</td>
      <td>${fmtMin(r.totalWorkedMinutes)}</td>
      <td>${fmtMin(r.totalOvertimeMinutes)}</td>
      <td>${fmtMin(r.totalEarlyDepartureMinutes)}</td>
    </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><title>Relatório de Frequência</title>
<style>
  @page { size: A4 landscape; margin: 12mm 10mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #7c3aed; padding-bottom: 6px; margin-bottom: 8px; }
  h1 { font-size: 13px; font-weight: 900; color: #7c3aed; }
  .sub { font-size: 9px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #7c3aed; color: #fff; padding: 4px 3px; font-size: 8px; text-align: center; }
  td { border: 1px solid #d1d5db; padding: 3px; font-size: 8px; text-align: center; }
  td:first-child { text-align: left; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer { margin-top: 8px; border-top: 1px solid #d1d5db; padding-top: 4px;
    display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <div>
    <div class="sub">${schoolName}</div>
    <h1>Relatório de Frequência de Funcionários</h1>
    <div class="sub">Período: ${fmtDate(rptStart)} a ${fmtDate(rptEnd)} · ${filteredRpt.length} funcionário(s)</div>
  </div>
  <div style="font-size:9px;color:#374151;text-align:right">Gerado em: ${now}</div>
</div>
<table>
  <thead><tr>
    <th>Nome</th><th>Cargo</th><th>Setor</th><th>Dias</th>
    <th>Presentes</th><th>Faltas</th><th>Parcial</th>
    <th>Atestado</th><th>Férias</th><th>Justificadas</th>
    <th>H. Trabalhadas</th><th>H. Extra</th><th>Saída Antecip.</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<div class="footer">
  <span><strong>© 2025 Wander Pires Silva Coelho</strong> · wanderpsc@gmail.com · Sistema Criador de Horário de Aula Escolar</span>
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

  // ─── IMPRESSÃO: RELATÓRIO POR FUNÇÃO ─────────────────────────────────────────
  const printReportByRole = () => {
    const now = new Date().toLocaleString('pt-BR');

    // Agrupa por cargo
    const grouped: Record<string, ReportEmployee[]> = {};
    filteredRpt.forEach(r => {
      const key = r.cargo?.trim() || 'Sem Função';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    const roleSections = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cargo, emps]) => {
      const totPresent = emps.reduce((a, r) => a + r.presentDays, 0);
      const totAbsent = emps.reduce((a, r) => a + r.absentDays, 0);
      const totMedical = emps.reduce((a, r) => a + r.medicalLeaveDays, 0);
      const totVacation = emps.reduce((a, r) => a + r.vacationDays, 0);
      const totOvertime = emps.reduce((a, r) => a + r.totalOvertimeMinutes, 0);
      const totWorked = emps.reduce((a, r) => a + r.totalWorkedMinutes, 0);

      const empRows = emps.map(r => {
        const freq = r.totalDays > 0 ? Math.round((r.presentDays / r.totalDays) * 100) : 0;
        const freqColor = freq >= 75 ? '#16a34a' : freq >= 50 ? '#d97706' : '#dc2626';
        return `<tr>
          <td style="text-align:left">${r.employeeName}</td>
          <td>${r.setor || '—'}</td>
          <td>${r.totalDays}</td>
          <td style="color:#16a34a;font-weight:bold">${r.presentDays}</td>
          <td style="color:#dc2626;font-weight:bold">${r.absentDays}</td>
          <td style="color:#d97706">${r.partialDays}</td>
          <td style="color:#2563eb">${r.medicalLeaveDays}</td>
          <td style="color:#7c3aed">${r.vacationDays}</td>
          <td style="color:#ca8a04">${r.justifiedDays}</td>
          <td>${fmtMin(r.totalWorkedMinutes)}</td>
          <td style="color:#db2777">${fmtMin(r.totalOvertimeMinutes)}</td>
          <td style="color:${freqColor};font-weight:bold">${freq}%${freq < 75 ? ' ⚠' : ''}</td>
        </tr>`;
      }).join('');

      return `
<div class="role-section">
  <div class="role-header">
    <span class="role-title">${cargo}</span>
    <span class="role-meta">${emps.length} funcionário(s) &nbsp;|&nbsp;
      Presenças: ${totPresent} &nbsp;|&nbsp;
      Faltas: ${totAbsent} &nbsp;|&nbsp;
      Atestados: ${totMedical} &nbsp;|&nbsp;
      Férias: ${totVacation} &nbsp;|&nbsp;
      H. Extra: ${fmtMin(totOvertime)} &nbsp;|&nbsp;
      H. Trab.: ${fmtMin(totWorked)}
    </span>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left">Nome</th><th>Setor</th><th>Dias</th>
      <th>Presente</th><th>Faltas</th><th>Parcial</th>
      <th>Atestado</th><th>Férias</th><th>Justif.</th>
      <th>H. Trab.</th><th>H. Extra</th><th>Freq.%</th>
    </tr></thead>
    <tbody>${empRows}</tbody>
  </table>
</div>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><title>Relatório por Função</title>
<style>
  @page { size: A4 landscape; margin: 12mm 10mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #0f766e; padding-bottom: 6px; margin-bottom: 10px; }
  h1 { font-size: 13px; font-weight: 900; color: #0f766e; }
  .sub { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .role-section { margin-bottom: 14px; page-break-inside: avoid; }
  .role-header { background: #0f766e; color: #fff; padding: 4px 6px; border-radius: 3px 3px 0 0;
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
  .role-title { font-size: 10px; font-weight: 900; }
  .role-meta { font-size: 8px; opacity: .9; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #134e4a; color: #fff; padding: 3px 4px; font-size: 8px; text-align: center; }
  td { border: 1px solid #d1d5db; padding: 3px 4px; font-size: 8px; text-align: center; }
  tr:nth-child(even) td { background: #f0fdfa; }
  .footer { margin-top: 8px; border-top: 1px solid #d1d5db; padding-top: 4px;
    display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <div>
    <div class="sub">${schoolName}</div>
    <h1>Relatório de Frequência por Função</h1>
    <div class="sub">Período: ${fmtDate(rptStart)} a ${fmtDate(rptEnd)} · ${filteredRpt.length} funcionário(s) · ${Object.keys(grouped).length} função(ões)</div>
  </div>
  <div style="font-size:9px;color:#374151;text-align:right">Gerado em: ${now}</div>
</div>
${roleSections}
<div class="footer">
  <span><strong>© 2025 Wander Pires Silva Coelho</strong> · wanderpsc@gmail.com · Sistema Criador de Horário de Aula Escolar</span>
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

  // ─── IMPRESSÃO: NOTIFICAÇÃO DE FALTA ─────────────────────────────────────────
  const printAbsenceNotice = (r: AttendanceRow) => {
    const dateStr = fmtDate(r.date || '');
    const dayName = r.date ? DAYS_PT[new Date(r.date + 'T12:00:00').getDay()] : '';
    const now = new Date().toLocaleString('pt-BR');
    const today = new Date().toLocaleDateString('pt-BR');

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><title>Notificação de Falta</title>
<style>
  @page { size: A4 portrait; margin: 20mm 20mm 25mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; line-height: 1.6; }
  .school { text-align: center; font-size: 13px; font-weight: 900; color: #1d4ed8; margin-bottom: 4px; }
  .doc-title { text-align: center; font-size: 14px; font-weight: 900; text-transform: uppercase;
    letter-spacing: 1px; border-bottom: 2px solid #1d4ed8; padding-bottom: 6px; margin-bottom: 14px; }
  .field { margin-bottom: 8px; }
  .label { font-weight: bold; color: #374151; }
  .body-text { margin: 16px 0; text-align: justify; line-height: 1.8; }
  .legal { background: #fef9c3; border-left: 4px solid #facc15; padding: 8px 12px;
    margin: 12px 0; font-size: 10px; }
  .sign-area { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .sign-box { text-align: center; }
  .sign-line { border-top: 1px solid #374151; margin-top: 30px; padding-top: 4px; font-size: 10px; }
  .footer { position: fixed; bottom: 10mm; left: 20mm; right: 20mm;
    border-top: 1px solid #d1d5db; padding-top: 4px; font-size: 9px; color: #9ca3af;
    display: flex; justify-content: space-between; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>

<div class="school">${schoolName}</div>
<div class="doc-title">Notificação de Falta Injustificada</div>

<div class="field"><span class="label">Funcionário(a): </span>${r.employeeName}</div>
<div class="field"><span class="label">Cargo: </span>${r.cargo || '—'} &nbsp;&nbsp;&nbsp; <span class="label">Setor: </span>${r.setor || '—'}</div>
<div class="field"><span class="label">Data da Falta: </span>${dayName}, ${dateStr}</div>
<div class="field"><span class="label">Turno: </span>${SHIFT_OPTS.find(s => s.value === r.shift)?.label || r.shift}</div>
${r.justification ? `<div class="field"><span class="label">Justificativa informada: </span>${r.justification}</div>` : ''}

<div class="body-text">
  <p>Prezado(a) <strong>${r.employeeName}</strong>,</p><br>
  <p>Comunicamos que foi registrada sua <strong>ausência sem justificativa</strong> ao serviço em <strong>${dayName}, ${dateStr}</strong>, em desacordo com a escala de trabalho previamente estabelecida.</p><br>
  <p>Ressaltamos que, nos termos da <strong>Consolidação das Leis do Trabalho (CLT)</strong> – especialmente dos artigos <strong>482</strong> (justa causa), <strong>473</strong> (ausências justificadas) e <strong>131</strong> (interrupção do contrato) –, a ausência injustificada ao trabalho constitui falta grave passível de desconto em folha de pagamento e, em caso de reincidência, pode ensejar demissão por justa causa.</p><br>
  <p>Solicitamos que V. Sa. apresente <strong>justificativa formal e documentação comprobatória</strong> no prazo de <strong>48 (quarenta e oito) horas</strong> a contar do recebimento desta notificação, junto ao setor de Recursos Humanos.</p>
</div>

<div class="legal">
  <strong>Base Legal:</strong> CLT Art. 473 (faltas justificadas), Art. 482 'e' (falta habitual), Art. 131 (dias que não prejudicam descanso semanal).
  Em caso de estatutário, aplicam-se as normas do respectivo Estatuto do Servidor Público.
</div>

<div class="field" style="margin-top:12px">
  <span class="label">Data desta Notificação: </span>${today}
</div>

<div class="sign-area">
  <div class="sign-box">
    <div class="sign-line">
      Assinatura do(a) Funcionário(a)<br>
      <strong>${r.employeeName}</strong>
    </div>
  </div>
  <div class="sign-box">
    <div class="sign-line">
      Assinatura da Gestão / RH<br>
      <strong>${schoolName}</strong>
    </div>
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
      if (r._id) markNtfMutation.mutate([r._id]);
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 2000);
    }, 600);
  };

  // ─── IMPRESSÃO: NOTIFICAÇÕES EM LOTE ─────────────────────────────────────────
  const printAllNotices = (records: AttendanceRow[]) => {
    const today = new Date().toLocaleDateString('pt-BR');

    const pages = records.map(r => {
      const dateStr = fmtDate(r.date || '');
      const dayName = r.date ? DAYS_PT[new Date(r.date + 'T12:00:00').getDay()] : '';
      return `
<div class="page">
  <div class="school">${schoolName}</div>
  <div class="doc-title">Notificação de Falta Injustificada</div>
  <div class="field"><span class="label">Funcionário(a): </span>${r.employeeName}</div>
  <div class="field"><span class="label">Cargo: </span>${r.cargo || '—'} &nbsp; <span class="label">Setor: </span>${r.setor || '—'}</div>
  <div class="field"><span class="label">Data da Falta: </span>${dayName}, ${dateStr}</div>
  <div class="field"><span class="label">Turno: </span>${SHIFT_OPTS.find(s => s.value === r.shift)?.label || r.shift}</div>
  <div class="body-text">
    <p>Prezado(a) <strong>${r.employeeName}</strong>,</p><br>
    <p>Comunicamos que foi registrada sua <strong>ausência sem justificativa</strong> em <strong>${dayName}, ${dateStr}</strong>.</p><br>
    <p>Nos termos da CLT (Arts. 482, 473 e 131), solicitamos que apresente justificativa formal em até <strong>48 horas</strong> ao RH.</p>
  </div>
  <div class="legal"><strong>Base Legal:</strong> CLT Art. 473, Art. 482 'e', Art. 131.</div>
  <div class="field" style="margin-top:10px"><span class="label">Data: </span>${today}</div>
  <div class="sign-area">
    <div class="sign-box"><div class="sign-line">Funcionário(a): ${r.employeeName}</div></div>
    <div class="sign-box"><div class="sign-line">Gestão / RH: ${schoolName}</div></div>
  </div>
</div>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><title>Notificações de Falta</title>
<style>
  @page { size: A4 portrait; margin: 18mm 18mm 22mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; line-height: 1.6; }
  .page { page-break-after: always; padding-bottom: 20px; }
  .page:last-child { page-break-after: auto; }
  .school { text-align: center; font-size: 13px; font-weight: 900; color: #1d4ed8; margin-bottom: 4px; }
  .doc-title { text-align: center; font-size: 14px; font-weight: 900; text-transform: uppercase;
    border-bottom: 2px solid #1d4ed8; padding-bottom: 6px; margin-bottom: 14px; }
  .field { margin-bottom: 6px; }
  .label { font-weight: bold; color: #374151; }
  .body-text { margin: 12px 0; text-align: justify; line-height: 1.8; }
  .legal { background: #fef9c3; border-left: 4px solid #facc15; padding: 8px 12px; margin: 10px 0; font-size: 10px; }
  .sign-area { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .sign-box { text-align: center; }
  .sign-line { border-top: 1px solid #374151; margin-top: 28px; padding-top: 4px; font-size: 10px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>${pages}</body></html>`;

    const ids = records.filter(r => r._id && !r.notificationGenerated).map(r => r._id!);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus(); iframe.contentWindow?.print();
      if (ids.length > 0) markNtfMutation.mutate(ids);
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 2000);
    }, 600);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-800">
          <Clock className="text-blue-600" />
          Ponto e Frequência de Funcionários
        </h1>
        <p className="text-blue-700 mt-1">
          Controle de presença, ausências, horas extras, plantões e relatórios trabalhistas
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'ponto',          label: '📋 Ponto Diário',         icon: Clock },
          { id: 'relatorios',     label: '📊 Relatórios',           icon: BarChart2 },
          { id: 'notificacoes',   label: '🔔 Notificações',         icon: Bell },
          { id: 'configuracoes',  label: '⚙️ Configurações',        icon: Clock },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors ${
              tab === t.id
                ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ ABA: PONTO DIÁRIO ══════════════ */}
      {tab === 'ponto' && (
        <div className="space-y-4">
          {/* Controles de data e filtros */}
          <div className="card">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold mb-1">📅 Data do Ponto</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="input"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {DAYS_PT[new Date(selectedDate + 'T12:00:00').getDay()]}
                </div>
              </div>

              <div className="flex-1 min-w-48">
                <label className="block text-sm font-semibold mb-1">🔍 Buscar</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome ou cargo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input pl-7"
                  />
                </div>
              </div>

              {setores.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Setor</label>
                  <select value={filterSetor} onChange={e => setFilterSetor(e.target.value)} className="input">
                    <option value="">Todos</option>
                    {setores.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button onClick={setAllPresent} className="btn btn-sm bg-green-600 text-white hover:bg-green-700">
                  ✅ Todos Presentes
                </button>
                <button onClick={setAllAbsent} className="btn btn-sm bg-red-100 text-red-700 hover:bg-red-200">
                  ❌ Todos Ausentes
                </button>
                <button onClick={() => refetchDay()} className="btn btn-sm btn-outline flex items-center gap-1">
                  <RefreshCw size={14} /> Recarregar
                </button>
                <button onClick={printDayAttendance} className="btn btn-sm btn-outline flex items-center gap-1">
                  <Printer size={14} /> Imprimir / PDF
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de ponto */}
          {loadingDay ? (
            <div className="text-center py-10 text-gray-500">Carregando funcionários...</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              Nenhum funcionário ativo encontrado.
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-blue-700 text-white">
                    <tr>
                      <th className="p-3 text-left">Funcionário</th>
                      <th className="p-3 text-left">Cargo / Setor</th>
                      <th className="p-3 text-center">Turno</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Entrada Prev.</th>
                      <th className="p-3 text-center">Saída Prev.</th>
                      <th className="p-3 text-center">Entrada Real</th>
                      <th className="p-3 text-center">Saída Real</th>
                      <th className="p-3 text-center">Atraso / Extra</th>
                      <th className="p-3 text-center">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, idx) => {
                      const si = getStatusInfo(row.status);
                      const isExpanded = expandedRow === row.employeeId;
                      const rowIdx = rows.findIndex(r => r.employeeId === row.employeeId);

                      return (
                        <>
                          <tr
                            key={row.employeeId}
                            className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <td className="p-3 font-semibold">{row.employeeName}</td>
                            <td className="p-3 text-gray-600 text-xs">
                              {row.cargo || '—'}<br />
                              <span className="text-gray-400">{row.setor || ''}</span>
                            </td>
                            <td className="p-3 text-center">
                              <select
                                value={row.shift}
                                onChange={e => updateRow(rowIdx, 'shift', e.target.value)}
                                className="input input-sm text-xs w-28"
                              >
                                {SHIFT_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <select
                                value={row.status || ''}
                                onChange={e => updateRow(rowIdx, 'status', e.target.value || null)}
                                className={`input input-sm text-xs w-38 ${row.status ? si.color : 'bg-gray-100 text-gray-500'}`}
                              >
                                <option value="">— Não marcado —</option>
                                {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <input type="time" value={row.expectedEntryTime} onChange={e => updateRow(rowIdx, 'expectedEntryTime', e.target.value)} className="input input-sm text-xs w-24" />
                            </td>
                            <td className="p-3 text-center">
                              <input type="time" value={row.expectedExitTime} onChange={e => updateRow(rowIdx, 'expectedExitTime', e.target.value)} className="input input-sm text-xs w-24" />
                            </td>
                            <td className="p-3 text-center">
                              <input type="time" value={row.entryTime} onChange={e => updateRow(rowIdx, 'entryTime', e.target.value)} className="input input-sm text-xs w-24" />
                            </td>
                            <td className="p-3 text-center">
                              <input type="time" value={row.exitTime} onChange={e => updateRow(rowIdx, 'exitTime', e.target.value)} className="input input-sm text-xs w-24" />
                            </td>
                            <td className="p-3 text-center text-xs">
                              {(row.lateArrivalMinutes != null && row.lateArrivalMinutes > 0) && (
                                <span className="inline-block bg-red-100 text-red-700 rounded px-1 mb-0.5">
                                  -{fmtMin(row.lateArrivalMinutes)} atraso
                                </span>
                              )}
                              {(row.earlyDepartureMinutes != null && row.earlyDepartureMinutes > 0) && (
                                <span className="inline-block bg-orange-100 text-orange-700 rounded px-1 mb-0.5">
                                  -{fmtMin(row.earlyDepartureMinutes)} antecip.
                                </span>
                              )}
                              {(row.overtimeMinutes != null && row.overtimeMinutes > 0) && (
                                <span className="inline-block bg-green-100 text-green-700 rounded px-1 mb-0.5">
                                  +{fmtMin(row.overtimeMinutes)} extra
                                </span>
                              )}
                              {!row.lateArrivalMinutes && !row.earlyDepartureMinutes && !row.overtimeMinutes && '—'}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : row.employeeId)}
                                className="btn btn-sm btn-outline flex items-center gap-1 mx-auto"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {isExpanded ? 'Fechar' : 'Mais'}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${row.employeeId}-exp`} className="bg-blue-50 border-b border-blue-100">
                              <td colSpan={10} className="p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <label className="flex items-center gap-2 text-sm font-medium col-span-2 md:col-span-1">
                                    <input
                                      type="checkbox"
                                      checked={!!row.isPlantao}
                                      onChange={e => updateRow(rowIdx, 'isPlantao', e.target.checked)}
                                    />
                                    Plantão
                                  </label>
                                  {row.isPlantao && (
                                    <>
                                      <div>
                                        <label className="text-xs font-semibold">Início Plantão</label>
                                        <input type="time" value={row.plantaoStart || ''} onChange={e => updateRow(rowIdx, 'plantaoStart', e.target.value)} className="input input-sm w-full" />
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold">Fim Plantão</label>
                                        <input type="time" value={row.plantaoEnd || ''} onChange={e => updateRow(rowIdx, 'plantaoEnd', e.target.value)} className="input input-sm w-full" />
                                      </div>
                                    </>
                                  )}
                                  <div className="col-span-2">
                                    <label className="text-xs font-semibold">Justificativa</label>
                                    <input type="text" placeholder="Justificativa da ausência ou observação..." value={row.justification || ''} onChange={e => updateRow(rowIdx, 'justification', e.target.value)} className="input input-sm w-full" />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-xs font-semibold">Observações</label>
                                    <input type="text" placeholder="Observações adicionais..." value={row.observations || ''} onChange={e => updateRow(rowIdx, 'observations', e.target.value)} className="input input-sm w-full" />
                                  </div>
                                </div>
                                {/* Indicadores calculados */}
                                {(row.overtimeMinutes || row.earlyDepartureMinutes || row.lateArrivalMinutes) ? (
                                  <div className="flex gap-4 mt-3 text-xs">
                                    {(row.overtimeMinutes || 0) > 0 && <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded">⏰ Hora extra: {fmtMin(row.overtimeMinutes || 0)}</span>}
                                    {(row.earlyDepartureMinutes || 0) > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">↙ Saída antecip.: {fmtMin(row.earlyDepartureMinutes || 0)}</span>}
                                    {(row.lateArrivalMinutes || 0) > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">↗ Atraso: {fmtMin(row.lateArrivalMinutes || 0)}</span>}
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resumo e salvar */}
          {rows.length > 0 && (
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-4 text-sm flex-wrap">
                  {STATUS_OPTS.slice(0, 4).map(s => {
                    const count = rows.filter(r => r.status === s.value).length;
                    return count > 0 ? (
                      <span key={s.value} className={`px-2 py-1 rounded text-xs font-bold ${s.color}`}>
                        {s.label}: {count}
                      </span>
                    ) : null;
                  })}
                  <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">
                    Não marcados: {rows.filter(r => !r.status).length}
                  </span>
                </div>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="btn btn-primary flex items-center gap-2 px-6"
                >
                  <Save size={18} />
                  {saveMutation.isPending ? 'Salvando...' : '💾 Salvar Ponto do Dia'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ ABA: RELATÓRIOS ══════════════ */}
      {tab === 'relatorios' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold mb-1">Data Inicial</label>
                <input type="date" value={rptStart} onChange={e => setRptStart(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Data Final</label>
                <input type="date" value={rptEnd} onChange={e => setRptEnd(e.target.value)} className="input" />
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-sm font-semibold mb-1">Buscar funcionário</label>
                <input type="text" placeholder="Nome..." value={rptSearch} onChange={e => setRptSearch(e.target.value)} className="input" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => refetchRpt()} className="btn btn-outline flex items-center gap-1">
                  <RefreshCw size={14} /> Atualizar
                </button>
                <button onClick={printReport} className="btn btn-primary flex items-center gap-1">
                  <Printer size={14} /> Relatório Geral
                </button>
                <button onClick={printReportByRole} className="btn flex items-center gap-1 bg-teal-600 text-white hover:bg-teal-700">
                  <Printer size={14} /> Por Função
                </button>
              </div>
            </div>
          </div>

          {loadingRpt ? (
            <div className="text-center py-10 text-gray-500">Gerando relatório...</div>
          ) : filteredRpt.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Nenhum registro no período selecionado.</div>
          ) : (
            <>
              {/* Cards de resumo geral */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Presenças', value: filteredRpt.reduce((a,r)=>a+r.presentDays,0), color: 'bg-green-50 border-green-300 text-green-800' },
                  { label: 'Faltas', value: filteredRpt.reduce((a,r)=>a+r.absentDays,0), color: 'bg-red-50 border-red-300 text-red-800' },
                  { label: 'Atestados', value: filteredRpt.reduce((a,r)=>a+r.medicalLeaveDays,0), color: 'bg-blue-50 border-blue-300 text-blue-800' },
                  { label: 'Férias', value: filteredRpt.reduce((a,r)=>a+r.vacationDays,0), color: 'bg-purple-50 border-purple-300 text-purple-800' },
                  { label: 'H. Extra Total', value: fmtMin(filteredRpt.reduce((a,r)=>a+r.totalOvertimeMinutes,0)), color: 'bg-pink-50 border-pink-300 text-pink-800' },
                ].map(c => (
                  <div key={c.label} className={`card border-2 text-center ${c.color}`}>
                    <div className="text-2xl font-black">{c.value}</div>
                    <div className="text-xs font-semibold mt-1">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabela de relatório */}
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-purple-700 text-white">
                      <tr>
                        <th className="p-3 text-left">Funcionário</th>
                        <th className="p-3 text-left">Cargo/Setor</th>
                        <th className="p-3 text-center">Dias</th>
                        <th className="p-3 text-center text-green-200">Presente</th>
                        <th className="p-3 text-center text-red-200">Faltas</th>
                        <th className="p-3 text-center">Parcial</th>
                        <th className="p-3 text-center">Atestado</th>
                        <th className="p-3 text-center">Férias</th>
                        <th className="p-3 text-center">Justif.</th>
                        <th className="p-3 text-center">H. Trab.</th>
                        <th className="p-3 text-center">H. Extra</th>
                        <th className="p-3 text-center">S. Antec.</th>
                        <th className="p-3 text-center">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRpt.map((r, idx) => {
                        const isExp = expandedRpt === r.employeeId;
                        const freq = r.totalDays > 0 ? Math.round((r.presentDays / r.totalDays) * 100) : 0;
                        return (
                          <>
                            <tr key={r.employeeId} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="p-3 font-semibold">{r.employeeName}</td>
                              <td className="p-3 text-xs text-gray-600">{r.cargo || '—'}<br/><span className="text-gray-400">{r.setor}</span></td>
                              <td className="p-3 text-center">{r.totalDays}</td>
                              <td className="p-3 text-center font-bold text-green-700">{r.presentDays}</td>
                              <td className="p-3 text-center font-bold text-red-700">{r.absentDays}</td>
                              <td className="p-3 text-center text-orange-600">{r.partialDays}</td>
                              <td className="p-3 text-center text-blue-600">{r.medicalLeaveDays}</td>
                              <td className="p-3 text-center text-purple-600">{r.vacationDays}</td>
                              <td className="p-3 text-center text-yellow-600">{r.justifiedDays}</td>
                              <td className="p-3 text-center text-xs">{fmtMin(r.totalWorkedMinutes)}</td>
                              <td className="p-3 text-center text-xs text-pink-700">{fmtMin(r.totalOvertimeMinutes)}</td>
                              <td className="p-3 text-center text-xs text-orange-700">{fmtMin(r.totalEarlyDepartureMinutes)}</td>
                              <td className="p-3 text-center">
                                <button onClick={() => setExpandedRpt(isExp ? null : r.employeeId)} className="btn btn-sm btn-outline">
                                  {isExp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                              </td>
                            </tr>
                            {isExp && (
                              <tr key={`${r.employeeId}-exp`} className="bg-purple-50 border-b border-purple-100">
                                <td colSpan={13} className="p-4">
                                  <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold">Frequência:</span>
                                      <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-64">
                                        <div className={`h-3 rounded-full ${freq >= 75 ? 'bg-green-500' : freq >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${freq}%` }} />
                                      </div>
                                      <span className="text-sm font-bold">{freq}%</span>
                                      {freq < 75 && <span className="text-xs text-red-600 font-bold">⚠️ Abaixo de 75% (CLT)</span>}
                                    </div>
                                  </div>
                                  {r.absenceDates.length > 0 && (
                                    <div className="text-xs">
                                      <span className="font-semibold text-red-700">Datas de falta: </span>
                                      {r.absenceDates.map(d => fmtDate(d)).join(', ')}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════ ABA: NOTIFICAÇÕES ══════════════ */}
      {tab === 'notificacoes' && (
        <div className="space-y-4">
          <div className="card bg-amber-50 border border-amber-200">
            <h3 className="font-bold text-lg text-amber-800 mb-2 flex items-center gap-2">
              <Bell size={20} /> Notificações de Falta por Funcionário
            </h3>
            <p className="text-sm text-amber-700">
              Gere e imprima notificações automáticas de falta com base na CLT.
              Os documentos são gerados em nome da gestão da escola e incluem campos de assinatura.
            </p>
          </div>

          <div className="card">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold mb-1">Período — De</label>
                <input type="date" value={ntfStart} onChange={e => setNtfStart(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Até</label>
                <input type="date" value={ntfEnd} onChange={e => setNtfEnd(e.target.value)} className="input" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => refetchNtf()} className="btn btn-outline flex items-center gap-1">
                  <RefreshCw size={14} /> Buscar Faltosos
                </button>
                {ntfRecords.length > 0 && (
                  <button
                    onClick={() => printAllNotices(ntfRecords)}
                    className="btn btn-warning flex items-center gap-2"
                  >
                    <Printer size={16} /> Imprimir Todas ({ntfRecords.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {loadingNtf ? (
            <div className="text-center py-10 text-gray-500">Buscando faltosos...</div>
          ) : ntfRecords.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              Nenhuma falta não justificada no período selecionado.
            </div>
          ) : (
            <div className="space-y-2">
              {ntfRecords.map((r, idx) => (
                <div key={r._id || idx} className={`card border-2 flex items-center justify-between gap-4 flex-wrap ${r.notificationGenerated ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'}`}>
                  <div>
                    <div className="font-bold text-gray-800">{r.employeeName}</div>
                    <div className="text-xs text-gray-500">{r.cargo} · {r.setor}</div>
                    <div className="text-sm mt-1">
                      <span className="font-semibold">Data da falta: </span>
                      {fmtDate(r.date || '')} — {r.date ? DAYS_PT[new Date(r.date + 'T12:00:00').getDay()] : ''}
                    </div>
                    {r.justification && <div className="text-xs text-gray-500 mt-1">Justificativa: {r.justification}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    {r.notificationGenerated && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">✓ Notificação gerada</span>
                    )}
                    <button
                      onClick={() => printAbsenceNotice(r)}
                      className="btn btn-sm btn-error flex items-center gap-1"
                    >
                      <Printer size={14} />
                      {r.notificationGenerated ? 'Reimprimir' : 'Gerar e Imprimir'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aviso legal */}
          <div className="card bg-blue-50 border border-blue-200 text-sm text-blue-800">
            <p className="font-semibold mb-1">📌 Base Legal das Notificações:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>CLT Art. 473</strong> — Ausências justificadas (atestado médico, falecimento, casamento, etc.)</li>
              <li><strong>CLT Art. 482, 'e'</strong> — Desídia (falta habitual) como justa causa</li>
              <li><strong>CLT Art. 131</strong> — Dias que não prejudicam a contagem do descanso semanal</li>
              <li><strong>CLT Art. 58 §1º</strong> — Tolerância de até 5 minutos de atraso (máx. 10 min/dia)</li>
              <li>Para servidores públicos, aplicar normas do Estatuto do Servidor do ente respectivo.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ══════════════ ABA: CONFIGURAÇÕES ══════════════ */}
      {tab === 'configuracoes' && (
        <div className="card max-w-2xl space-y-6">
          <h2 className="text-lg font-bold text-gray-800">⚙️ Configurações do Ponto</h2>

          {/* ── Geolocalização ──────────────────────────────────────────────── */}
          <div className="space-y-4 border border-gray-200 rounded-xl p-4">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                📍 Local de Trabalho Fixo (Geolocalização)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Cadastre as coordenadas do local de trabalho. Quando ativado, o ponto só será aceito
                se o funcionário estiver dentro do raio permitido em relação a este local.
              </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={geoSettings.requireGeolocation}
                onChange={e => setGeoSettings(s => ({ ...s, requireGeolocation: e.target.checked }))}
                className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm font-medium">Exigir que o funcionário esteja no local de trabalho para marcar o ponto</span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Latitude do local de trabalho
                </label>
                <input type="number" step="any" value={geoSettings.latitude}
                  onChange={e => setGeoSettings(s => ({ ...s, latitude: e.target.value }))}
                  placeholder="-15.7801"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Longitude do local de trabalho
                </label>
                <input type="number" step="any" value={geoSettings.longitude}
                  onChange={e => setGeoSettings(s => ({ ...s, longitude: e.target.value }))}
                  placeholder="-47.9292"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {(geoSettings.latitude || geoSettings.longitude) && (
              <div className="text-xs bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-indigo-800">
                📌 Local registrado: {geoSettings.latitude || '—'}, {geoSettings.longitude || '—'}
                <br />
                <a
                  href={`https://www.google.com/maps?q=${geoSettings.latitude},${geoSettings.longitude}`}
                  target="_blank" rel="noreferrer"
                  className="text-indigo-600 underline mt-1 inline-block"
                >
                  Ver no Google Maps ↗
                </a>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Raio de tolerância (área permitida em m²)
              </label>
              <input type="number" min={100} value={geoSettings.areaM2}
                onChange={e => setGeoSettings(s => ({ ...s, areaM2: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-gray-500 mt-1">
                {geoSettings.areaM2 || 1000}m² → raio de aprox. <strong>{Math.round(Math.sqrt((geoSettings.areaM2 || 1000) / Math.PI))}m</strong>.
                O funcionário precisa estar dentro deste raio para marcar o ponto.
              </p>
            </div>

            <button type="button"
              onClick={() => {
                if (!navigator.geolocation) { alert('Geolocalização não suportada neste navegador.'); return; }
                navigator.geolocation.getCurrentPosition(pos => {
                  setGeoSettings(s => ({
                    ...s,
                    latitude: String(pos.coords.latitude),
                    longitude: String(pos.coords.longitude),
                  }));
                  toast.success('Coordenadas do local atual registradas!');
                }, () => toast.error('Não foi possível obter a localização. Verifique as permissões do navegador.'));
              }}
              className="btn btn-sm btn-secondary flex items-center gap-2">
              📡 Capturar coordenadas da minha localização atual
            </button>
          </div>

          {/* ── Foto ──────────────────────────────────────────────────────── */}
          <div className="space-y-3 border border-gray-200 rounded-xl p-4">
            <div>
              <h3 className="font-semibold text-gray-800">📸 Foto ao Vivo para Confirmação</h3>
              <p className="text-xs text-gray-500 mt-1">
                Quando ativado, o funcionário precisa tirar uma foto ao vivo pela câmera do dispositivo para confirmar o ponto.
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={geoSettings.requirePhoto}
                onChange={e => setGeoSettings(s => ({ ...s, requirePhoto: e.target.checked }))}
                className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm font-medium">Exigir foto ao vivo para confirmar o ponto</span>
            </label>
          </div>

          {/* ── Tolerância ─────────────────────────────────────────────── */}
          <div className="space-y-3 border border-gray-200 rounded-xl p-4">
            <div>
              <h3 className="font-semibold text-gray-800">⏱️ Tolerância de Horário</h3>
              <p className="text-xs text-gray-500 mt-1">
                Minutos de carência antes e depois do horário cadastrado. O funcionário verá aviso de pontualidade ao bater o ponto.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 flex-shrink-0">⏱️ Tolerância de entrada (minutos)</label>
              <input
                type="number" min="0" max="60"
                value={geoSettings.graceMinutes}
                onChange={e => setGeoSettings(s => ({ ...s, graceMinutes: Number(e.target.value) }))}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              <span className="text-xs text-gray-400">minutos antes e depois do horário</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              disabled={geoSaving || !geoLoaded}
              onClick={async () => {
                setGeoSaving(true);
                try {
                  await api.put('/attendance-links/school-link/settings', {
                    requireGeolocation: geoSettings.requireGeolocation,
                    latitude: geoSettings.latitude !== '' ? Number(geoSettings.latitude) : undefined,
                    longitude: geoSettings.longitude !== '' ? Number(geoSettings.longitude) : undefined,
                    areaM2: geoSettings.areaM2,
                    requirePhoto: geoSettings.requirePhoto,
                    graceMinutes: Number(geoSettings.graceMinutes),
                  });
                  toast.success('Configurações salvas com sucesso!');
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || 'Erro ao salvar.');
                } finally {
                  setGeoSaving(false);
                }
              }}
              className="btn btn-primary">
              {geoSaving ? 'Salvando...' : '💾 Salvar Configurações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
