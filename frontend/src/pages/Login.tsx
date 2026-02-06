import { useState } from 'react';
import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff, PlayCircle, X, Calendar, Users, Clock, CheckCircle } from 'lucide-react';
import InstallPWA from '../components/InstallPWA';

// Componente de Demonstração Visual Animada
function DemoVideo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = [
    {
      title: '📋 Cadastro Rápido e Intuitivo',
      icon: Users,
      color: 'from-blue-500 to-purple-500',
      description: 'Adicione professores, disciplinas e turmas em segundos',
      demo: (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200 animate-slideInLeft">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <div className="font-bold text-gray-900">15 Professores</div>
                  <div className="text-xs text-gray-600">Cadastrados no sistema</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">✓</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Matemática', 'Português', 'História', 'Geografia', 'Inglês', 'Ciências'].map((subject, i) => (
                <div key={i} className="bg-white px-2 py-1 rounded text-xs text-center font-medium text-gray-700 shadow animate-fadeIn" style={{ animationDelay: `${i * 0.1}s` }}>
                  {subject}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border-2 border-green-200 animate-slideInLeft" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Calendar className="text-white" size={24} />
                </div>
                <div>
                  <div className="font-bold text-gray-900">8 Turmas</div>
                  <div className="text-xs text-gray-600">Ensino Fundamental e Médio</div>
                </div>
              </div>
              <div className="text-xs bg-white px-3 py-1 rounded-full font-semibold text-green-700 shadow">
                240 aulas/semana
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '⚙️ Configuração Inteligente de Grades',
      icon: Calendar,
      color: 'from-green-500 to-teal-500',
      description: 'Defina cargas horárias, aulas geminadas e preferências',
      demo: (
        <div className="bg-white rounded-lg p-6 shadow-2xl border border-gray-200">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500 animate-slideInRight">
              <div>
                <span className="font-bold text-gray-900">Matemática</span>
                <div className="text-xs text-gray-600 mt-1">Prof. Carlos - 3 turmas</div>
              </div>
              <div className="text-right">
                <div className="text-blue-700 font-bold text-lg">5 aulas/sem</div>
                <div className="text-xs text-blue-600">Preferência: Manhã</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-l-4 border-green-500 animate-slideInRight" style={{ animationDelay: '0.15s' }}>
              <div>
                <span className="font-bold text-gray-900">Educação Física</span>
                <div className="text-xs text-gray-600 mt-1">Prof. Ana - 4 turmas</div>
              </div>
              <div className="text-right">
                <div className="text-green-700 font-bold text-lg">2 aulas/sem</div>
                <div className="text-xs text-green-600 bg-green-200 px-2 py-0.5 rounded-full inline-block">🔗 Geminadas</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border-l-4 border-purple-500 animate-slideInRight" style={{ animationDelay: '0.3s' }}>
              <div>
                <span className="font-bold text-gray-900">Português</span>
                <div className="text-xs text-gray-600 mt-1">Prof. Maria - 5 turmas</div>
              </div>
              <div className="text-right">
                <div className="text-purple-700 font-bold text-lg">4 aulas/sem</div>
                <div className="text-xs text-purple-600">Distribuição: Diária</div>
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-l-4 border-orange-500 animate-slideInRight" style={{ animationDelay: '0.45s' }}>
              <div>
                <span className="font-bold text-gray-900">Inglês</span>
                <div className="text-xs text-gray-600 mt-1">Prof. João - 6 turmas</div>
              </div>
              <div className="text-right">
                <div className="text-orange-700 font-bold text-lg">2 aulas/sem</div>
                <div className="text-xs text-orange-600">Flexível</div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Total:</span> 52 aulas configuradas
            </div>
            <div className="flex gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">✓ Simples</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Geminadas</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">✓ Preferências</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '🚀 Geração Automática Ultra-Rápida',
      icon: Clock,
      color: 'from-orange-500 to-red-500',
      description: 'Algoritmo inteligente cria horários em segundos',
      demo: (
        <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-lg p-6 shadow-2xl border border-orange-200">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl animate-spin-slow">
                  <Clock className="text-white" size={40} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-2xl text-gray-900 animate-pulse">Processando...</div>
              <div className="text-sm text-gray-600 animate-fadeIn">Analisando 240 aulas • 8 turmas • 15 professores</div>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow animate-slideInLeft">
              <span className="text-xs text-gray-700">✓ Verificando conflitos de horários</span>
              <span className="text-xs font-bold text-green-600">OK</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow animate-slideInLeft" style={{ animationDelay: '0.15s' }}>
              <span className="text-xs text-gray-700">✓ Distribuindo aulas equilibradamente</span>
              <span className="text-xs font-bold text-green-600">OK</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow animate-slideInLeft" style={{ animationDelay: '0.3s' }}>
              <span className="text-xs text-gray-700">✓ Aplicando preferências dos professores</span>
              <span className="text-xs font-bold text-green-600">OK</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow animate-slideInLeft" style={{ animationDelay: '0.45s' }}>
              <span className="text-xs text-gray-700">✓ Organizando aulas geminadas</span>
              <span className="text-xs font-bold text-green-600">OK</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mt-4">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gradient-to-br from-white to-gray-100 rounded shadow-md animate-fillUp border border-gray-200"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-600 animate-fadeIn" style={{ animationDelay: `${i * 0.04 + 0.2}s` }}>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: '✅ Horário Perfeito Gerado!',
      icon: CheckCircle,
      color: 'from-emerald-500 to-green-500',
      description: 'Zero conflitos • Distribuição equilibrada • Otimizado',
      demo: (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-2xl border-2 border-green-400 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <CheckCircle className="text-white" size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-gray-900">Horário Completo</h4>
                  <p className="text-sm text-gray-600">Turma 9º A - Manhã</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">100%</div>
                <div className="text-xs text-green-700">Sucesso</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-inner">
              <div className="grid grid-cols-6 gap-1 mb-2">
                <div className="text-xs font-semibold text-gray-500 text-center">Horário</div>
                {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map(day => (
                  <div key={day} className="text-xs font-bold text-gray-700 text-center bg-gray-100 py-1 rounded">{day}</div>
                ))}
              </div>
              {['7:00', '8:00', '9:00', '10:00', '11:00'].map((time, timeIdx) => (
                <div key={time} className="grid grid-cols-6 gap-1 mb-1">
                  <div className="text-xs font-semibold text-gray-500 flex items-center justify-center">{time}</div>
                  {['Mat', 'Por', 'His', 'Geo', 'Ing', 'Cie', 'Mat', 'Por', 'EF', 'EF', 'Ing', 'His', 'Geo', 'Mat', 'Por', 'Cie', 'Mat', 'Ing', 'Por', 'Geo'].slice(timeIdx * 5, timeIdx * 5 + 5).map((sub, i) => (
                    <div
                      key={i}
                      className={`text-xs font-medium px-2 py-2 rounded text-center shadow animate-slideInUp ${
                        sub === 'Mat' ? 'bg-blue-100 text-blue-800' :
                        sub === 'Por' ? 'bg-purple-100 text-purple-800' :
                        sub === 'His' ? 'bg-yellow-100 text-yellow-800' :
                        sub === 'Geo' ? 'bg-green-100 text-green-800' :
                        sub === 'Ing' ? 'bg-pink-100 text-pink-800' :
                        sub === 'Cie' ? 'bg-teal-100 text-teal-800' :
                        'bg-orange-100 text-orange-800'
                      }`}
                      style={{ animationDelay: `${(timeIdx * 5 + i) * 0.03}s` }}
                    >
                      {sub}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-4 shadow-lg border-l-4 border-blue-500 animate-slideInLeft">
              <div className="text-2xl font-bold text-blue-600 mb-1">0</div>
              <div className="text-xs text-gray-600">Conflitos Detectados</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-lg border-l-4 border-green-500 animate-slideInRight">
              <div className="text-2xl font-bold text-green-600 mb-1">100%</div>
              <div className="text-xs text-gray-600">Aulas Distribuídas</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '📱 Visualização e Personalização',
      icon: Calendar,
      color: 'from-indigo-500 to-purple-500',
      description: 'Veja por turma, professor ou sala • Edite facilmente',
      demo: (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
              <button className="flex-1 py-2 px-3 bg-indigo-500 text-white rounded-lg font-medium text-sm shadow">
                📋 Por Turma
              </button>
              <button className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200">
                👤 Por Professor
              </button>
              <button className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200">
                🏫 Por Sala
              </button>
            </div>
            
            <div className="space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <span className="text-sm font-semibold text-gray-800">9º Ano A</span>
                <div className="flex gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Completo</span>
                  <button className="text-xs bg-white px-3 py-1 rounded-full font-medium text-indigo-600 shadow-sm hover:shadow">Ver</button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <span className="text-sm font-semibold text-gray-800">8º Ano B</span>
                <div className="flex gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Completo</span>
                  <button className="text-xs bg-white px-3 py-1 rounded-full font-medium text-blue-600 shadow-sm hover:shadow">Ver</button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                <span className="text-sm font-semibold text-gray-800">7º Ano C</span>
                <div className="flex gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Completo</span>
                  <button className="text-xs bg-white px-3 py-1 rounded-full font-medium text-green-600 shadow-sm hover:shadow">Ver</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-300 animate-slideInUp">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">✏️</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 mb-1">Edição Fácil</div>
                <div className="text-xs text-gray-700">Arraste e solte para trocar aulas • Clique para editar • Ajuste em tempo real</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '📊 Exportação e Compartilhamento',
      icon: CheckCircle,
      color: 'from-pink-500 to-rose-500',
      description: 'PDF profissional • Impressão • Compartilhamento online',
      demo: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-gradient-to-br from-red-500 to-pink-500 text-white p-4 rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 animate-slideInLeft">
              <div className="text-3xl mb-2">📄</div>
              <div className="font-bold text-sm">Exportar PDF</div>
              <div className="text-xs opacity-90">Alta qualidade</div>
            </button>
            <button className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-4 rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 animate-slideInRight">
              <div className="text-3xl mb-2">🖨️</div>
              <div className="font-bold text-sm">Imprimir</div>
              <div className="text-xs opacity-90">Formato A4</div>
            </button>
            <button className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-4 rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 animate-slideInLeft" style={{ animationDelay: '0.1s' }}>
              <div className="text-3xl mb-2">📧</div>
              <div className="font-bold text-sm">Enviar Email</div>
              <div className="text-xs opacity-90">Para equipe</div>
            </button>
            <button className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white p-4 rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 animate-slideInRight" style={{ animationDelay: '0.1s' }}>
              <div className="text-3xl mb-2">🔗</div>
              <div className="font-bold text-sm">Link Online</div>
              <div className="text-xs opacity-90">Compartilhar</div>
            </button>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 text-white shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <div className="font-bold text-lg">Tudo Pronto!</div>
                  <div className="text-sm text-gray-300">Horários gerados com sucesso</div>
                </div>
              </div>
              <div className="text-4xl animate-bounce">🎉</div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur">
                <div className="text-2xl font-bold text-emerald-400">8</div>
                <div className="text-xs text-gray-300">Turmas</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur">
                <div className="text-2xl font-bold text-blue-400">240</div>
                <div className="text-xs text-gray-300">Aulas</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur">
                <div className="text-2xl font-bold text-pink-400">0</div>
                <div className="text-xs text-gray-300">Conflitos</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
  ];

  // Auto-play
  React.useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        if (nextStep >= steps.length) {
          return 0; // Reinicia do começo
        }
        return nextStep;
      });
    }, 4500); // 4.5 segundos por passo

    return () => clearInterval(timer);
  }, [isPlaying, currentStep, steps.length]);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl">
      {/* Header do "Vídeo" */}
      <div className={`bg-gradient-to-r ${steps[currentStep].color} p-6 text-white`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur">
            <CurrentIcon size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{steps[currentStep].title}</h3>
            <p className="text-white text-opacity-90 text-sm">{steps[currentStep].description}</p>
          </div>
        </div>
      </div>

      {/* Área de Demonstração */}
      <div className="p-8 min-h-[320px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        {steps[currentStep].demo}
      </div>

      {/* Controles */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center gap-4">
          {/* Botão Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition"
          >
            {isPlaying ? (
              <span className="text-xl">⏸️</span>
            ) : (
              <span className="text-xl">▶️</span>
            )}
          </button>

          {/* Barra de Progresso */}
          <div className="flex-1 flex gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentStep(index);
                  setIsPlaying(false);
                }}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-white'
                    : index < currentStep
                    ? 'bg-gray-400'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Contador */}
          <div className="text-white text-sm font-medium">
            {currentStep + 1}/{steps.length}
          </div>
        </div>
      </div>

      {/* CSS para animações */}
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fillUp {
          from {
            opacity: 0;
            transform: scaleY(0);
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out forwards;
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out forwards;
        }

        .animate-slideInUp {
          animation: slideInUp 0.4s ease-out forwards;
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-fillUp {
          animation: fillUp 0.4s ease-out forwards;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  // Log inicial para confirmar que o componente foi carregado
  console.log('🔵 Componente Login carregado');

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🟢 handleSubmit CHAMADO!');
    e.preventDefault();
    console.log('🟢 preventDefault executado');
    setLoading(true);

    console.log('🔐 Tentando fazer login com:', { email, password: '***' });

    try {
      console.log('📡 Enviando requisição para:', api.defaults.baseURL + '/auth/login');
      const response = await api.post('/auth/login', { email, password });
      console.log('✅ Resposta do servidor:', response.data);
      
      setAuth(response.data.token, response.data.user);
      console.log('✅ Token salvo no store');
      
      toast.success('Login realizado com sucesso!');
      
      // Redirecionar baseado no tipo de usuário
      if (response.data.user.role === 'admin' || response.data.user.role === 'super-admin') {
        console.log('➡️ Redirecionando para /admin-dashboard');
        navigate('/admin-dashboard');
      } else {
        console.log('➡️ Redirecionando para /dashboard');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('❌ Erro ao fazer login:', error);
      console.error('❌ Response:', error.response?.data);
      
      // Tratamento especial para rate limiting (muitas tentativas)
      if (error.response?.status === 429) {
        toast.error(
          '🔒 Muitas tentativas de login. Por segurança, aguarde 15 minutos antes de tentar novamente.',
          { duration: 8000 }
        );
      }
      // Tratamento especial para contas pendentes de aprovação
      else if (error.response?.status === 403) {
        const data = error.response?.data;
        
        if (data?.status === 'pending_approval') {
          toast.error(data.message, { duration: 6000 });
        } else if (data?.status === 'suspended') {
          toast.error(data.message, { duration: 6000 });
        } else if (data?.status === 'rejected') {
          toast.error(data.message, { duration: 6000 });
        } else {
          toast.error(data?.message || 'Acesso negado');
        }
      } else {
        const errorMessage = error.response?.data?.message || 'Erro ao fazer login';
        // Se a mensagem contém "tentativas" ou "minutos", é rate limiting
        if (errorMessage.toLowerCase().includes('tentativas') || errorMessage.toLowerCase().includes('minutos')) {
          toast.error('🔒 ' + errorMessage, { duration: 8000 });
        } else {
          toast.error(errorMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 p-4">
      <InstallPWA />
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <LogIn className="text-primary-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            EduSync-PRO
          </h1>
          <p className="text-gray-600">
            Sistema Criador de Horário de Aula Escolar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-12"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            onClick={() => console.log('🔴 BOTÃO CLICADO!')}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Botão Ver Demonstração */}
        <button
          type="button"
          onClick={() => setShowDemo(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
        >
          <PlayCircle size={20} />
          Ver como funciona o sistema
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Link to="/register-school" className="text-primary-600 hover:text-primary-700 font-medium">
              Cadastre sua escola
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            © 2025 Wander Pires Silva Coelho
            <br />
            wanderpsc@gmail.com

      {/* Modal de Demonstração */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-sm" onClick={() => setShowDemo(false)}>
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Como Funciona o EduSync-PRO</h2>
                <button onClick={() => setShowDemo(false)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
              <p className="mt-2 text-purple-100">Crie horários escolares automaticamente em minutos</p>
            </div>

            {/* Conteúdo */}
            <div className="p-8 space-y-8">
              {/* Demonstração Visual Animada */}
              <DemoVideo />

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Detalhes das Funcionalidades</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              {/* Passo 1 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="text-primary-600" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">1. Cadastre Professores e Turmas</h3>
                  <p className="text-gray-600 mb-4">Registre todos os professores com suas disciplinas e disponibilidade. Cadastre as turmas com séries e turnos.</p>
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-700">
                      <p>✓ Professores com múltiplas disciplinas</p>
                      <p>✓ Definição de carga horária por turma</p>
                      <p>✓ Controle de disponibilidade de horários</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="text-blue-600" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">2. Configure Disciplinas e Grades</h3>
                  <p className="text-gray-600 mb-4">Defina as disciplinas, quantidade de aulas semanais e suas distribuições nas turmas.</p>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-gray-700">
                      <p>✓ Aulas simples ou duplas (geminadas)</p>
                      <p>✓ Prioridade de disciplinas</p>
                      <p>✓ Restrições de horários específicos</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="text-green-600" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">3. Gere o Horário Automaticamente</h3>
                  <p className="text-gray-600 mb-4">Com um clique, o sistema cria o horário completo respeitando todas as regras e evitando conflitos.</p>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="text-sm text-gray-700">
                      <p>✓ Algoritmo inteligente de distribuição</p>
                      <p>✓ Prevenção automática de conflitos</p>
                      <p>✓ Distribuição equilibrada de aulas</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-purple-600" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">4. Visualize e Ajuste</h3>
                  <p className="text-gray-600 mb-4">Veja o horário gerado, faça ajustes manuais se necessário e exporte em PDF.</p>
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <div className="text-sm text-gray-700">
                      <p>✓ Visualização por turma ou professor</p>
                      <p>✓ Edição manual de horários</p>
                      <p>✓ Exportação em PDF e impressão</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefícios */}
              <div className="bg-gradient-to-br from-primary-50 to-purple-50 border-2 border-primary-200 rounded-xl p-6 mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Benefícios do Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                    <span className="text-gray-700">Economia de tempo (horas → minutos)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                    <span className="text-gray-700">Zero conflitos de horários</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                    <span className="text-gray-700">Distribuição equilibrada</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                    <span className="text-gray-700">Fácil ajuste e replanejamento</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold text-gray-900 mb-1">Pronto para começar?</h3>
                  <p className="text-sm text-gray-600">Cadastre sua escola e experimente agora!</p>
                </div>
                <button onClick={() => setShowDemo(false)} className="btn btn-primary whitespace-nowrap">
                  Entendi, vamos começar!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
            <br />
            Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
