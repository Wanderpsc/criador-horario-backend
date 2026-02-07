import { useAuthStore } from '../store/authStore';
import { Calendar, Users, BookOpen, Clock, AlertTriangle, GraduationCap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';

interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  totalLessons: number;
  subjectsCount: number;
  classesCount: number;
}

interface DashboardStats {
  teachers: number;
  subjects: number;
  schedules: number;
  timetables: number;
  emergencySchedules: number;
  classes: number;
  teacherWorkload: TeacherWorkload[];
  totalLessons: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    teachers: 0,
    subjects: 0,
    schedules: 0,
    timetables: 0,
    emergencySchedules: 0,
    classes: 0,
    teacherWorkload: [],
    totalLessons: 0
  });
  const [loading, setLoading] = useState(true);

  // Redirecionar administradores para o dashboard admin
  useEffect(() => {
    console.log('🔍 Dashboard - User:', user);
    console.log('🔍 Dashboard - Role:', user?.role);
    
    if (user?.role === 'admin' || user?.role === 'super-admin') {
      console.log('🔄 Dashboard - Redirecionando admin para admin-dashboard...');
      navigate('/admin-dashboard', { replace: true });
      return; // Para evitar executar código adicional
    }
  }, [user, navigate]);

  useEffect(() => {
    // Não buscar stats se for admin (será redirecionado)
    if (!user || user.role === 'admin' || user.role === 'super-admin') {
      console.log('⏭️ Dashboard - Pulando fetch de stats (usuário admin ou não definido)');
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        console.log('📊 Dashboard - Buscando estatísticas...');
        // Usar o novo endpoint de estatísticas
        const response = await api.get('/stats/dashboard');
        
        console.log('✅ Estatísticas recebidas:', response.data);
        
        setStats(response.data);
      } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        
        // Fallback para valores padrão em caso de erro
        setStats({
          teachers: 0,
          subjects: 0,
          schedules: 0,
          timetables: 0,
          emergencySchedules: 0,
          classes: 0,
          teacherWorkload: [],
          totalLessons: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const statsDisplay = [
    { icon: Users, label: 'Professores', value: stats.teachers, color: 'bg-blue-500' },
    { icon: BookOpen, label: 'Componentes', value: stats.subjects, color: 'bg-green-500' },
    { icon: GraduationCap, label: 'Turmas', value: stats.classes, color: 'bg-purple-500' },
    { icon: Clock, label: 'Aulas/Semana', value: stats.totalLessons, color: 'bg-pink-500' },
    { icon: Calendar, label: 'Grades', value: stats.timetables, color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      {/* Hero Header Ultra Moderno */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-6 md:p-10 mb-8 text-white">
        {/* Formas geométricas decorativas */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-pink-400/20 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full blur-3xl -ml-40 -mb-40 animate-pulse delay-75"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">Sistema Online</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2 drop-shadow-lg">
                Olá, {user?.name}! 👋
              </h1>
              <p className="text-white/90 text-base md:text-lg font-medium flex items-center gap-2">
                <span className="text-2xl">🏫</span>
                {user?.schoolName || 'Sua Escola'}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20">
                <Clock size={56} className="text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
          
          {stats.emergencySchedules > 0 && (
            <div className="mt-6 bg-red-500/20 backdrop-blur-lg border-2 border-red-300/50 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
              <div className="bg-yellow-400 p-2 rounded-xl">
                <AlertTriangle size={28} className="text-red-900" />
              </div>
              <div>
                <p className="font-bold text-lg">⚠️ Atenção: Horários Emergenciais Ativos!</p>
                <p className="text-white/90 text-sm">
                  {stats.emergencySchedules} substituição(ões) em andamento
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Ultra Modernos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
        {loading ? (
          <div className="col-span-5 text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Carregando estatísticas...</p>
          </div>
        ) : (
          statsDisplay.map((stat, index) => (
            <div 
              key={stat.label} 
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-5 border-l-4 border-transparent hover:border-purple-500 hover:-translate-y-2 overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradiente de fundo ao hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                {/* Ícone com efeito de brilho */}
                <div className={`${stat.color} bg-opacity-10 p-3 rounded-xl group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 relative`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <stat.icon className={`${stat.color.replace('bg-', 'text-')} relative z-10`} size={28} />
                </div>
                
                {/* Número gigante com gradiente */}
                <div>
                  <p className="text-4xl md:text-5xl font-black bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent leading-none mb-2 group-hover:scale-110 transition-transform duration-500">
                    {stat.value}
                  </p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-purple-600 transition-colors">
                    {stat.label}
                  </p>
                </div>
                
                {/* Indicador de progresso */}
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${stat.color} transition-all duration-1000 group-hover:w-full`} style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Guia Rápido Ultra Moderno */}
        <div className="relative bg-gradient-to-br from-white to-purple-50 rounded-3xl shadow-2xl p-8 border-2 border-purple-100 overflow-hidden">
          {/* Decoração de fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-2xl shadow-lg">
                <span className="text-2xl">🚀</span>
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Guia de Configuração
                </h2>
                <p className="text-sm text-gray-500 font-medium">8 passos simples</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              Configure o sistema seguindo esta sequência:
            </p>

            {/* GRUPO 1: CADASTROS BÁSICOS */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded"></div>
                <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider">Cadastros Básicos</h3>
              </div>
              <div className="space-y-2.5">
                {/* Etapa 1 */}
                <Link 
                  to="/teachers" 
                  className="group block relative bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl hover:from-purple-500 hover:to-pink-500 border border-purple-200/50 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:scale-[1.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white font-black text-base rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all shadow-lg">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-purple-700 group-hover:text-white mb-0.5 transition-colors text-sm">
                        👨‍🏫 Professores
                      </h3>
                      <p className="text-[11px] text-purple-600 group-hover:text-purple-100 transition-colors leading-tight">
                        Cadastre o corpo docente
                      </p>
                    </div>
                    <div className="text-purple-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>

                {/* Etapa 2 */}
                <Link 
                  to="/grades" 
                  className="group block relative bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl hover:from-orange-500 hover:to-amber-500 border border-orange-200/50 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:scale-[1.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-orange-600 to-amber-700 text-white font-black text-base rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all shadow-lg">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-orange-700 group-hover:text-white mb-0.5 transition-colors text-sm">
                        🎓 Anos / Séries
                      </h3>
                      <p className="text-[11px] text-orange-600 group-hover:text-orange-100 transition-colors leading-tight">
                        Níveis de ensino
                      </p>
                    </div>
                    <div className="text-orange-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>

                {/* Etapa 3 */}
                <Link 
                  to="/classes" 
                  className="group block relative bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl hover:from-red-500 hover:to-rose-500 border border-red-200/50 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:scale-[1.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white font-black text-base rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all shadow-lg">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-red-700 group-hover:text-white mb-0.5 transition-colors text-sm">
                        🏫 Turmas
                      </h3>
                      <p className="text-[11px] text-red-600 group-hover:text-red-100 transition-colors leading-tight">
                        Crie as salas de aula
                      </p>
                    </div>
                    <div className="text-red-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>

                {/* Etapa 4 */}
                <Link 
                  to="/subjects" 
                  className="group block relative bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl hover:from-green-500 hover:to-emerald-500 border border-green-200/50 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:scale-[1.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white font-black text-base rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all shadow-lg">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-green-700 group-hover:text-white mb-0.5 transition-colors text-sm">
                        📚 Componentes Curriculares
                      </h3>
                      <p className="text-[11px] text-green-600 group-hover:text-green-100 transition-colors leading-tight">
                        Matérias e disciplinas
                      </p>
                    </div>
                    <div className="text-green-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* GRUPO 2: ASSOCIAÇÕES (ESSENCIAIS) */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-8 bg-gradient-to-r from-pink-400 to-teal-400 rounded"></div>
                <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider">Associações Essenciais</h3>
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black">
                  OBRIGATÓRIO
                </span>
              </div>
              <div className="space-y-2.5">
                {/* Etapa 5 - ESSENCIAL */}
                <Link 
                  to="/class-subjects" 
                  className="group block relative bg-gradient-to-r from-pink-50 to-fuchsia-50 rounded-2xl hover:from-pink-500 hover:to-fuchsia-500 border-2 border-pink-300 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:scale-[1.02] p-4"
                >
                  <div className="absolute top-2 right-2">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] px-2 py-1 rounded-full font-black shadow-lg animate-pulse">
                      ESSENCIAL
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-pink-600 to-fuchsia-700 text-white font-black text-base rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all shadow-lg">
                      5
                    </div>
                    <div className="flex-1 pr-16">
                      <h3 className="font-black text-pink-700 group-hover:text-white mb-0.5 transition-colors text-sm">
                        📋 Turmas & Componentes
                      </h3>
                      <p className="text-[11px] text-pink-600 group-hover:text-pink-100 transition-colors leading-tight">
                        Aulas por semana/turma
                      </p>
                    </div>
                    <div className="text-pink-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>

                {/* Etapa 6 - ESSENCIAL */}
                <Link 
                  to="/teacher-subjects" 
                  className="group block relative bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl hover:from-teal-500 hover:to-cyan-500 border-2 border-teal-300 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:scale-[1.02] p-4"
                >
                  <div className="absolute top-2 right-2">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] px-2 py-1 rounded-full font-black shadow-lg animate-pulse">
                      ESSENCIAL
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-teal-600 to-cyan-700 text-white font-black text-base rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all shadow-lg">
                      6
                    </div>
                    <div className="flex-1 pr-16">
                      <h3 className="font-black text-teal-700 group-hover:text-white mb-0.5 transition-colors text-sm">
                        👥 Lotação de Professores
                      </h3>
                      <p className="text-[11px] text-teal-600 group-hover:text-teal-100 transition-colors leading-tight">
                        Vincule docentes aos componentes
                      </p>
                    </div>
                    <div className="text-teal-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* GRUPO 3: GERAÇÃO */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-8 bg-gradient-to-r from-indigo-400 to-yellow-400 rounded"></div>
                <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider">Configuração Final & Geração</h3>
              </div>
              <div className="space-y-2.5">
                {/* Etapa 7 */}
                <Link 
                  to="/schedules" 
                  className="group block relative bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl hover:from-indigo-500 hover:to-blue-500 border border-indigo-200/50 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:scale-[1.02] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-black text-base rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all shadow-lg">
                      7
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-indigo-700 group-hover:text-white mb-0.5 transition-colors text-sm">
                        ⏰ Grade de Horários
                      </h3>
                      <p className="text-[11px] text-indigo-600 group-hover:text-indigo-100 transition-colors leading-tight">
                        Períodos e intervalos
                      </p>
                    </div>
                    <div className="text-indigo-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>

                {/* Etapa 8 - GERAR */}
                <Link 
                  to="/timetable-generator" 
                  className="group block relative bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl hover:from-yellow-500 hover:to-orange-500 border-2 border-yellow-300 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:scale-105 p-4"
                >
                  <div className="absolute top-2 right-2">
                    <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] px-2 py-1 rounded-full font-black shadow-lg animate-pulse">
                      GERAR
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-yellow-600 to-orange-700 text-white font-black text-base rounded-xl w-9 h-9 flex items-center justify-center flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all shadow-lg">
                      8
                    </div>
                    <div className="flex-1 pr-12">
                      <h3 className="font-black text-yellow-700 group-hover:text-white mb-0.5 transition-colors text-sm">
                        🚀 Gerador Inteligente
                      </h3>
                      <p className="text-[11px] text-yellow-600 group-hover:text-yellow-100 transition-colors leading-tight">
                        IA cria horários sem conflitos!
                      </p>
                    </div>
                    <div className="text-yellow-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Visão Geral Ultra Moderna */}
        <div className="relative bg-gradient-to-br from-white to-blue-50 rounded-3xl shadow-2xl p-8 border-2 border-blue-100 overflow-hidden">
          {/* Decoração de fundo */}
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl -ml-32 -mb-32"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-2xl shadow-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Visão Geral
                </h2>
                <p className="text-sm text-gray-500 font-medium">Status do sistema</p>
              </div>
            </div>
            
            <div className="space-y-3 mt-6">
              {/* Card Professores */}
              <div className="group relative bg-white rounded-2xl p-4 border-2 border-purple-100 hover:border-purple-400 transition-all duration-300 hover:shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                      <Users className="text-white" size={18} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-gray-800 text-sm">Professores</h3>
                      <p className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {stats.teachers}
                      </p>
                    </div>
                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                      Ativos
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight">
                    {stats.teachers === 0 ? '⚠️ Cadastre professores primeiro' : '✅ Corpo docente cadastrado'}
                  </p>
                </div>
              </div>

              {/* Card Componentes */}
              <div className="group relative bg-white rounded-2xl p-4 border-2 border-green-100 hover:border-green-400 transition-all duration-300 hover:shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2.5 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                      <BookOpen className="text-white" size={18} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-gray-800 text-sm">Componentes</h3>
                      <p className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {stats.subjects}
                      </p>
                    </div>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      Matérias
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight">
                    {stats.subjects === 0 ? '⚠️ Adicione componentes curriculares' : '✅ Total de componentes cadastrados'}
                  </p>
                </div>
              </div>

              {/* Card Horários */}
              <div className="group relative bg-white rounded-2xl p-4 border-2 border-blue-100 hover:border-blue-400 transition-all duration-300 hover:shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                      <Clock className="text-white" size={18} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-gray-800 text-sm">Horários</h3>
                      <p className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {stats.schedules}
                      </p>
                    </div>
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                      Períodos
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight">
                    {stats.schedules === 0 ? '⚠️ Configure os horários de aula' : '✅ Períodos definidos'}
                  </p>
                </div>
              </div>

              {/* Card Horários Gerados */}
              <div className="group relative bg-white rounded-2xl p-4 border-2 border-yellow-100 hover:border-yellow-400 transition-all duration-300 hover:shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2.5 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                      <Calendar className="text-white" size={18} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-gray-800 text-sm">Gerados</h3>
                      <p className="text-2xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                        {stats.timetables}
                      </p>
                    </div>
                    <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
                      Completos
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight">
                    {stats.timetables === 0 ? '⚠️ Use o gerador inteligente' : '✅ Horários prontos'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Lotação de Professores */}
      {stats.teacherWorkload && stats.teacherWorkload.length > 0 && (
        <div className="mt-8">
          <div className="relative bg-gradient-to-br from-white to-indigo-50 rounded-3xl shadow-2xl p-8 border-2 border-indigo-100 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Lotação de Professores
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    {stats.teacherWorkload.filter(t => t.totalLessons > 0).length} professores com aulas
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.teacherWorkload
                  .filter(t => t.totalLessons > 0)
                  .map((teacher, index) => (
                    <div 
                      key={teacher.teacherId} 
                      className="group relative bg-white rounded-2xl p-4 border-2 border-indigo-100 hover:border-indigo-400 transition-all duration-300 hover:shadow-lg overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-sm rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-md">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 text-sm truncate mb-1" title={teacher.teacherName}>
                              {teacher.teacherName}
                            </h3>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Aulas/semana:</span>
                                <span className="font-black text-indigo-600">{teacher.totalLessons}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Componentes:</span>
                                <span className="font-bold text-purple-600">{teacher.subjectsCount}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Turmas:</span>
                                <span className="font-bold text-pink-600">{teacher.classesCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Barra de progresso visual */}
                        <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                            style={{ width: `${Math.min(100, (teacher.totalLessons / 40) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {stats.teacherWorkload.filter(t => t.totalLessons > 0).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-medium">
                    ⚠️ Nenhum professor possui aulas lotadas ainda.
                  </p>
                  <Link 
                    to="/teacher-subjects" 
                    className="inline-block mt-3 text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                  >
                    Fazer lotação de professores →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
