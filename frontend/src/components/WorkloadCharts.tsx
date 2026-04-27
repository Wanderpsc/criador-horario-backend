import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Activity, TrendingUp, Layers, Info } from 'lucide-react';

interface TeacherSubjectWorkload {
  teacherId: string;
  teacherName: string;
  subjects: {
    subjectId: string;
    subjectName: string;
    classId?: string;
    className?: string;
    weeklyHours: number;
    annualHours: number;
    monthlyHours: number;
    dailyHours: number;
  }[];
  totalWeeklyHours: number;
  totalAnnualHours: number;
  totalMonthlyHours: number;
}

interface TeacherReport {
  teacherId: string;
  teacherName: string;
  weeklyWorkload: number;
  totalPredictedClasses: number;
  totalGivenClasses: number;
  totalDeficit: number;
  totalSurplus: number;
  subjectClassDetails: {
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
    predictedClasses: number;
    givenClasses: number;
    deficit: number;
    surplus: number;
  }[];
}

interface WorkloadChartsProps {
  teacherWorkload: TeacherSubjectWorkload[];
  filteredReports: TeacherReport[];
  monthName: string;
  year: number;
}

const GRADIENT_COLORS = [
  { start: '#6366f1', end: '#818cf8' },
  { start: '#8b5cf6', end: '#a78bfa' },
  { start: '#ec4899', end: '#f472b6' },
  { start: '#10b981', end: '#34d399' },
  { start: '#f59e0b', end: '#fbbf24' },
  { start: '#ef4444', end: '#f87171' },
  { start: '#06b6d4', end: '#22d3ee' },
  { start: '#84cc16', end: '#a3e635' },
  { start: '#f97316', end: '#fb923c' },
  { start: '#14b8a6', end: '#2dd4bf' },
  { start: '#e11d48', end: '#fb7185' },
  { start: '#0ea5e9', end: '#38bdf8' },
];

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Barra horizontal 3D
const HBar3D = (props: any) => {
  const { x, y, width, height, fill } = props;
  if (!width || width <= 0) return null;
  const depth = 5;
  const darker = adjustBrightness(fill || '#6366f1', -30);
  const lighter = adjustBrightness(fill || '#6366f1', 25);
  return (
    <g>
      <path
        d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`}
        fill={lighter} opacity={0.75}
      />
      <path
        d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`}
        fill={darker} opacity={0.6}
      />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} />
      <rect x={x + 3} y={y + 2} width={Math.max(width - 6, 0)} height={Math.min(4, height / 3)} fill="white" opacity={0.3} rx={2} />
    </g>
  );
};

// Tooltip moderno glassmorphism
const GlassTooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl rounded-xl" />
    <div className="relative p-4 rounded-xl border border-white/40 shadow-2xl shadow-black/10">
      {children}
    </div>
  </div>
);

const WorkloadCharts: React.FC<WorkloadChartsProps> = ({
  teacherWorkload,
  filteredReports,
  monthName,
  year
}) => {
  const [activeChart, setActiveChart] = useState<'workload' | 'distribution' | 'deficit' | 'comparison'>('workload');
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const hasWorkloadData = teacherWorkload.length > 0;
  const hasReportData = filteredReports.length > 0;
  const hasAnyData = hasWorkloadData || hasReportData;

  if (!hasAnyData) return null;

  // === DADOS ===
  const teacherBarData = teacherWorkload.map(t => ({
    name: t.teacherName.length > 18 ? t.teacherName.substring(0, 18) + '…' : t.teacherName,
    fullName: t.teacherName,
    semanal: t.totalWeeklyHours,
    mensal: t.totalMonthlyHours,
    anual: t.totalAnnualHours,
    disciplinas: t.subjects.length
  }));

  const subjectAgg = new Map<string, { name: string; weekly: number; monthly: number; annual: number; count: number; teachers: Set<string> }>();
  teacherWorkload.forEach(t => {
    t.subjects.forEach(s => {
      const ex = subjectAgg.get(s.subjectId) || { name: s.subjectName, weekly: 0, monthly: 0, annual: 0, count: 0, teachers: new Set() };
      ex.weekly += s.weeklyHours;
      ex.monthly += s.monthlyHours;
      ex.annual += s.annualHours;
      ex.count += 1;
      ex.teachers.add(t.teacherName);
      subjectAgg.set(s.subjectId, ex);
    });
  });
  const pieData = Array.from(subjectAgg.values())
    .map(s => ({ name: s.name, value: s.weekly, monthly: s.monthly, annual: s.annual, lotacoes: s.count, teachers: Array.from(s.teachers) }))
    .sort((a, b) => b.value - a.value);

  const deficitData = filteredReports.map(r => ({
    name: r.teacherName.length > 18 ? r.teacherName.substring(0, 18) + '…' : r.teacherName,
    fullName: r.teacherName,
    previsto: r.totalPredictedClasses,
    dado: r.totalGivenClasses,
    deficit: r.totalDeficit > 0 ? -r.totalDeficit : 0,
    saldo: r.totalSurplus,
    percentual: r.totalPredictedClasses > 0 ? Math.round((r.totalGivenClasses / r.totalPredictedClasses) * 100) : 0
  }));

  const radarData = teacherWorkload.slice(0, 8).map(t => ({
    teacher: t.teacherName.length > 12 ? t.teacherName.substring(0, 12) + '…' : t.teacherName,
    fullName: t.teacherName,
    semanal: t.totalWeeklyHours,
    mensal: t.totalMonthlyHours,
    anual: Math.round(t.totalAnnualHours / 10)
  }));

  const totalWeekly = teacherWorkload.reduce((s, t) => s + t.totalWeeklyHours, 0);
  const totalMonthly = teacherWorkload.reduce((s, t) => s + t.totalMonthlyHours, 0);
  const totalAnnual = teacherWorkload.reduce((s, t) => s + t.totalAnnualHours, 0);
  const totalDisciplinas = new Set(teacherWorkload.flatMap(t => t.subjects.map(s => s.subjectId))).size;
  const avgWeekly = hasWorkloadData ? Math.round(totalWeekly / teacherWorkload.length * 10) / 10 : 0;

  // Tooltips
  const TooltipWorkload = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <GlassTooltip>
        <p className="font-bold text-gray-900 text-sm mb-2 border-b border-gray-200 pb-1">{d?.fullName}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 flex-1">{entry.name}:</span>
              <span className="font-bold" style={{ color: entry.color }}>{entry.value}h</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-1.5 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1">
          <Layers size={12} /> {d?.disciplinas} disciplina(s) lotadas
        </div>
      </GlassTooltip>
    );
  };

  const TooltipPie = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <GlassTooltip>
        <p className="font-bold text-gray-900 text-sm mb-2">{d.name}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-gray-500">Semanal:</span><span className="font-bold text-indigo-700">{d.value}h</span>
          <span className="text-gray-500">Mensal:</span><span className="font-bold text-purple-700">{d.monthly}h</span>
          <span className="text-gray-500">Anual:</span><span className="font-bold text-green-700">{d.annual}h</span>
        </div>
        <div className="mt-2 pt-1.5 border-t border-gray-100 text-xs text-gray-500">
          {d.lotacoes} lotação(ões) • {d.teachers?.length} professor(es)
        </div>
      </GlassTooltip>
    );
  };

  const TooltipDeficit = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const status = d?.percentual >= 100 ? 'Em dia ✅' : d?.percentual >= 80 ? 'Atenção ⚠️' : 'Crítico 🔴';
    return (
      <GlassTooltip>
        <p className="font-bold text-gray-900 text-sm mb-1">{d?.fullName}</p>
        <div className="flex items-center gap-2 mb-2">
          <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            d?.percentual >= 100 ? 'bg-green-100 text-green-800' :
            d?.percentual >= 80 ? 'bg-amber-100 text-amber-800' :
            'bg-red-100 text-red-800'
          }`}>{status} — {d?.percentual}%</div>
        </div>
        <div className="space-y-1 text-sm">
          {payload.filter((e: any) => e.dataKey !== 'percentual').map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 flex-1">{entry.name}:</span>
              <span className="font-bold" style={{ color: entry.color }}>{Math.abs(entry.value)} aulas</span>
            </div>
          ))}
        </div>
      </GlassTooltip>
    );
  };

  const chartButtons = [
    { key: 'workload' as const, label: 'Carga Horária', icon: BarChart3, gradient: 'from-indigo-500 to-purple-600', visible: hasWorkloadData },
    { key: 'distribution' as const, label: 'Disciplinas', icon: PieIcon, gradient: 'from-fuchsia-500 to-pink-600', visible: hasWorkloadData },
    { key: 'deficit' as const, label: 'Déficit/Saldo', icon: TrendingUp, gradient: 'from-red-500 to-orange-500', visible: hasReportData },
    { key: 'comparison' as const, label: 'Comparativo', icon: Activity, gradient: 'from-emerald-500 to-teal-600', visible: hasWorkloadData },
  ].filter(b => b.visible);

  return (
    <div className="mt-8 mb-6 rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)' }}>

      {/* Header futurista */}
      <div className="relative p-6 pb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/5 to-cyan-500/10" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-xl blur-lg opacity-50" />
            <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <BarChart3 className="text-white" size={28} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Análise Gráfica de Dados
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Visualização interativa • {monthName}/{year} •&nbsp;
              <span className="text-indigo-400">{teacherWorkload.length} professores</span> •&nbsp;
              <span className="text-purple-400">{totalDisciplinas} disciplinas</span>
            </p>
          </div>
          <button
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            className={`p-2 rounded-lg transition-all ${showInfoPanel ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            <Info size={20} />
          </button>
        </div>

        {showInfoPanel && (
          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 space-y-1">
            <p>📌 <strong className="text-indigo-300">Semanal:</strong> Prioridade: 1° Override da lotação → 2° Horas da turma → 3° Slots do horário → 4° Padrão da disciplina</p>
            <p>📌 <strong className="text-purple-300">Mensal:</strong> Aulas/dia × dias letivos daquele dia da semana no mês</p>
            <p>📌 <strong className="text-green-300">Anual:</strong> Semanal × 40 semanas letivas</p>
            <p>📌 <strong className="text-cyan-300">Diária:</strong> Média de aulas nos dias em que o professor leciona</p>
          </div>
        )}
      </div>

      {/* Cards de métricas */}
      {hasWorkloadData && (
        <div className="px-6 grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Total Semanal', value: `${totalWeekly}h`, color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30', text: 'text-indigo-300' },
            { label: 'Total Mensal', value: `${totalMonthly}h`, color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', text: 'text-purple-300' },
            { label: 'Total Anual', value: `${totalAnnual}h`, color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30', text: 'text-emerald-300' },
            { label: 'Média Sem./Prof', value: `${avgWeekly}h`, color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30', text: 'text-amber-300' },
            { label: 'Disciplinas', value: `${totalDisciplinas}`, color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30', text: 'text-cyan-300' },
          ].map((card, i) => (
            <div key={i} className={`relative rounded-xl bg-gradient-to-br ${card.color} border ${card.border} p-3 overflow-hidden`}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.03] rounded-full -translate-y-8 translate-x-4" />
              <div className={`text-[10px] uppercase tracking-wider font-semibold ${card.text} opacity-80`}>{card.label}</div>
              <div className="text-2xl font-black text-white mt-0.5">{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs futuristas */}
      <div className="px-6 flex flex-wrap gap-2 mb-5">
        {chartButtons.map(btn => {
          const Icon = btn.icon;
          const isActive = activeChart === btn.key;
          return (
            <button
              key={btn.key}
              onClick={() => setActiveChart(btn.key)}
              className={`relative px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                isActive
                  ? `bg-gradient-to-r ${btn.gradient} text-white shadow-lg shadow-black/30`
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {isActive && <div className="absolute inset-0 rounded-xl bg-white/10" />}
              <Icon size={16} className="relative" />
              <span className="relative">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Área do gráfico */}
      <div className="mx-6 mb-6 rounded-xl overflow-hidden border border-white/10"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)' }}>

        {/* 1. CARGA HORÁRIA */}
        {activeChart === 'workload' && hasWorkloadData && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Carga Horária por Professor</h3>
              <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">Semanal vs Mensal (h/aula)</span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(320, teacherBarData.length * 55)}>
              <BarChart data={teacherBarData} layout="vertical" margin={{ left: 10, right: 50, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradSemanal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                  <linearGradient id="gradMensal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} tickLine={{ stroke: '#475569' }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipWorkload />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} formatter={(v: string) => <span style={{ color: '#cbd5e1' }}>{v}</span>} />
                <Bar dataKey="semanal" name="Semanal (h)" fill="url(#gradSemanal)" shape={<HBar3D />} barSize={18}>
                  <LabelList dataKey="semanal" position="right" fill="#818cf8" fontSize={11} fontWeight="bold" formatter={((v: number | string) => `${typeof v === 'number' ? v : 0}h`) as any} />
                </Bar>
                <Bar dataKey="mensal" name="Mensal (h)" fill="url(#gradMensal)" shape={<HBar3D />} barSize={18}>
                  <LabelList dataKey="mensal" position="right" fill="#c084fc" fontSize={11} fontWeight="bold" formatter={((v: number | string) => `${typeof v === 'number' ? v : 0}h`) as any} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 2. DISTRIBUIÇÃO POR DISCIPLINA */}
        {activeChart === 'distribution' && hasWorkloadData && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Distribuição de Carga por Disciplina</h3>
              <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">Horas semanais totais</span>
            </div>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="w-full lg:w-3/5">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <defs>
                      {pieData.map((_, i) => (
                        <linearGradient key={`pg${i}`} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={GRADIENT_COLORS[i % GRADIENT_COLORS.length].start} />
                          <stop offset="100%" stopColor={GRADIENT_COLORS[i % GRADIENT_COLORS.length].end} />
                        </linearGradient>
                      ))}
                      <filter id="shadow3d">
                        <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3" />
                      </filter>
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={145}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={1}
                      style={{ filter: 'url(#shadow3d)' }}
                      label={({ name, value, percent }: any) => `${name} · ${value}h (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={`url(#pieGrad${i})`} />
                      ))}
                    </Pie>
                    <Tooltip content={<TooltipPie />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-2/5 space-y-2 max-h-[380px] overflow-y-auto pr-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition">
                    <div className="w-4 h-4 rounded-md flex-shrink-0 shadow-inner" style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS[i % GRADIENT_COLORS.length].start}, ${GRADIENT_COLORS[i % GRADIENT_COLORS.length].end})` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-gray-500">{item.lotacoes} lotação(ões) • {item.teachers.length} prof.</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-indigo-300">{item.value}h<span className="text-[10px] text-gray-500">/sem</span></div>
                      <div className="text-[10px] text-gray-500">{item.annual}h/ano</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. DÉFICIT E SALDO */}
        {activeChart === 'deficit' && hasReportData && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Déficits e Saldos — {monthName}/{year}</h3>
              <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">Previsto vs Dado + % cumprimento</span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(350, deficitData.length * 55)}>
              <ComposedChart data={deficitData} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradPrev" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  <linearGradient id="gradDado" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipDeficit />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(v: string) => <span style={{ color: '#cbd5e1' }}>{v}</span>} />
                <Bar dataKey="previsto" name="Previsto" fill="url(#gradPrev)" shape={<HBar3D />} barSize={14}>
                  <LabelList dataKey="previsto" position="right" fill="#60a5fa" fontSize={10} fontWeight="bold" />
                </Bar>
                <Bar dataKey="dado" name="Dado" fill="url(#gradDado)" shape={<HBar3D />} barSize={14}>
                  <LabelList dataKey="dado" position="right" fill="#34d399" fontSize={10} fontWeight="bold" />
                </Bar>
                <Line type="monotone" dataKey="percentual" name="Cumprimento (%)" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 5, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            {/* Cards de situação */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {deficitData
                .sort((a, b) => a.percentual - b.percentual)
                .map((d, i) => {
                  const st = d.percentual >= 100 ? 'ok' : d.percentual >= 80 ? 'warn' : 'crit';
                  const bg = { ok: 'bg-emerald-500/10 border-emerald-500/20', warn: 'bg-amber-500/10 border-amber-500/20', crit: 'bg-red-500/10 border-red-500/20' };
                  const badge = { ok: 'bg-emerald-400/20 text-emerald-300', warn: 'bg-amber-400/20 text-amber-300', crit: 'bg-red-400/20 text-red-300' };
                  return (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${bg[st]} transition-all hover:scale-[1.01]`}>
                      <div className={`px-2 py-0.5 rounded-md text-xs font-bold ${badge[st]}`}>{d.percentual}%</div>
                      <span className="text-sm text-white truncate flex-1">{d.fullName}</span>
                      <div className="text-right text-xs">
                        <span className="text-blue-400">{d.previsto}</span>
                        <span className="text-gray-600 mx-1">→</span>
                        <span className="text-emerald-400">{d.dado}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 4. COMPARATIVO RADAR */}
        {activeChart === 'comparison' && hasWorkloadData && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Comparativo de Carga Horária</h3>
              <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">Semanal • Mensal • Anual (÷10)</span>
            </div>
            {radarData.length > 0 ? (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-3/5">
                  <ResponsiveContainer width="100%" height={420}>
                    <RadarChart data={radarData}>
                      <defs>
                        <linearGradient id="radarSem" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="radarMen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="radarAnu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="teacher" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                      <Radar name="Semanal (h)" dataKey="semanal" stroke="#818cf8" fill="url(#radarSem)" strokeWidth={2} dot={{ r: 4, fill: '#6366f1', stroke: '#0f172a', strokeWidth: 2 }} />
                      <Radar name="Mensal (h)" dataKey="mensal" stroke="#c084fc" fill="url(#radarMen)" strokeWidth={2} dot={{ r: 4, fill: '#a855f7', stroke: '#0f172a', strokeWidth: 2 }} />
                      <Radar name="Anual (÷10)" dataKey="anual" stroke="#34d399" fill="url(#radarAnu)" strokeWidth={2} dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={(v: string) => <span style={{ color: '#cbd5e1' }}>{v}</span>} />
                      <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, color: '#e2e8f0', fontSize: 12 }} labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                  {teacherWorkload.length > 8 && (
                    <p className="text-xs text-gray-600 text-center mt-1">Exibindo os 8 primeiros de {teacherWorkload.length} professores</p>
                  )}
                </div>
                {/* Ranking */}
                <div className="w-full lg:w-2/5">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">🏆 Ranking — Carga Semanal</h4>
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {[...teacherWorkload]
                      .sort((a, b) => b.totalWeeklyHours - a.totalWeeklyHours)
                      .map((t, i) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const maxW = Math.max(...teacherWorkload.map(x => x.totalWeeklyHours));
                        const barW = maxW > 0 ? Math.round((t.totalWeeklyHours / maxW) * 100) : 0;
                        return (
                          <div key={t.teacherId} className="relative p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:bg-white/[0.06] transition">
                            <div className="absolute inset-y-0 left-0 opacity-[0.07]" style={{ width: `${barW}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
                            <div className="relative flex items-center gap-3">
                              <span className="text-base w-6 text-center">
                                {i < 3 ? medals[i] : <span className="text-xs text-gray-600 font-bold">{i + 1}º</span>}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{t.teacherName}</div>
                                <div className="text-[10px] text-gray-500">{t.subjects.length} disc. • {t.totalMonthlyHours}h/mês</div>
                              </div>
                              <div className="text-lg font-black text-indigo-300">{t.totalWeeklyHours}h</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Dados insuficientes para o gráfico comparativo</p>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
    </div>
  );
};

export default WorkloadCharts;
