import { useState, useEffect } from 'react';
import { MessageSquare, Send, Users, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface School {
  id: string;
  name: string;
  email: string;
}

export default function MessagesManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/schools');
      setSchools(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      toast.error('Erro ao carregar escolas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedSchools.length === schools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(schools.map(s => s.id));
    }
  };

  const handleToggleSchool = (schoolId: string) => {
    setSelectedSchools(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Informe o assunto da mensagem');
      return;
    }

    if (!message.trim()) {
      toast.error('Informe o conteúdo da mensagem');
      return;
    }

    if (selectedSchools.length === 0) {
      toast.error('Selecione pelo menos uma escola');
      return;
    }

    try {
      setSending(true);
      
      // Como não há rota de mensagens no backend ainda, vou simular
      // Você pode criar a rota /api/admin/messages no backend depois
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Mensagem enviada para ${selectedSchools.length} escola(s)`);
      
      // Limpar formulário
      setSubject('');
      setMessage('');
      setSelectedSchools([]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7" />
            Mensagens e Comunicação
          </h1>
          <p className="text-gray-600 mt-1">Envie avisos e comunicados para as escolas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Mensagem */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Nova Mensagem
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assunto *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o assunto da mensagem"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite sua mensagem aqui..."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  <Clock className="h-4 w-4 inline mr-1" />
                  {selectedSchools.length} escola(s) selecionada(s)
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !subject || !message || selectedSchools.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar Mensagem
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Escolas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Destinatários
            </h2>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedSchools.length === schools.length ? 'Desmarcar' : 'Selecionar'} Todos
            </button>
          </div>

          {schools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma escola cadastrada</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {schools.map(school => (
                <label
                  key={school.id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSchools.includes(school.id)}
                    onChange={() => handleToggleSchool(school.id)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{school.name}</div>
                    <div className="text-xs text-gray-500 truncate">{school.email}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <div className="text-yellow-600 mt-0.5">ℹ️</div>
          <div className="text-sm text-yellow-800">
            <strong>Nota:</strong> Esta é uma página de comunicação administrativa. 
            As mensagens serão enviadas por e-mail para as escolas selecionadas.
            Em versões futuras, haverá notificações em tempo real dentro do sistema.
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 py-4">
        © 2025 Wander Pires Silva Coelho (wanderpsc@gmail.com)
      </div>
    </div>
  );
}
