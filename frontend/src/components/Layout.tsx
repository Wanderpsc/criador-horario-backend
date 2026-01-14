import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Home, 
  Users, 
  BookOpen, 
  Clock, 
  Calendar, 
  LogOut,
  Menu,
  X,
  Settings,
  DollarSign,
  Package,
  UserPlus,
  ShoppingCart,
  GraduationCap,
  School,
  Building2,
  Grid3x3,
  Link as LinkIcon,
  Bell,
  Tv,
  MessageSquare,
  Zap,
  ShieldCheck,
  Database,
  CreditCard,
  Mail,
  TrendingUp,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useState } from 'react';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            icon: Bell, 
            label: 'Notificações e Lembretes', 
            path: '/notifications',
            description: '📱 Configure lembretes para professores via SMS/WhatsApp',
            color: 'yellow',
            badge: 'NOVO',
            subtitle: 'Avisos Automáticos'
          },
          { 
            icon: MessageSquare, 
            label: 'WhatsApp Business', 
            path: '/whatsapp-settings',
            description: '⚙️ Configure as credenciais da Meta Cloud API',
            color: 'green',
            badge: 'CONFIG',
            subtitle: 'Configuração do WhatsApp'
          },
          { 
            icon: MessageSquare, 
            label: 'Mensagens ao Vivo', 
            path: '/live-messaging',
            description: '📤 Envie mensagens instantâneas individuais ou coletivas',
            color: 'green',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Comunicação Instantânea'
          },
          { 
            icon: Zap, 
            label: 'Horário Emergencial', 
            path: '/emergency-schedule',
            description: '🚨 Crie horários provisórios quando professor faltar',
            color: 'red',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Substituições Rápidas'
          },
          { 
            icon: Calendar, 
            label: 'Sábados de Reposição', 
            path: '/makeup-saturdays',
            description: '📅 Gere automaticamente horários de reposição para sábados',
            color: 'blue',
            badge: 'NOVO',
            highlight: true,
            subtitle: 'Reposição de Aulas'
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
            icon: Settings, 
            label: 'Configurações Gerais', 
            path: '/settings',
            description: '⚙️ Ajustes da escola e preferências do sistema',
            color: 'gray',
            subtitle: 'Personalização'
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Profissional */}
      <header className="bg-gradient-to-r from-primary-600 via-primary-700 to-blue-900 shadow-lg border-b-4 border-blue-500 no-print">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-all"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
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
            {/* Centro de Notificações - Apenas para clientes */}
            {user?.role !== 'admin' && user?.role !== 'super-admin' && <NotificationCenter />}
            
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-white">{user?.name}</p>
              {user?.role === 'admin' || user?.role === 'super-admin' ? (
                <p className="text-xs text-yellow-300 font-semibold">Administrador</p>
              ) : null}
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

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-96 bg-white border-r border-gray-200 shadow-lg
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          no-print flex flex-col h-screen
        `}>
          {/* Header Sidebar Compacto */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
                <GraduationCap className="text-indigo-600" size={18} />
              </div>
              <span className="text-sm font-bold text-white">Menu Principal</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              if (item.divider) {
                return (
                  <div key={index} className="mt-6 mb-3">
                    <div className="px-3 py-2 text-sm font-bold text-indigo-700 uppercase tracking-wider border-l-4 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-r shadow-sm">
                      {item.label}
                    </div>
                    {item.description && (
                      <p className="px-3 mt-1 text-sm text-indigo-500 italic font-medium">
                        {item.description}
                      </p>
                    )}
                  </div>
                );
              }
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              // Color mapping for highlights
              const colorClasses = {
                blue: 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200',
                purple: 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200',
                green: 'border-green-500 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200',
                orange: 'border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200',
                red: 'border-red-500 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200',
                indigo: 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200',
                teal: 'border-teal-500 bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200',
                yellow: 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200',
                cyan: 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200',
                gray: 'border-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200',
                emerald: 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200',
                slate: 'border-slate-500 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200'
              };

              const highlightClass = item.highlight 
                ? `border-l-4 ${colorClasses[item.color as keyof typeof colorClasses] || 'border-primary-400 bg-primary-50 hover:bg-primary-100'} shadow-sm`
                : '';

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${highlightClass} ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 text-indigo-900 font-semibold shadow-lg border-2 border-indigo-300'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md hover:border hover:border-gray-300'
                  }`}
                  title={item.description}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {item.step && (
                      <span className={`inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-white rounded-full shadow-md mr-1 ${
                        item.color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                        item.color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                        item.color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                        item.color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                        item.color === 'pink' ? 'bg-gradient-to-br from-pink-500 to-pink-600' :
                        item.color === 'teal' ? 'bg-gradient-to-br from-teal-500 to-teal-600' :
                        item.color === 'indigo' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' :
                        item.color === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                        'bg-gradient-to-br from-primary-500 to-primary-600'
                      }`}>
                        {item.step}
                      </span>
                    )}
                    {Icon && !item.step && (
                      <div className={`p-2 rounded-lg transition-all duration-200 ${
                        isActive ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 group-hover:from-indigo-100 group-hover:to-purple-100 group-hover:text-indigo-600'
                      }`}>
                        <Icon size={20} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-base font-semibold truncate ${isActive ? 'text-primary-900' : ''}`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`flex-shrink-0 px-2 py-1 text-xs font-extrabold rounded-full shadow-sm ${
                          item.badge === 'IA' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse' :
                          item.badge === 'ESSENCIAL' ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white' :
                          'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <span className={`text-xs font-medium ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                        {item.subtitle}
                      </span>
                    )}
                    {item.description && (
                      <p className={`text-xs leading-relaxed mt-1 ${isActive ? 'text-primary-700' : 'text-gray-500'}`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t">
            <div className="mb-3">
              <p className="text-xs text-gray-500">{user?.email}</p>
              <p className="text-xs text-primary-600 mt-1 font-semibold">
                {(user?.role === 'admin' || user?.role === 'super-admin') ? 'Administrador do Sistema' : user?.schoolName}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-0">
          {/* Mobile header */}
          <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 bg-white border-b lg:hidden">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-primary-600">
              EduSync-PRO
            </h1>
            <div className="w-6" />
          </div>

          {/* Page content */}
          <div className="p-6">
            <Outlet />
          </div>

          {/* Footer */}
          <footer className="mt-8 py-4 px-6 border-t bg-white text-center text-xs text-gray-600">
            <p className="font-semibold">© 2025 Wander Pires Silva Coelho</p>
            <p>wanderpsc@gmail.com - Todos os direitos reservados</p>
          </footer>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
