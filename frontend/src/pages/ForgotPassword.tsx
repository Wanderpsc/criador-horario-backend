import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Digite seu email');
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email
      });

      if (response.data.success) {
        setEmailSent(true);
        toast.success('Email enviado! Verifique sua caixa de entrada.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
          <div className="mb-6">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Email Enviado!</h2>
            <p className="text-gray-600 mt-2">
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700">
              <strong>Não recebeu o email?</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
              <li>Verifique a pasta de spam</li>
              <li>Aguarde alguns minutos</li>
              <li>Verifique se o email está correto</li>
            </ul>
          </div>

          <Link
            to="/login"
            className="text-blue-600 hover:underline flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Voltar para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Esqueceu a Senha?</h1>
          <p className="text-gray-600 mt-2">
            Digite seu email e enviaremos instruções para redefinir sua senha
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
              placeholder="seuemail@exemplo.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-blue-600 hover:underline flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Voltar para login
          </Link>
        </div>

        <footer className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>© 2025 Wander Pires Silva Coelho</p>
          <p>wanderpsc@gmail.com</p>
          <p>Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  );
}
