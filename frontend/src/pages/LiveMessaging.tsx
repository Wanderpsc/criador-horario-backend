import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Users, Smartphone, CheckCircle } from 'lucide-react';
import api from '../lib/axios';

interface Teacher {
  id?: string;
  _id?: string;
  name: string;
  phone?: string;
  email?: string;
}

export default function LiveMessaging() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [sendInternal, setSendInternal] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const teachersWithPhone = useMemo(
    () => teachers.filter((teacher) => !!teacher.phone),
    [teachers]
  );

  useEffect(() => {
    void loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/live-messages/teachers');
      const teacherList: Teacher[] = response.data?.data || [];
      setTeachers(teacherList);
    } catch (error: any) {
      console.error('Erro ao carregar professores:', error);
      toast.error(error.response?.data?.message || 'Erro ao carregar professores');
    } finally {
      setLoading(false);
    }
  };

  const teacherId = (teacher: Teacher) => teacher.id || teacher._id || '';

  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleSend = async () => {
    const text = message.trim();

    if (!text) {
      toast.error('Digite a mensagem antes de enviar');
      return;
    }

    if (!sendInternal && !sendWhatsApp) {
      toast.error('Selecione ao menos um canal (Mensagem Interna ou WhatsApp)');
      return;
    }

    if (!sendToAll && selectedTeacherIds.length === 0) {
      toast.error('Selecione pelo menos um professor');
      return;
    }

    try {
      setSending(true);

      const payload = {
        recipientIds: sendToAll ? [] : selectedTeacherIds,
        message: text,
        sendToAll,
        channels: {
          internal: sendInternal,
          whatsapp: sendWhatsApp,
        },
      };

      const response = await api.post('/live-messages/send', payload);

      toast.success(response.data?.message || 'Mensagem enviada com sucesso');
      setMessage('');
      setSelectedTeacherIds([]);
      setSendToAll(true);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error.response?.data?.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Carregando professores...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-7 w-7" />
          Mensagens ao Vivo
        </h1>
        <p className="text-gray-600 mt-1">
          Envie avisos para professores por mensagem interna e WhatsApp em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Canal de envio</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={sendInternal}
                  onChange={(e) => setSendInternal(e.target.checked)}
                  className="w-4 h-4"
                />
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>Mensagem Interna</span>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="w-4 h-4"
                />
                <Smartphone className="h-4 w-4 text-green-600" />
                <span>WhatsApp Business</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Destinatários</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={sendToAll}
                  onChange={() => setSendToAll(true)}
                  className="w-4 h-4"
                />
                <span>Enviar para todos os professores ativos</span>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={!sendToAll}
                  onChange={() => setSendToAll(false)}
                  className="w-4 h-4"
                />
                <span>Selecionar professores específicos</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              placeholder="Digite a mensagem para os professores..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Enviando...' : 'Enviar Agora'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-indigo-600" />
            Professores
          </h2>

          <div className="mb-3 text-sm text-gray-600">
            Com telefone: <strong>{teachersWithPhone.length}</strong> / Total: <strong>{teachers.length}</strong>
          </div>

          {sendToAll ? (
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded p-3">
              Todos os professores com telefone cadastrado receberão a mensagem.
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {teachersWithPhone.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum professor com telefone cadastrado.</p>
              ) : (
                teachersWithPhone.map((teacher) => {
                  const id = teacherId(teacher);
                  const checked = selectedTeacherIds.includes(id);

                  return (
                    <label
                      key={id}
                      className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeacher(id)}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{teacher.name}</div>
                        <div className="text-xs text-gray-600 truncate">{teacher.phone}</div>
                        {teacher.email && (
                          <div className="text-xs text-gray-500 truncate">{teacher.email}</div>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
