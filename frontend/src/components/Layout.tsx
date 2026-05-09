import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PrintHeader from './PrintHeader';
import { 
  Home, 
  Users, 
  BookOpen, 
  Calendar, 
  LogOut,
  Settings,
  DollarSign,
  UserPlus,
  GraduationCap,
  School,
  Building2,
  Grid3x3,
  Link as LinkIcon,
  Bell,
  Tv,
  Zap,
  ShieldCheck,
  Database,
  CreditCard,
  Mail,
  TrendingUp,
  FileText,
  CheckCircle,
  BarChart3,
  ScrollText,
  CalendarCheck,
  Briefcase,
  Palmtree,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import NotificationCenter from './NotificationCenter';
import { loadPrintHeader } from '../utils/printHeader';
import { toast } from 'react-hot-toast';

export default function Layout() {
  const { user, logout, schoolYear, setSchoolYear } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prevSchoolYear = useRef<number | null>(null);
  const location = useLocation();
  const [sidebarSchoolName, setSidebarSchoolName] = useState<string>('');
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchName = () => {
      loadPrintHeader().then(h => {
        setSidebarSchoolName(h.line2 || h.schoolName || '');
      });
    };
    fetchName();
    window.addEventListener('printHeaderUpdated', fetchName);
    return () => window.removeEventListener('printHeaderUpdated', fetchName);
  }, []);

  // Invalidar todo o cache do React Query ao mudar de ano letivo
  // para forçar refetch com o novo schoolYear no interceptor do axios
  useEffect(() => {
    if (prevSchoolYear.current !== null && prevSchoolYear.current !== schoolYear) {
      queryClient.invalidateQueries();
      toast.success(`Ano letivo ${schoolYear} ativo`, { icon: '🗓️', id: 'school-year-switch' });
    }
    prevSchoolYear.current = schoolYear;
  }, [schoolYear, queryClient]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { 
      icon: Home, 
      label: 'Painel Principal', 
      path: '/dashboard',
      description: '📊 Visão geral com estatísticas e resumo do sistema',
      color: 'blue',
      subtitle: 'Início'
    },
    ...(user?.role !== 'admin' && user?.role !== 'super-admin'
      ? [
          { 
            divider: true, 
            label: '📋 ETAPA 1: CADASTROS BÁSICOS', 
            path: '#',
            description: '👉 Configure sua escola primeiro - Professores, Disciplinas, Séries e Turmas'
          },
          { 
            icon: Users, 
            label: 'Professores', 
            path: '/teachers',
            description: '👨‍🏫 Cadastre os professores da escola com suas informações',
            step: '1',
            color: 'purple',
            subtitle: 'Corpo Docente'
          },
          { 
            icon: BookOpen, 
            label: 'Componentes Curriculares', 
            path: '/subjects',
            description: '📚 Adicione as disciplinas (Matemática, Português, etc.)',
            step: '2',
            color: 'green',
            subtitle: 'Disciplinas'
          },
          { 
            icon: GraduationCap, 
            label: 'Anos / Séries', 
            path: '/grades',
            description: '🎓 Defina os níveis de ensino (6º Ano, 1ª Série, etc.)',
            step: '3',
            color: 'orange',
            subtitle: 'Níveis de Ensino'
          },
          { 
            icon: School, 
            label: 'Turmas', 
            path: '/classes',
            description: '🏫 Crie as turmas (6º A, 6º B, etc.) e defina capacidade',
            step: '4',
            color: 'red',
            subtitle: 'Classes e Salas'
          },
          { 
            divider: true, 
            label: '🔗 ETAPA 2: ASSOCIAÇÕES E CARGA HORÁRIA', 
            path: '#',
            description: '👉 Configure quantas aulas cada disciplina tem e quem leciona'
          },
          { 
            icon: LinkIcon, 
            label: 'Turmas & Componentes', 
            path: '/class-subjects',
            description: '📝 Defina quantas aulas cada disciplina tem por semana em cada turma',
            step: '5',
            color: 'pink',
            badge: 'ESSENCIAL',
            highlight: true,
            subtitle: 'Carga Horária'
          },
          { 
            icon: Users, 
            label: 'Lotação de Professores', 
            path: '/teacher-subjects',
            description: '🎯 Associe: Professor + Disciplina + Turma (Quem ensina o quê e onde)',
            step: '6',
            color: 'teal',
            highlight: true,
            subtitle: 'Atribuição Docente'
          },
          { 
            divider: true, 
            label: '⏰ ETAPA 3: GRADE DE HORÁRIOS', 
            path: '#',
            description: '👉 Configure os horários de aula da semana'
          },
          { 
            icon: Calendar, 
            label: 'Grade de Horários', 
            path: '/schedules',
            description: '⏰ Defina os períodos (manhã/tarde) e horários das aulas',
            step: '7',
            color: 'indigo',
            subtitle: 'Períodos e Horários'
          },
          { 
            divider: true, 
            label: '⚡ ETAPA 4: GERAÇÃO AUTOMÁTICA', 
            path: '#',
            description: '👉 Agora gere seu horário inteligente automaticamente!'
          },
          { 
            icon: Grid3x3, 
            label: 'Gerador Inteligente', 
            path: '/timetable-generator',
            description: '🤖 IA cria horários automaticamente evitando conflitos',
            step: '8',
            color: 'yellow',
            highlight: true,
            badge: 'IA',
            subtitle: 'Geração Automática'
          },
          { 
            divider: true, 
            label: '⚙️ CONFIGURAÇÕES E FERRAMENTAS', 
            path: '#',
            description: '👉 Recursos adicionais do sistema'
          },
          { 
            icon: Calendar, 
            label: 'Calendário Letivo', 
            path: '/calendar',
            description: '📅 Gerencie dias letivos, feriados e eventos',
            color: 'cyan',
            subtitle: 'Anos e Eventos'
          },
          { 
            icon: Zap, 
            label: 'Horário Emergencial e de Sábado de Reposição', 
            path: '/emergency-schedule',
            description: '🚨 Crie horários provisórios e sábados de reposição',
            color: 'red',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Emergência e Reposição'
          },
          { 
            icon: CalendarCheck, 
            label: 'Gerador de Sábado de Reposição', 
            path: '/makeup-saturdays',
            description: '📅 Gere horários de reposição, confirme presenças e abata déficits automaticamente',
            color: 'emerald',
            badge: 'DÉFICITS',
            highlight: true,
            subtitle: 'Reposição e Presença'
          },
          { 
            icon: DollarSign, 
            label: 'Pagamento de Aulas', 
            path: '/class-payments',
            description: '💵 Gerencie lacunas de ausência, registre substitutos e adiantamentos de aula',
            color: 'indigo',
            badge: 'SUBSTITUTOS',
            highlight: true,
            subtitle: 'Lacunas e Substitutos'
          },
          { 
            icon: CheckCircle, 
            label: 'Controle de Frequência', 
            path: '/teacher-attendance',
            description: '✅ Registre presença e acompanhe carga horária dos professores',
            color: 'green',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Ponto e Relatórios'
          },
          { 
            icon: BarChart3, 
            label: 'Relatórios de Frequência', 
            path: '/teacher-frequency-report',
            description: '📊 Visualize déficits e saldos de aulas por professor',
            color: 'blue',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Análise de Déficits'
          },
          {
            icon: Calendar,
            label: 'Ano Letivo',
            path: '/ano-letivo',
            description: '🗓️ Gerencie e inicie anos letivos. Copie lotações para o próximo ano.',
            color: 'blue',
            subtitle: 'Gestão de Anos'
          },
          { 
            icon: Tv, 
            label: 'Painel de Avisos (TV)', 
            path: '/display-panel-config',
            description: '📺 Configure e exiba horários em tempo real em TVs',
            color: 'purple',
            badge: 'NOVO',
            subtitle: 'Display em Tempo Real'
          },
          { 
            icon: ScrollText, 
            label: 'Contrato de Compra e Venda', 
            path: '/sale-contract',
            description: '📄 Visualize, assine e baixe seu contrato com opção de fidelidade e direitos CDC',
            color: 'indigo',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Contrato e Direitos'
          },
          { 
            icon: Settings, 
            label: 'Configurações Gerais', 
            path: '/settings',
            description: '⚙️ Ajustes da escola e preferências do sistema',
            color: 'gray',
            subtitle: 'Personalização'
          },
          { 
            icon: Briefcase, 
            label: 'Funcionários', 
            path: '/employees',
            description: '🗂️ Cadastro de servidores e colaboradores com dados pessoais, documentos e relatório',
            color: 'violet',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Gestão de Pessoal'
          },
          {
            icon: Briefcase,
            label: 'Ponto de Funcionários',
            path: '/employee-attendance',
            description: '⏱️ Controle de presença, faltas, plantões, horas extras e relatórios CLT',
            color: 'blue',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Frequência'
          },
          {
            icon: Briefcase,
            label: 'Controle de EPIs',
            path: '/epi-control',
            description: '🦺 Registro de entrega e fiscalização de EPIs por funcionário — NR-6 / CLT',
            color: 'amber',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Segurança do Trabalho'
          },
          {
            icon: Palmtree,
            label: 'Controle de Férias',
            path: '/ferias',
            description: '🌴 Agendamento, aviso e termo de férias de funcionários e professores',
            color: 'teal',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Gestão de Pessoal'
          }
        ]
      : []),
    ...(user?.role === 'admin' || user?.role === 'super-admin'
      ? [
          { divider: true, label: '🔐 PAINEL ADMINISTRATIVO', path: '#' },
          { 
            icon: ShieldCheck, 
            label: 'Dashboard Admin', 
            path: '/admin-dashboard', 
            color: 'purple',
            description: '📊 Painel central com estatísticas e visão geral',
            subtitle: 'Visão Geral'
          },
          { 
            icon: Building2, 
            label: 'Escolas Cadastradas', 
            path: '/schools-management', 
            color: 'blue',
            description: '🏫 Visualizar, aprovar e gerenciar licenças',
            subtitle: 'Gestão de Clientes'
          },
          { 
            icon: DollarSign, 
            label: 'Controle Financeiro', 
            path: '/sales-management', 
            color: 'green',
            description: '💰 Pagamentos, faturas e cobranças',
            subtitle: 'Financeiro'
          },
          { 
            icon: CreditCard, 
            label: 'Pagamentos Online', 
            path: '/payments-management', 
            color: 'emerald',
            description: '💳 Transações PIX e cartão',
            subtitle: 'Mercado Pago'
          },
          { 
            icon: FileText, 
            label: 'Notas Fiscais', 
            path: '/invoices', 
            color: 'purple',
            description: '📄 Emissão e envio de NF/ISS',
            subtitle: 'Fiscal'
          },
          { 
            icon: Database, 
            label: 'Backups e Dados', 
            path: '/backup-management', 
            color: 'indigo',
            description: '💾 Backup automático e restauração',
            subtitle: 'Segurança'
          },
          { 
            icon: Mail, 
            label: 'Mensagens', 
            path: '/messages', 
            color: 'pink',
            description: '✉️ Enviar avisos aos clientes',
            subtitle: 'Comunicação'
          },
          { 
            icon: Bell, 
            label: 'Notificações', 
            path: '/notifications', 
            color: 'yellow',
            description: '🔔 Alertas e eventos importantes',
            subtitle: 'Sistema'
          },
          { divider: true, label: '💼 GESTÃO COMERCIAL', path: '#' },
          { 
            icon: TrendingUp, 
            label: 'Pipeline de Vendas', 
            path: '/sales-dashboard', 
            color: 'orange',
            description: '📈 Dashboard comercial completo',
            subtitle: 'Vendas'
          },
          { 
            icon: UserPlus, 
            label: 'Leads', 
            path: '/leads-management', 
            color: 'cyan',
            description: '🎯 Gestão de oportunidades',
            subtitle: 'Prospecção'
          },
          { 
            icon: FileText, 
            label: 'Planos e Precificação', 
            path: '/plans-management', 
            color: 'teal',
            description: '📋 Criar e gerenciar planos',
            subtitle: 'Produtos'
          }
        ]
      : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Profissional */}
      <header className="bg-gradient-to-r from-primary-600 via-primary-700 to-blue-900 shadow-lg border-b-4 border-blue-500 no-print">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-6">
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-2 rounded-lg hover:bg-white/15 text-white transition-all"
              title="Menu lateral"
            >
              <Menu size={22} />
            </button>
            {/* Logo e Título Sofisticado */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-white to-blue-100 rounded-lg flex items-center justify-center shadow-lg transform hover:rotate-6 transition-transform">
                  <GraduationCap className="text-primary-600" size={24} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-primary-700 animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  EduSync<span className="text-blue-300">-</span><span className="text-yellow-300">PRO</span>
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-yellow-400 text-primary-900 rounded-full">v2.0</span>
                </h1>
                <p className="text-xs text-blue-200 font-medium">Sistema Inteligente de Horários Escolares</p>
              </div>
            </div>
          </div>
          
          {/* User Info Moderna com Centro de Notificações */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Seletor de Ano Letivo - Apenas para clientes */}
            {user?.role !== 'admin' && user?.role !== 'super-admin' && (
              <div className="relative" ref={yearDropdownRef}>
                <button
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-all"
                  title="Ano letivo ativo"
                >
                  🗓️ {schoolYear}
                  <ChevronDown size={14} className={`transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {yearDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                      Ano Letivo
                    </div>
                    {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                      <button
                        key={y}
                        onClick={() => { setSchoolYear(y); setYearDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                          schoolYear === y ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        {y === new Date().getFullYear() ? `${y} (atual)` : y}
                      </button>
                    ))}
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => { navigate('/ano-letivo'); setYearDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                      >
                        ✨ Iniciar novo ano...
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Centro de Notificações - Apenas para clientes */}
            {user?.role !== 'admin' && user?.role !== 'super-admin' && <NotificationCenter />}
            
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-white">{user?.name}</p>
              <p className="text-xs text-blue-200">
                {(user?.role === 'admin' || user?.role === 'super-admin')
                  ? <span className="text-yellow-300 font-semibold">Administrador</span>
                  : (sidebarSchoolName || user?.schoolName)}
              </p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg ring-2 ring-white/50">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-lg hover:bg-white/10 text-white transition-all group"
              title="Sair do Sistema"
            >
              <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Menu Principal (top navigation bar) */}
      <nav className="bg-white border-b border-gray-200 shadow-sm no-print sticky top-0 z-30">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 px-4 py-2">
          {navigation.map((item, index) => {
            if (item.divider) {
              return (
                <div key={index} className="h-6 w-px bg-gray-300 mx-1 flex-shrink-0" title={item.label} />
              );
            }
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-700 hover:shadow'
                }`}
                title={item.description}
              >
                {Icon && <Icon size={14} />}
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    item.badge === 'NOVO' ? 'bg-green-500 text-white' :
                    item.badge === 'IA' ? 'bg-yellow-500 text-black' :
                    'bg-blue-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.step && (
                  <span className="ml-1 w-4 h-4 flex items-center justify-center bg-primary-500 text-white text-[10px] font-bold rounded-full">
                    {item.step}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content — full width */}
      <main className="flex-1 w-full">
        <div className="w-full px-6 py-6">
          <PrintHeader />
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="mt-8 py-4 px-6 border-t bg-white text-center text-xs text-gray-600">
          <p className="font-semibold">© 2025 Wander Pires Silva Coelho</p>
          <p>wanderpsc@gmail.com - Todos os direitos reservados</p>
        </footer>
      </main>

      {/* ─── Sidebar Lateral ──────────────────────────────────────────── */}
      <div className={`fixed inset-0 z-50 no-print transition-all duration-300 ${sidebarOpen ? 'visible' : 'invisible'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setSidebarOpen(false)}
        />
        {/* Painel */}
        <aside className={`absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Cabeçalho do sidebar */}
          <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-primary-700 to-blue-900 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap size={20} />
              <div>
                <p className="font-bold text-base leading-tight">EduSync-PRO</p>
                <p className="text-[10px] text-blue-200">Sistema de Horários</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              title="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nome da escola */}
          {sidebarSchoolName && (
            <div className="px-4 py-2 bg-primary-50 border-b border-primary-100">
              <p className="text-xs text-primary-700 font-medium truncate">🏫 {sidebarSchoolName}</p>
            </div>
          )}

          {/* Itens de navegação */}
          <nav className="flex-1 overflow-y-auto py-2">
            {navigation.map((item, index) => {
              if (item.divider) {
                return (
                  <div key={`divider-${index}`} className="px-4 pt-4 pb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">{item.label}</p>
                  </div>
                );
              }
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={`sidebar-${item.path}-${index}`}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                  title={item.description}
                >
                  {Icon && <Icon size={16} className="flex-shrink-0" />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded flex-shrink-0 ${
                      item.badge === 'NOVO' ? 'bg-green-500 text-white' :
                      item.badge === 'IA'   ? 'bg-yellow-500 text-black' :
                                             'bg-blue-500 text-white'
                    }`}>{item.badge}</span>
                  )}
                  {item.step && (
                    <span className="w-5 h-5 flex items-center justify-center bg-primary-500 text-white text-[10px] font-bold rounded-full flex-shrink-0">
                      {item.step}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Rodapé com logout */}
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            <p className="text-xs text-gray-500 px-2 pb-2 font-semibold truncate">{user?.name}</p>
            <button
              onClick={() => { setSidebarOpen(false); handleLogout(); }}
              className="w-full flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut size={16} /> Sair do Sistema
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
