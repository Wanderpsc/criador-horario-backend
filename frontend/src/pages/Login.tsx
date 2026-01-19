import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
      
      // Tratamento especial para contas pendentes de aprovação
      if (error.response?.status === 403) {
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
        toast.error(error.response?.data?.message || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 p-4">
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
            <br />
            Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
