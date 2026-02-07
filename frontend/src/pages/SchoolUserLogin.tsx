import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function SchoolUserLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Preencha e-mail e senha');
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Tentando login com:', email);
      
      const response = await api.post('/school-users/login', {
        email: email.trim(),
        password
      });

      console.log('✅ Login bem-sucedido:', response.data);

      const { token, user } = response.data;

      // Salvar no store e localStorage
      setAuth(token, user);
      localStorage.setItem('school_user_token', token);
      localStorage.setItem('school_user', JSON.stringify(user));

      toast.success(`Bem-vindo(a), ${user.name}!`);

      // Redirecionar para dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      const errorMsg = error.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-xl">
            <Shield className="text-primary-600"size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Sistema Escolar
          </h1>
          <p className="text-primary-100 text-lg">
            Área de acesso para usuários
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* E-mail */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Senha */}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Entrar
                </>
              )}
            </button>
          </form>

          {/* Informações */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Esqueceu sua senha? Entre em contato com o administrador.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-8 text-primary-100 text-sm">
          <p>© 2025 Sistema Criador de Horário de Aula Escolar</p>
          <p className="mt-1">Wander Pires Silva Coelho - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
