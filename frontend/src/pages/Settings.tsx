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
  const isAdmin = authUser?.role === 'admin';
  
  // Debug - ver o que está no authUser
  React.useEffect(() => {
    console.log('👤 Auth User:', authUser);
    console.log('🔑 Role:', authUser?.role);
    console.log('✅ Is Admin:', isAdmin);
  }, [authUser, isAdmin]);
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SchoolUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });

  const [newPassword, setNewPassword] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<Permissions>({});

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
      toast.error('Preen cha nome e e-mail');
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
      {!isAdmin && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="text-yellow-400 mr-3" size={24} />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Apenas administradores podem criar usuários
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Você está logado como: <strong>{authUser?.name}</strong> ({authUser?.email})<br/>
                Role: <strong>"{authUser?.role}"</strong> {authUser?.role !== 'admin' && '(precisa ser "admin")'}
              </p>
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
        {isAdmin && (
          <button
            onClick={handleCreateUser}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Usuário
          </button>
        )}
      </div>

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
                      className="text-blue-600 hover:text-blue-900"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleEditPermissions(user)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Permissões"
                    >
                      <Shield size={18} />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="text-orange-600 hover:text-orange-900"
                      title="Resetar Senha"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-900"
                      title="Excluir"
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
