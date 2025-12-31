import { useAuthStore } from '../store/authStore';
import { Calendar, Users, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    teachers: 0,
    subjects: 0,
    schedules: 0,
    timetables: 0,
    emergencySchedules: 0
  });
  const [loading, setLoading] = useState(true);

  // Redirecionar administradores para o dashboard admin
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin-dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [teachersRes, subjectsRes, schedulesRes, timetablesRes, generatedRes, emergencyRes] = await Promise.all([
          api.get('/teachers'),
          api.get('/subjects'),
          api.get('/schedules'),
          api.get('/timetables'),
          api.get('/generated-timetables'),
          api.get('/emergency-schedules')
        ]);

        // Debug: Log das respostas
        console.log('Teachers Response:', teachersRes.data);
        console.log('Subjects Response:', subjectsRes.data);
        console.log('Schedules Response:', schedulesRes.data);
        console.log('Timetables Response:', timetablesRes.data);
        console.log('Generated Timetables Response:', generatedRes.data);

        // Tratar diferentes formatos de resposta (alguns retornam { data: [] }, outros retornam [] direto)
        const teachersData = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data?.data || []);
        const subjectsData = Array.isArray(subjectsRes.data) ? subjectsRes.data : (subjectsRes.data?.data || []);
        const schedulesData = Array.isArray(schedulesRes.data) ? schedulesRes.data : (schedulesRes.data?.data || []);
        const timetablesData = Array.isArray(timetablesRes.data) ? timetablesRes.data : (timetablesRes.data?.data || []);
        const generatedData = Array.isArray(generatedRes.data) ? generatedRes.data : (generatedRes.data?.data || []);
        const emergencyData = Array.isArray(emergencyRes.data) ? emergencyRes.data : (emergencyRes.data?.data || []);

        // Contar grades: timetables + generated-timetables
        const totalTimetables = timetablesData.length + generatedData.length;

        console.log('Contagens:', {
          teachers: teachersData.length,
          subjects: subjectsData.length,
          schedules: schedulesData.length,
          timetables: totalTimetables,
          generated: generatedData.length
        });

        setStats({
          teachers: teachersData.length || 0,
          subjects: subjectsData.length || 0,
          schedules: schedulesData.length || 0,
          timetables: totalTimetables || 0,
          emergencySchedules: emergencyData.length || 0
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsDisplay = [
    { icon: Users, label: 'Professores', value: stats.teachers, color: 'bg-blue-500' },
    { icon: BookOpen, label: 'Componentes', value: stats.subjects, color: 'bg-green-500' },
    { icon: Clock, label: 'Horários', value: stats.schedules, color: 'bg-purple-500' },
    { icon: Calendar, label: 'Grades', value: stats.timetables, color: 'bg-orange-500' },
    { icon: AlertTriangle, label: 'Emergenciais', value: stats.emergencySchedules, color: 'bg-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4 md:p-8">
      {/* Header Moderno */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl p-8 md:p-12 mb-8 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -ml-32 -mb-32"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Clock size={48} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                Olá, {user?.name}! 👋
              </h1>
              <p className="text-blue-100 text-lg font-medium">
                🏫 {user?.schoolName || 'Sua Escola'} - Sistema de Horários Inteligente
              </p>
            </div>
          </div>
          
          {stats.emergencySchedules > 0 && (
            <div className="bg-red-500/20 backdrop-blur-sm border-2 border-red-300 rounded-xl p-4 flex items-center gap-4 animate-pulse">
              <AlertTriangle size={32} className="text-yellow-300" />
              <div>
                <p className="font-bold text-lg">⚠️ ATENÇÃO: Horários Emergenciais Ativos!</p>
                <p className="text-blue-100">
                  {stats.emergencySchedules} substituição(ões) ativa(s) no momento
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Modernos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {loading ? (
          <div className="col-span-5 text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Carregando estatísticas...</p>
          </div>
        ) : (
          statsDisplay.map((stat) => (
            <div key={stat.label} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-t-4 border-blue-500 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className={`${stat.color} bg-opacity-10 p-4 rounded-xl group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`${stat.color.replace('bg-', 'text-')}`} size={32} />
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">{stat.value}</p>
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide mt-1">{stat.label}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Início Rápido Modernizado */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-10 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl font-black text-gray-900">🎯 Guia Completo - 8 Etapas</h2>
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            Siga estas etapas na ordem para criar horários perfeitos:
          </p>
          <div className="space-y-3">
            {/* Etapa 1 */}
            <Link 
              to="/teachers" 
              className="group block p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl hover:from-purple-500 hover:to-purple-600 border-2 border-purple-200 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="bg-purple-600 text-white font-black text-lg rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-purple-700 group-hover:text-white mb-1 transition-colors">
                    Professores
                  </h3>
                  <p className="text-xs text-purple-600 group-hover:text-purple-100 transition-colors">
                    Cadastre os professores da escola
                  </p>
                </div>
                <div className="text-purple-600 group-hover:text-white group-hover:translate-x-2 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Etapa 2 */}
            <Link 
              to="/subjects" 
              className="group block p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:from-green-500 hover:to-emerald-500 border-2 border-green-200 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="bg-green-600 text-white font-black text-lg rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-700 group-hover:text-white mb-1 transition-colors">
                    Componentes Curriculares
                  </h3>
                  <p className="text-xs text-green-600 group-hover:text-green-100 transition-colors">
                    Adicione as disciplinas (Matemática, Português...)
                  </p>
                </div>
                <div className="text-green-600 group-hover:text-white group-hover:translate-x-2 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Etapa 3 */}
            <Link 
              to="/grades" 
              className="group block p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl hover:from-orange-500 hover:to-orange-600 border-2 border-orange-200 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="bg-orange-600 text-white font-black text-lg rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-orange-700 group-hover:text-white mb-1 transition-colors">
                    Anos / Séries
                  </h3>
                  <p className="text-xs text-orange-600 group-hover:text-orange-100 transition-colors">
                    Defina os níveis de ensino (6º Ano, 1ª Série...)
                  </p>
                </div>
                <div className="text-orange-600 group-hover:text-white group-hover:translate-x-2 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Etapa 4 */}
            <Link 
              to="/classes" 
              className="group block p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl hover:from-red-500 hover:to-red-600 border-2 border-red-200 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="bg-red-600 text-white font-black text-lg rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-700 group-hover:text-white mb-1 transition-colors">
                    Turmas
                  </h3>
                  <p className="text-xs text-red-600 group-hover:text-red-100 transition-colors">
                    Crie as turmas (6º A, 6º B, 1ª A...)
                  </p>
                </div>
                <div className="text-red-600 group-hover:text-white group-hover:translate-x-2 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Etapa 5 */}
            <Link 
              to="/class-subjects" 
              className="group block p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl hover:from-pink-500 hover:to-pink-600 border-2 border-pink-200 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="bg-pink-600 text-white font-black text-lg rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-pink-700 group-hover:text-white mb-1 transition-colors flex items-center gap-2">
                    Turmas & Componentes
                    <span className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ESSENCIAL</span>
                  </h3>
                  <p className="text-xs text-pink-600 group-hover:text-pink-100 transition-colors">
                    Defina quantas aulas cada matéria tem por semana
                  </p>
                </div>
                <div className="text-pink-600 group-hover:text-white group-hover:translate-x-2 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Etapa 6 */}
            <Link 
              to="/teacher-subjects" 
              className="group block p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl hover:from-teal-500 hover:to-teal-600 border-2 border-teal-200 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="bg-teal-600 text-white font-black text-lg rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  6
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-teal-700 group-hover:text-white mb-1 transition-colors flex items-center gap-2">
                    Lotação de Professores
                    <span className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ESSENCIAL</span>
                  </h3>
                  <p className="text-xs text-teal-600 group-hover:text-teal-100 transition-colors">
                    Associe: Professor + Disciplina + Turma
                  </p>
                </div>
                <div className="text-teal-600 group-hover:text-white group-hover:translate-x-2 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Etapa 7 */}
            <Link 
              to="/schedules" 
              className="group block p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl hover:from-indigo-500 hover:to-indigo-600 border-2 border-indigo-200 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="bg-indigo-600 text-white font-black text-lg rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  7
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-indigo-700 group-hover:text-white mb-1 transition-colors">
                    Grade de Horários
                  </h3>
                  <p className="text-xs text-indigo-600 group-hover:text-indigo-100 transition-colors">
                    Configure os períodos e horários das aulas
                  </p>
                </div>
                <div className="text-indigo-600 group-hover:text-white group-hover:translate-x-2 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Etapa 8 */}
            <Link 
              to="/timetable-generator" 
              className="group block p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl hover:from-yellow-500 hover:to-orange-500 border-2 border-yellow-300 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-black text-lg rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  8
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-700 group-hover:text-white mb-1 transition-colors flex items-center gap-2">
                    Gerador Inteligente
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">IA</span>
                  </h3>
                  <p className="text-xs text-yellow-600 group-hover:text-yellow-100 transition-colors">
                    🎉 Gere horários automáticos sem conflitos!
                  </p>
                </div>
                <div className="text-yellow-600 group-hover:text-white group-hover:translate-x-2 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Sistema de Horário Escolar Modernizado */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-10 bg-gradient-to-b from-green-600 to-blue-600 rounded-full"></div>
            <h2 className="text-2xl font-black text-gray-900">📊 Visão Geral</h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-primary-600" size={20} />
                <h3 className="font-medium">{stats.teachers} Professores Cadastrados</h3>
              </div>
              <p className="text-sm text-gray-600">
                {stats.teachers === 0 ? 'Cadastre professores para começar' : 'Professores ativos no sistema'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="text-primary-600" size={20} />
                <h3 className="font-medium">{stats.subjects} Componentes Curriculares</h3>
              </div>
              <p className="text-sm text-gray-600">
                {stats.subjects === 0 ? 'Adicione componentes curriculares' : 'Componentes com cargas horárias definidas'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="text-primary-600" size={20} />
                <h3 className="font-medium">{stats.schedules} Horários Configurados</h3>
              </div>
              <p className="text-sm text-gray-600">
                {stats.schedules === 0 ? 'Configure os horários de aula' : 'Períodos de aula definidos'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-primary-600" size={20} />
                <h3 className="font-medium">{stats.timetables} Grades Geradas</h3>
              </div>
              <p className="text-sm text-gray-600">
                {stats.timetables === 0 ? 'Gere grades automáticas após cadastrar dados' : 'Grades de horário criadas'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 card bg-gradient-to-r from-primary-50 to-primary-100 border-l-4 border-primary-500">
        <h2 className="text-xl font-bold mb-2">Sistema Completo</h2>
        <p className="text-gray-700 mb-4">
          Este sistema gera horários escolares automaticamente, evitando conflitos de:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Mesmo professor no mesmo horário</li>
          <li>Mesma matéria no mesmo horário</li>
          <li>Aulas seguidas da mesma matéria</li>
        </ul>
        <p className="mt-4 text-sm text-gray-600">
          Desenvolvido especialmente para otimizar o processo de criação de grades horárias escolares.
        </p>
      </div>
    </div>
  );
}
