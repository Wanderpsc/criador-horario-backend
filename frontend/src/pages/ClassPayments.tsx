import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import {
  DollarSign, Calendar, Clock, User, Link2, Copy, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Eye, Trash2, Plus, BookOpen,
  GraduationCap, Share2, ExternalLink, Printer,
} from 'lucide-react';

interface Gap {
  period: number;
  startTime: string;
  endTime: string;
  absentTeacherId: string;
  absentTeacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  alreadyPaid: boolean;
  paymentId?: string;
}

interface ClassPayment {
  _id: string;
  date: string;
  period: number;
  startTime: string;
  endTime: string;
  absentTeacherName: string;
  substituteTeacherName: string;
  className: string;
  subjectName: string;
  status: 'pending' | 'filled' | 'paid';
  filledViaLink: boolean;
  notes: string;
  createdAt: string;
}

interface SubstituteLink {
  _id: string;
  token: string;
  date: string;
  dateLabel: string;
  slots: any[];
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
}

const statusLabel = (s: ClassPayment['status']) =>
  s === 'paid' ? 'Pago' : s === 'filled' ? 'Preenchido' : 'Pendente';
const statusColor = (s: ClassPayment['status']) =>
  s === 'paid' ? 'bg-green-100 text-green-800' :
  s === 'filled' ? 'bg-blue-100 text-blue-800' :
  'bg-yellow-100 text-yellow-800';

export default function ClassPayments() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'gaps' | 'payments' | 'links' | 'report'>('gaps');

  // ── Filtros do relatório ────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 8) + '01';
  const [reportFrom, setReportFrom] = useState(firstOfMonth);
  const [reportTo, setReportTo] = useState(today);
  const [reportStatus, setReportStatus] = useState<'all' | 'paid' | 'filled'>('all');

  const { data: reportPayments = [], isLoading: loadingReport, refetch: refetchReport } = useQuery({
    queryKey: ['class-payments-report', reportFrom, reportTo, reportStatus],
    queryFn: async () => {
      const res = await api.get('/class-payments', {
        params: { startDate: reportFrom, endDate: reportTo },
      });
      const all = res.data as ClassPayment[];
      if (reportStatus === 'all') return all;
      return all.filter(p => p.status === reportStatus);
    },
    enabled: false, // só busca quando clicar em Gerar
  });

  const handleGenerateReport = () => refetchReport();

  const handlePrint = () => {
    window.print();
  };

  // ── Lacunas do dia ──────────────────────────────────────────────────────────
  const { data: gapsData, isLoading: loadingGaps, refetch: refetchGaps } = useQuery({
    queryKey: ['class-payment-gaps', selectedDate],
    queryFn: async () => {
      const res = await api.get('/class-payments/gaps', { params: { date: selectedDate } });
      return res.data as { date: string; gaps: Gap[] };
    },
  });

  // ── Pagamentos registrados ──────────────────────────────────────────────────
  const [filterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear] = useState(new Date().getFullYear());
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['class-payments', filterMonth, filterYear],
    queryFn: async () => {
      const res = await api.get('/class-payments', { params: { month: filterMonth, year: filterYear } });
      return res.data as ClassPayment[];
    },
  });

  // ── Links gerados ───────────────────────────────────────────────────────────
  const { data: links = [], isLoading: loadingLinks, refetch: refetchLinks } = useQuery({
    queryKey: ['substitute-links'],
    queryFn: async () => {
      const res = await api.get('/substitute-links');
      return res.data as SubstituteLink[];
    },
    refetchInterval: 30_000, // atualiza automaticamente a cada 30s
  });

  // ── Gerar link ──────────────────────────────────────────────────────────────
  const generateLinkMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await api.post('/substitute-links', { date });
      return res.data as SubstituteLink;
    },
    onSuccess: (data) => {
      toast.success('🔗 Link gerado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['substitute-links'] });
      const url = buildLinkUrl(data.token);
      copyToClipboard(url);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao gerar link'),
  });

  // ── Desativar link ──────────────────────────────────────────────────────────
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/substitute-links/${id}`),
    onSuccess: () => {
      toast.success('Link desativado');
      queryClient.invalidateQueries({ queryKey: ['substitute-links'] });
    },
  });

  // ── Atualizar slots do link com ausências atuais ────────────────────────────
  const refreshLinkMutation = useMutation({
    mutationFn: async (id: string) => api.put(`/substitute-links/${id}/refresh`),
    onSuccess: () => {
      toast.success('✅ Link atualizado com as ausências atuais!');
      queryClient.invalidateQueries({ queryKey: ['substitute-links'] });
      queryClient.invalidateQueries({ queryKey: ['class-payment-gaps', selectedDate] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao atualizar link'),
  });

  // ── Marcar pagamento como pago ──────────────────────────────────────────────
  const markPaidMutation = useMutation({
    mutationFn: async (id: string) =>
      api.patch(`/class-payments/${id}/status`, { status: 'paid' }),
    onSuccess: () => {
      toast.success('Marcado como pago!');
      queryClient.invalidateQueries({ queryKey: ['class-payments'] });
    },
  });

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
    .replace('/api', '');
  const buildLinkUrl = (token: string) => `${window.location.origin}/#/substitute/${token}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Link copiado!'));
  };

  const gaps = gapsData?.gaps || [];
  const openGaps = gaps.filter(g => !g.alreadyPaid);
  const filledGaps = gaps.filter(g => g.alreadyPaid);

  const linksForDate = links.filter(l => l.date === selectedDate);
  const hasActiveLink = linksForDate.some(l => l.isActive);

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Pagamento de Aulas</h1>
            <p className="text-indigo-100 text-sm">
              Gerencie lacunas por ausência, substitutos e adiantamentos
            </p>
          </div>
        </div>
      </div>

      {/* Seletor de data + ações */}
      <div className="bg-white rounded-xl shadow p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => refetchGaps()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
        {openGaps.length > 0 && (
          <button
            onClick={() => {
              if (hasActiveLink) {
                const link = linksForDate.find(l => l.isActive)!;
                copyToClipboard(buildLinkUrl(link.token));
              } else {
                generateLinkMutation.mutate(selectedDate);
              }
            }}
            disabled={generateLinkMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            {hasActiveLink ? 'Copiar Link Existente' : 'Gerar Link para Professores'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {(['gaps', 'payments', 'links', 'report'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'gaps' && `🕳️ Lacunas do Dia (${openGaps.length})`}
            {tab === 'payments' && `💳 Pagamentos`}
            {tab === 'links' && `🔗 Links Gerados`}
            {tab === 'report' && `🖨️ Relatório`}
          </button>
        ))}
      </div>

      {/* ── TAB: Lacunas ── */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          {loadingGaps && (
            <div className="text-center py-10 text-gray-500">Carregando lacunas...</div>
          )}

          {!loadingGaps && openGaps.length === 0 && filledGaps.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-700">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Nenhuma ausência registrada para {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}.</p>
              <p className="text-sm mt-1">Registre as presenças na página de Frequência dos Professores.</p>
            </div>
          )}

          {openGaps.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Lacunas Abertas — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openGaps.map((gap, i) => (
                  <div key={i} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                        {gap.startTime}–{gap.endTime} | {gap.period}º período
                      </span>
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-gray-700">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">Ausente:</span> {gap.absentTeacherName}
                      </div>
                      <div className="flex items-center gap-1 text-gray-700">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                        {gap.className}
                      </div>
                      <div className="flex items-center gap-1 text-gray-700">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                        {gap.subjectName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filledGaps.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Lacunas Preenchidas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filledGaps.map((gap, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm opacity-80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                        {gap.startTime}–{gap.endTime} | {gap.period}º
                      </span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-sm text-gray-600">
                      <div><span className="font-medium">Ausente:</span> {gap.absentTeacherName}</div>
                      <div>{gap.className} — {gap.subjectName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link ativo para esta data */}
          {hasActiveLink && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm font-medium text-indigo-800 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Link ativo para esta data:
              </p>
              {linksForDate.filter(l => l.isActive).map(link => (
                <div key={link._id} className="flex items-center gap-2">
                  <code className="text-xs bg-white border rounded px-2 py-1 flex-1 truncate">
                    {buildLinkUrl(link.token)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(buildLinkUrl(link.token))}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`#/substitute/${link.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
                    title="Abrir"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => refreshLinkMutation.mutate(link._id)}
                    disabled={refreshLinkMutation.isPending}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded disabled:opacity-50"
                    title="Atualizar ausências do link"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-indigo-600 mt-2">
                ✉️ Envie este link pelo WhatsApp/e-mail para os professores disponíveis preencherem a lacuna.
                {' '}Use <RefreshCw className="w-3 h-3 inline" /> para incluir novas ausências registradas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Pagamentos ── */}
      {activeTab === 'payments' && (
        <div>
          {loadingPayments && <div className="text-center py-10 text-gray-500">Carregando...</div>}
          {!loadingPayments && payments.length === 0 && (
            <div className="text-center py-10 text-gray-400">Nenhum pagamento registrado.</div>
          )}
          {payments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse bg-white rounded-xl shadow overflow-hidden">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Período</th>
                    <th className="p-3 text-left">Ausente</th>
                    <th className="p-3 text-left">Substituto</th>
                    <th className="p-3 text-left">Turma</th>
                    <th className="p-3 text-left">Disciplina</th>
                    <th className="p-3 text-center">Origem</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-3 whitespace-nowrap">
                        {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3">{p.period}º</td>
                      <td className="p-3">{p.absentTeacherName || '—'}</td>
                      <td className="p-3 font-medium text-indigo-700">
                        {p.substituteTeacherName || '—'}
                      </td>
                      <td className="p-3">{p.className}</td>
                      <td className="p-3">{p.subjectName}</td>
                      <td className="p-3 text-center">
                        {p.filledViaLink ? (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                            Via Link
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => markPaidMutation.mutate(p._id)}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded-full hover:bg-green-700"
                          >
                            Marcar Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Links ── */}
      {activeTab === 'links' && (
        <div className="space-y-3">
          {loadingLinks && <div className="text-center py-10 text-gray-500">Carregando...</div>}
          {!loadingLinks && links.length === 0 && (
            <div className="text-center py-10 text-gray-400">Nenhum link gerado ainda.</div>
          )}
          {links.map(link => {
            const url = buildLinkUrl(link.token);
            const filled = link.slots.filter((s: any) => s.isFilled).length;
            return (
              <div
                key={link._id}
                className={`bg-white rounded-xl border shadow-sm p-4 ${
                  !link.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">
                        {link.dateLabel || new Date(link.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        link.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {link.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {filled}/{link.slots.length} lacunas preenchidas
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 truncate max-w-xs">
                        {url}
                      </code>
                      <button
                        onClick={() => copyToClipboard(url)}
                        className="p-1 text-indigo-500 hover:text-indigo-700"
                        title="Copiar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`#/substitute/${link.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-indigo-500 hover:text-indigo-700"
                        title="Abrir link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    {/* Slots */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {link.slots.map((s: any) => (
                        <span
                          key={s._id}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            s.isFilled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.period}º — {s.className} — {s.absentTeacherName}
                          {s.isFilled ? ` ✓ ${s.filledBy}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  {link.isActive && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => refreshLinkMutation.mutate(link._id)}
                        disabled={refreshLinkMutation.isPending}
                        className="text-indigo-400 hover:text-indigo-600 p-1 disabled:opacity-50"
                        title="Atualizar ausências"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Desativar este link?')) deactivateMutation.mutate(link._id);
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Desativar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: Relatório ── */}
      {activeTab === 'report' && (
        <div className="space-y-5">
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow p-5 no-print">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-500" />
              Relatório de Aulas Pagas / Adiantadas
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
                <input
                  type="date"
                  value={reportFrom}
                  onChange={e => setReportFrom(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
                <input
                  type="date"
                  value={reportTo}
                  onChange={e => setReportTo(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={reportStatus}
                  onChange={e => setReportStatus(e.target.value as any)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="paid">Pago</option>
                  <option value="filled">Preenchido</option>
                </select>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={loadingReport}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loadingReport ? 'Buscando...' : 'Gerar Relatório'}
              </button>
              {reportPayments.length > 0 && (
                <button
                  onClick={handlePrint}
                  className="px-5 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              )}
            </div>
          </div>

          {/* Área imprimível */}
          {reportPayments.length > 0 && (
            <div id="report-print-area" className="bg-white rounded-xl shadow overflow-hidden">
              {/* Cabeçalho do relatório */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Relatório de Aulas Pagas / Adiantadas
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Período: {new Date(reportFrom + 'T12:00:00').toLocaleDateString('pt-BR')} a{' '}
                  {new Date(reportTo + 'T12:00:00').toLocaleDateString('pt-BR')}
                  {reportStatus !== 'all' && ` · Status: ${statusLabel(reportStatus as ClassPayment['status'])}`}
                  {' '}· Total: {reportPayments.length} aula(s)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-indigo-600 text-white text-left">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Horário</th>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3">Professor Substituto</th>
                      <th className="px-4 py-3">Prof. Ausente</th>
                      <th className="px-4 py-3">Turma</th>
                      <th className="px-4 py-3">Disciplina</th>
                      <th className="px-4 py-3 text-center">Tipo</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportPayments.map((p, i) => (
                      <tr
                        key={p._id}
                        className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-800">
                          {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                          {p.startTime}{p.endTime ? `–${p.endTime}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-center font-medium text-gray-700">
                          {p.period}º
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-indigo-700">
                          {p.substituteTeacherName || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {p.absentTeacherName || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{p.className}</td>
                        <td className="px-4 py-2.5 text-gray-700">{p.subjectName}</td>
                        <td className="px-4 py-2.5 text-center">
                          {p.filledViaLink ? (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                              Via Link
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>
                            {statusLabel(p.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50 font-semibold text-indigo-800">
                      <td colSpan={9} className="px-4 py-3 text-right">
                        Total: {reportPayments.length} aula(s)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Espaço para assinatura na impressão */}
              <div className="hidden print:flex p-6 pt-12 gap-16 justify-end">
                <div className="text-center">
                  <div className="border-t border-gray-400 w-48 mb-1" />
                  <p className="text-xs text-gray-600">Responsável</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 w-48 mb-1" />
                  <p className="text-xs text-gray-600">Direção</p>
                </div>
              </div>
            </div>
          )}

          {!loadingReport && reportPayments.length === 0 && (
            <div className="text-center py-12 text-gray-400 no-print">
              Selecione o período e clique em <strong>Gerar Relatório</strong>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
