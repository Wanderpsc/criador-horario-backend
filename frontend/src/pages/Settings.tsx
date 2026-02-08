import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Edit2, Trash2, Key, CheckCircle, XCircle, 
  Shield, Save, X, Eye, EyeOff, FileText, Download, Filter, AlertCircle 
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface Permission {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
  access?: boolean;
  generate?: boolean;
  manage?: boolean;
}

interface Permissions {
  [key: string]: Permission;
}

interface SchoolUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  permissions: Permissions;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const permissionLabels: { [key: string]: string } = {
  teachers: 'Professores',
  subjects: 'Disciplinas',
  grades: 'Séries',
  classes: 'Turmas',
  classSubjects: 'Disciplinas por Turma',
  teacherSubjects: 'Professores por Disciplina',
  schedules: 'Horários Base',
  timetableGenerator: 'Gerar Horários',
  calendar: 'Calendário Letivo',
  notifications: 'Comunicados',
  emergencySchedule: 'Horário Emergencial',
  teacherAttendance: 'Frequência Professores',
  frequencyReports: 'Relatórios de Frequência',
  displayPanel: 'Painel de Exibição',
  settings: 'Configurações',
  users: 'Gerenciar Usuários',
  auditLogs: 'Logs de Auditoria'
};

export default function Settings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authUser = useAuthStore(state => state.user);
  
  // Dono da escola (role: 'school') ou admin da escola (role: 'admin') podem gerenciar usuários
  const canManageUsers = authUser?.role === 'admin' || authUser?.role === 'school';
  
  // Debug - ver o que está no authUser
  React.useEffect(() => {
    console.log('👤 Auth User:', authUser);
    console.log('🔑 Role:', authUser?.role);
    console.log('✅ Can Manage Users:', canManageUsers);
  }, [authUser, canManageUsers]);
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SchoolUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showMyPasswordModal, setShowMyPasswordModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });

  const [newPassword, setNewPassword] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<Permissions>({});
  
  // Minha senha
  const [myPasswordData, setMyPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch users
  const { data: users = [], isLoading } = useQuery<SchoolUser[]>({
    queryKey: ['school-users'],
    queryFn: async () => {
      const response = await api.get('/school-users');
      return response.data;
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post('/school-users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-users'] });
      toast.success('Usuário criado com sucesso!');
      setShowUserModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar usuário');
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SchoolUser> }) => {
      return await api.put(`/school-users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-users'] });
      toast.success('Usuário atualizado com sucesso!');
      setShowUserModal(false);
      setShowPermissionModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar usuário');
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/school-users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-users'] });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir usuário');
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      return await api.post(`/school-users/${id}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      toast.success('Senha resetada com sucesso!');
      setShowResetPasswordModal(false);
      setNewPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao resetar senha');
    }
  });

  // Change my password mutation
  const changeMyPasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      console.log('🔐 Alterando senha...');
      return await api.post('/auth/change-password', data);
    },
    onSuccess: () => {
      console.log('✅ Senha alterada com sucesso!');
      toast.success('Sua senha foi alterada com sucesso!');
      setShowMyPasswordModal(false);
      setMyPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao alterar senha:', error);
      console.error('Response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Erro ao alterar senha';
      toast.error(errorMessage, { duration: 5000 });
    }
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'user' });
    setSelectedUser(null);
    setEditingPermissions({});
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    resetForm();
    setShowUserModal(true);
  };

  const handleEditUser = (user: SchoolUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowUserModal(true);
  };

  const handleEditPermissions = (user: SchoolUser) => {
    setSelectedUser(user);
    setEditingPermissions(JSON.parse(JSON.stringify(user.permissions)));
    setShowPermissionModal(true);
  };

  const handleSaveUser = () => {
    if (!formData.name || !formData.email) {
      toast.error('Preencha nome e e-mail');
      return;
    }

    // Verificar se está tentando usar o email da escola logada
    if (!selectedUser && formData.email.toLowerCase() === authUser?.email?.toLowerCase()) {
      toast.error(
        `❌ O email ${authUser.email} já é usado pela escola (você)!\n\n` +
        `✅ Use emails únicos:\n` +
        `• secretaria@ceti.com\n` +
        `• coordenador@ceti.com\n` +
        `• professor@ceti.com`,
        { duration: 6000 }
      );
      return;
    }

    if (!selectedUser && !formData.password) {
      toast.error('Senha é obrigatória para novo usuário');
      return;
    }

    if (selectedUser) {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateUserMutation.mutate({ id: selectedUser._id, data: updateData });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;
    
    updateUserMutation.mutate({
      id: selectedUser._id,
      data: { permissions: editingPermissions }
    });
  };

  const handleDeleteUser = (user: SchoolUser) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      deleteUserMutation.mutate(user._id);
    }
  };

  const handleChangeMyPassword = () => {
    if (!myPasswordData.currentPassword) {
      toast.error('Digite sua senha atual');
      return;
    }
    if (!myPasswordData.newPassword || myPasswordData.newPassword.length < 6) {
      toast.error('Nova senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (myPasswordData.newPassword !== myPasswordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    changeMyPasswordMutation.mutate({
      currentPassword: myPasswordData.currentPassword,
      newPassword: myPasswordData.newPassword
    });
  };

  const handleResetPassword = (user: SchoolUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const handleConfirmResetPassword = () => {
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    resetPasswordMutation.mutate({ id: selectedUser._id, newPassword });
  };

  const togglePermission = (resource: string, action: string) => {
    setEditingPermissions(prev => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [action]: !((prev[resource] as any)?.[action] || false)
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Alerta de permissões */}
      {!canManageUsers && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="text-yellow-400 mr-3" size={24} />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Apenas o dono da escola ou administradores podem criar usuários
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Você está logado como: <strong>{authUser?.name}</strong> ({authUser?.email})<br/>
                Role: <strong>"{authUser?.role}"</strong> {authUser?.role !== 'admin' && authUser?.role !== 'school' && '(precisa ser "admin" ou "school")'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instruções para o usuário */}
      {canManageUsers && users.length === 0 && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="text-blue-400 mr-3" size={24} />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                ℹ️ Como Criar Usuários da Escola
              </h3>
              <p className="text-sm text-blue-700 mt-2">
                <strong>Você está logado como: {authUser?.name} ({authUser?.email})</strong>
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Você já é o <strong>administrador principal</strong> da escola! Agora crie usuários para sua equipe:
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                <li><strong>Secretária:</strong> secretaria@ceti.com / SenhaSecretaria@2026</li>

      {/* Card de Segurança - Minha Senha */}
      <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Key className="text-orange-600" />
              🔐 Minha Conta - Segurança
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Logado como: <strong>{authUser?.name}</strong> ({authUser?.email})
            </p>
            <p className="text-sm text-gray-600">
              Altere sua senha de acesso a qualquer momento
            </p>
          </div>
          <button
            onClick={() => setShowMyPasswordModal(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
          >
            <Key size={20} />
            Alterar Minha Senha
          </button>
        </div>
      </div>
                <li><strong>Coordenador:</strong> coordenador@ceti.com / SenhaCoordenador@2026</li>
                <li><strong>Professor:</strong> professor@ceti.com / SenhaProfessor@2026</li>
              </ul>
              <p className="text-sm text-blue-700 mt-2">
                ⚠️ <strong>Não use o email {authUser?.email} novamente!</strong> Cada funcionário deve ter um email único.
              </p>
              <p className="text-sm text-blue-700 mt-2">
                ✅ Depois de criar, você pode:
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 ml-4 space-y-1">
                <li>🔑 <strong>Resetar senhas</strong> (ícone de chave)</li>
                <li>🛡️ <strong>Configurar permissões</strong> (ícone de escudo) - escolha quais botões/páginas cada usuário pode acessar</li>
                <li>✏️ <strong>Editar dados</strong> (ícone de lápis)</li>
                <li>🗑️ <strong>Excluir usuários</strong> (ícone de lixeira)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-primary-600" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-gray-600 mt-1">
            Controle completo de usuários e permissões do sistema
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={handleCreateUser}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Usuário
          </button>
        )}
      </div>

      {/* Card de Funcionalidades Disponíveis */}
      {canManageUsers && users.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Shield className="text-green-600" />
            ✅ Funcionalidades Disponíveis para Gerenciamento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <Key className="text-orange-600 mt-1" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-900">🔑 Resetar Senhas</h4>
                  <p className="text-sm text-gray-600">
                    Clique no ícone 🔑 (laranja) para definir uma nova senha para qualquer usuário
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <Shield className="text-purple-600 mt-1" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-900">🛡️ Configurar Permissões</h4>
                  <p className="text-sm text-gray-600">
                    Clique no ícone 🛡️ (roxo) para escolher quais páginas/botões cada usuário pode acessar
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de usuários */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-mail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último Acesso
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      {user.role === 'admin' ? (
                        <Shield className="text-primary-600" size={20} />
                      ) : (
                        <Users className="text-primary-600" size={20} />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isActive ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      <CheckCircle size={14} className="mr-1" />
                      Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      <XCircle size={14} className="mr-1" />
                      Inativo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString('pt-BR')
                    : 'Nunca'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition"
                      title="✏️ Editar dados do usuário"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleEditPermissions(user)}
                      className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition"
                      title="🛡️ Configurar Permissões (escolher quais páginas/botões pode acessar)"
                    >
                      <Shield size={18} />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="p-2 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-lg transition"
                      title="🔑 Resetar Senha do usuário"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                      title="🗑️ Excluir usuário"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Criar/Editar Usuário */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {selectedUser && '(deixe em branco para não alterar)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveUser}
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Salvar
              </button>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Permissões */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="text-primary-600" />
              Permissões de {selectedUser.name}
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
              {Object.entries(permissionLabels).map(([resource, label]) => {
                const resourcePerms = editingPermissions[resource] || {};
                const actions = Object.keys(resourcePerms);

                return (
                  <div key={resource} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{label}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {actions.map((action) => (
                        <label key={action} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(resourcePerms as any)[action] || false}
                            onChange={() => togglePermission(resource, action)}
                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSavePermissions}
                disabled={updateUserMutation.isPending}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Salvar Permissões
              </button>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reset de Senha */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Key className="text-primary-600" />
              Resetar Senha
            </h2>
            <p className="text-gray-600 mb-4">
              Resetar senha de: <strong>{selectedUser.name}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Nova senha (mínimo 6 caracteres)"
                minLength={6}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmResetPassword}
                disabled={resetPasswordMutation.isPending}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                <Key size={18} />
                Resetar
              </button>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setNewPassword('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alterar Minha Senha */}
      {showMyPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Key className="text-orange-600" />
              🔐 Alterar Minha Senha
            </h2>
            <p className="text-gray-600 mb-4">
              Conta: <strong>{authUser?.name}</strong> ({authUser?.email})
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                <input
                  type="password"
                  value={myPasswordData.currentPassword}
                  onChange={(e) => setMyPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={myPasswordData.newPassword}
                  onChange={(e) => setMyPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Nova senha (mínimo 6 caracteres)"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={myPasswordData.confirmPassword}
                  onChange={(e) => setMyPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Digite novamente a nova senha"
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleChangeMyPassword}
                disabled={changeMyPasswordMutation.isPending}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
              >
                <Key size={18} />
                {changeMyPasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
              </button>
              <button
                onClick={() => {
                  setShowMyPasswordModal(false);
                  setMyPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link para Logs de Auditoria */}
      <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="text-purple-600" />
              Logs de Auditoria
            </h3>
            <p className="text-gray-600 mt-1">
              Visualize todos os acessos e edições realizadas por usuários
            </p>
          </div>
          <button
            onClick={() => navigate('/audit-logs')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <FileText size={18} />
            Ver Logs
          </button>
        </div>
      </div>
    </div>
  );
}
