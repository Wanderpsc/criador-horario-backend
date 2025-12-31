import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Send, MessageSquare, User, Clock, Eye, FileText, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface Message {
  _id: string;
  from: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  to: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  subject: string;
  message: string;
  internalNotes?: string[];
  isRead: boolean;
  createdAt: string;
  replies?: Message[];
}

interface Conversation {
  conversationId: string;
  school: {
    _id: string;
    name: string;
    email: string;
  };
  lastMessage: Message;
  unreadCount: number;
  messages: Message[];
}

export default function LiveMessaging() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/messages/conversations');
      setConversations(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await api.get(`/messages/conversation/${conversationId}`);
      const messages = response.data || [];
      
      // Criar objeto de conversa com as mensagens
      const conv = conversations.find(c => c.conversationId === conversationId);
      if (conv) {
        setSelectedConversation({ ...conv, messages });
      }
      
      // Marcar como lidas
      await api.patch(`/messages/conversation/${conversationId}/read`);
      fetchConversations(); // Atualizar contador
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      
      const data: any = {
        message: newMessage
      };

      if (selectedConversation) {
        // Responder conversa existente
        data.toUserId = selectedConversation.school._id;
      } else {
        // Nova mensagem (apenas cliente pode iniciar)
        if (!subject.trim()) {
          alert('Digite um assunto');
          return;
        }
        data.subject = subject;
      }

      await api.post('/messages/send', data);
      
      setNewMessage('');
      setSubject('');
      setShowNewMessage(false);
      
      if (selectedConversation) {
        fetchMessages(selectedConversation.conversationId);
      } else {
        fetchConversations();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInternalNote = async (messageId: string) => {
    if (!internalNote.trim() || !isAdmin) return;

    try {
      await api.post(`/messages/${messageId}/internal-note`, {
        note: internalNote
      });
      
      setInternalNote('');
      if (selectedConversation) {
        fetchMessages(selectedConversation.conversationId);
      }
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isAdmin ? 'Mensagens de Clientes' : 'Mensagens'}
            </h1>
            <p className="text-sm text-gray-600">
              {isAdmin 
                ? 'Converse com seus clientes e adicione notas internas'
                : 'Entre em contato com o suporte'}
            </p>
          </div>
          
          {!isAdmin && !selectedConversation && (
            <button
              onClick={() => setShowNewMessage(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Nova Mensagem
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Lista de conversas */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">
              {isAdmin ? 'Conversas' : 'Suas Mensagens'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma conversa ainda</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.conversationId}
                  onClick={() => fetchMessages(conv.conversationId)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.conversationId === conv.conversationId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {isAdmin ? conv.school.name : 'Administrador'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1 line-clamp-1">
                    {conv.lastMessage.subject}
                  </p>
                  
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {conv.lastMessage.message}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(conv.lastMessage.createdAt).toLocaleString('pt-BR')}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Área principal - Mensagens */}
        <div className="flex-1 flex flex-col">
          {showNewMessage && !isAdmin ? (
            // Formulário de nova mensagem (apenas cliente)
            <div className="flex-1 flex flex-col p-6">
              <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto w-full">
                <h3 className="text-xl font-bold mb-4">Nova Mensagem para Administrador</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assunto
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Dúvida sobre funcionalidade"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensagem
                    </label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSendMessage}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {loading ? 'Enviando...' : 'Enviar Mensagem'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowNewMessage(false);
                        setSubject('');
                        setNewMessage('');
                      }}
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedConversation ? (
            // Conversa selecionada
            <>
              {/* Header da conversa */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {isAdmin ? selectedConversation.school.name : 'Administrador'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {isAdmin ? selectedConversation.school.email : 'Suporte do sistema'}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedConversation.messages.map((msg) => {
                  const isMyMessage = msg.from._id === user?.id;
                  
                  return (
                    <div key={msg._id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-2xl ${isMyMessage ? 'text-right' : 'text-left'}`}>
                        {/* Mensagem */}
                        <div
                          className={`inline-block px-4 py-3 rounded-lg ${
                            isMyMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1 text-xs opacity-75">
                            <User className="w-3 h-3" />
                            <span>{msg.from.name}</span>
                          </div>
                          
                          {msg.subject && (
                            <div className="font-bold mb-2">{msg.subject}</div>
                          )}
                          
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          
                          <div className="flex items-center gap-2 mt-2 text-xs opacity-75">
                            <Clock className="w-3 h-3" />
                            {new Date(msg.createdAt).toLocaleString('pt-BR')}
                            {msg.isRead && <Eye className="w-3 h-3" />}
                          </div>
                        </div>

                        {/* Notas internas (apenas admin vê) */}
                        {isAdmin && msg.internalNotes && msg.internalNotes.length > 0 && (
                          <div className="mt-2 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                            <div className="flex items-center gap-2 text-yellow-800 text-xs font-bold mb-2">
                              <FileText className="w-3 h-3" />
                              NOTAS INTERNAS (privado)
                            </div>
                            {msg.internalNotes.map((note, idx) => (
                              <p key={idx} className="text-sm text-yellow-900 mb-1">
                                • {note}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Adicionar nota interna (apenas admin) */}
                        {isAdmin && (
                          <div className="mt-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={internalNote}
                                onChange={(e) => setInternalNote(e.target.value)}
                                placeholder="Adicionar nota interna (privado)..."
                                className="flex-1 px-3 py-1 text-sm border border-yellow-300 rounded bg-yellow-50 focus:ring-2 focus:ring-yellow-400"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddInternalNote(msg._id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleAddInternalNote(msg._id)}
                                className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input de resposta */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua resposta..."
                    rows={3}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !newMessage.trim()}
                    className="px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Pressione Enter para enviar, Shift+Enter para nova linha
                </p>
              </div>
            </>
          ) : (
            // Estado vazio
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">
                  {isAdmin 
                    ? 'Selecione uma conversa para visualizar'
                    : conversations.length === 0
                      ? 'Nenhuma mensagem ainda. Clique em "Nova Mensagem" para começar.'
                      : 'Selecione uma conversa ao lado'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legenda de notas internas */}
      {isAdmin && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span>
              <strong>Notas Internas:</strong> Apenas administradores podem ver e adicionar notas internas.
              Os clientes não têm acesso a essas informações.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
