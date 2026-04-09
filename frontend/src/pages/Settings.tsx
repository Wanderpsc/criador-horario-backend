import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Edit2, Trash2, Key, CheckCircle, XCircle, 
  Shield, Save, X, Eye, EyeOff, FileText, AlertCircle,
  Printer, Upload, Building
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { invalidatePrintHeaderCache, buildPrintHeaderHtml, printHeaderCss, printFooterCss, buildPrintFooterHtml, type PrintHeaderData } from '../utils/printHeader';

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
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  permissions: Permissions;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const permissionLabels: { [key: string]: string } = {
  dashboard: 'Painel Principal',
  teachers: 'Professores',
  subjects: 'Componentes Curriculares',
  grades: 'Anos / Séries',
  classes: 'Turmas',
  classSubjects: 'Turmas & Componentes',
  teacherSubjects: 'Lotação de Professores',
  schedules: 'Grade de Horários',
  timetableGenerator: 'Gerador Inteligente',
  calendar: 'Calendário Letivo',
  emergencySchedule: 'Horário Emergencial e Sábado de Reposição',
  teacherAttendance: 'Controle de Frequência',
  frequencyReports: 'Relatórios de Frequência',
  displayPanel: 'Painel de Avisos (TV)',
  settings: 'Configurações Gerais',
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
    console.log('=== DEBUG SETTINGS ===');
    console.log('👤 Auth User completo:', JSON.stringify(authUser, null, 2));
    console.log('🔑 Role:', authUser?.role);
    console.log('📧 Email:', authUser?.email);
    console.log('👥 Nome:', authUser?.name);
    console.log('✅ Can Manage Users:', canManageUsers);
    console.log('🧪 Teste: role === "school"?', authUser?.role === 'school');
    console.log('🧪 Teste: role === "admin"?', authUser?.role === 'admin');
    console.log('======================');
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

  // Print Header States
  const [printHeaderData, setPrintHeaderData] = useState<PrintHeaderData>({
    emblemBase64: '',
    emblemBase64Right: '',
    emblemSizeLeft: 80,
    emblemSizeRight: 80,
    line1: '',
    line2: '',
    line3: '',
    line4: '',
    line5: '',
    line6: '',
    line7: '',
  });
  const [editingPrintHeader, setEditingPrintHeader] = useState(false);
  const [savingPrintHeader, setSavingPrintHeader] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRightRef = useRef<HTMLInputElement>(null);

  // School settings states
  const [schoolFormData, setSchoolFormData] = useState({
    schoolName: '',
    workingDays: 5,
    academicYear: new Date().getFullYear()
  });

  useEffect(() => {
    loadPrintHeaderData();
    loadSchoolProfile();
  }, []);

  const loadSchoolProfile = async () => {
    try {
      const response = await api.get('/schools/profile');
      if (response.data.success) {
        const data = response.data.data;
        setSchoolFormData({
          schoolName: data.schoolName || '',
          workingDays: data.workingDays || 5,
          academicYear: data.academicYear || new Date().getFullYear()
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados da escola:', error);
    }
  };

  const loadPrintHeaderData = async () => {
    try {
      const response = await api.get('/schools/print-header');
      if (response.data.success) {
        setPrintHeaderData({
          emblemBase64: response.data.data.printHeader?.emblemBase64 || '',
          emblemBase64Right: response.data.data.printHeader?.emblemBase64Right || '',
          emblemSizeLeft: response.data.data.printHeader?.emblemSizeLeft || 80,
          emblemSizeRight: response.data.data.printHeader?.emblemSizeRight || 80,
          line1: response.data.data.printHeader?.line1 || '',
          line2: response.data.data.printHeader?.line2 || '',
          line3: response.data.data.printHeader?.line3 || '',
          line4: response.data.data.printHeader?.line4 || '',
          line5: response.data.data.printHeader?.line5 || '',
          line6: response.data.data.printHeader?.line6 || '',
          line7: response.data.data.printHeader?.line7 || '',
          schoolName: response.data.data.schoolName || '',
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar cabeçalho:', error);
    }
  };

  const handleSavePrintHeader = async () => {
    setSavingPrintHeader(true);
    try {
      await api.put('/schools/print-header', {
        emblemBase64: printHeaderData.emblemBase64,
        emblemBase64Right: printHeaderData.emblemBase64Right,
        emblemSizeLeft: printHeaderData.emblemSizeLeft,
        emblemSizeRight: printHeaderData.emblemSizeRight,
        line1: printHeaderData.line1,
        line2: printHeaderData.line2,
        line3: printHeaderData.line3,
        line4: printHeaderData.line4,
        line5: printHeaderData.line5,
        line6: printHeaderData.line6,
        line7: printHeaderData.line7,
      });
      invalidatePrintHeaderCache();
      toast.success('Cabeçalho de impressão salvo com sucesso!');
      setEditingPrintHeader(false);
    } catch (error: any) {
      console.error('Erro ao salvar cabeçalho:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar cabeçalho');
    } finally {
      setSavingPrintHeader(false);
    }
  };

  const handleEmblemUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right' = 'left') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máximo 2MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo deve ser uma imagem (PNG, JPG, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const field = side === 'right' ? 'emblemBase64Right' : 'emblemBase64';
      setPrintHeaderData({ ...printHeaderData, [field]: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewPrintHeader = () => {
    const headerHtml = buildPrintHeaderHtml(printHeaderData);
    const win = window.open('', '_blank', 'width=700,height=300');
    if (!win) return;
    win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pré-visualização do Cabeçalho</title><style>'
      + 'body { font-family: Arial, sans-serif; margin: 30px; background: #f5f5f5; }'
      + '.preview-box { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }'
      + printHeaderCss
      + printFooterCss
      + '</style></head><body><div class="preview-box">'
      + (headerHtml || '<p style="text-align:center;color:#999;">Nenhum cabeçalho configurado</p>')
      + '</div>' + buildPrintFooterHtml() + '</body></html>');
    win.document.close();
  };

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
    console.log('🎯 handleEditPermissions - User:', user);
    console.log('🎯 User ID:', user.id);
    console.log('🎯 User Permissions:', user.permissions);
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
      updateUserMutation.mutate({ id: selectedUser.id, data: updateData });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleSavePermissions = () => {
    console.log('🔵 handleSavePermissions - selectedUser:', selectedUser);
    console.log('🔵 selectedUser.id:', selectedUser?.id);
    console.log('🔵 editingPermissions:', editingPermissions);
    
    if (!selectedUser) {
      console.error('❌ selectedUser é null!');
      toast.error('Erro: usuário não selecionado');
      return;
    }
    
    if (!selectedUser.id) {
      console.error('❌ selectedUser.id é undefined!');
      console.error('❌ selectedUser completo:', JSON.stringify(selectedUser, null, 2));
      toast.error('Erro: ID do usuário não encontrado');
      return;
    }
    
    console.log('✅ Salvando permissões para usuário:', selectedUser.id);
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: { permissions: editingPermissions }
    });
  };

  const handleDeleteUser = (user: SchoolUser) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      deleteUserMutation.mutate(user.id);
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
    resetPasswordMutation.mutate({ id: selectedUser.id, newPassword });
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
      {/* Alerta de permissões - quando NÃO pode gerenciar */}
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

      {/* Confirmação de permissões - quando PODE gerenciar */}
      {canManageUsers && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex items-center">
            <CheckCircle className="text-green-400 mr-3" size={24} />
            <div>
              <h3 className="text-sm font-medium text-green-800">
                ✅ Você tem permissão completa para gerenciar usuários
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Logado como: <strong>{authUser?.name}</strong> ({authUser?.email}) - Role: <strong>"{authUser?.role}"</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card de Segurança - Minha Senha */}
      {canManageUsers && (
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
              <tr key={user.id} className="hover:bg-gray-50">
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
                    {canManageUsers && (
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="p-2 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-lg transition"
                        title="🔑 Resetar Senha do usuário (APENAS ADMIN)"
                      >
                        <Key size={18} />
                      </button>
                    )}
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
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Shield className="text-primary-600" />
              Permissões de {selectedUser.name}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Marque os módulos que este usuário poderá acessar e as ações permitidas em cada módulo
            </p>

            <div className="space-y-6">
              {/* ETAPA 1: CADASTROS BÁSICOS */}
              <div className="border-2 border-blue-200 rounded-lg p-5 bg-blue-50">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  📋 ETAPA 1: CADASTROS BÁSICOS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['dashboard', 'teachers', 'subjects', 'grades', 'classes'].map((resource) => {
                    const resourcePerms = editingPermissions[resource] || {};
                    const actions = Object.keys(resourcePerms);
                    return (
                      <div key={resource} className="bg-white border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">{permissionLabels[resource]}</h4>
                        <div className="space-y-2">
                          {actions.map((action) => (
                            <label key={action} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={(resourcePerms as any)[action] || false}
                                onChange={() => togglePermission(resource, action)}
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">
                                {action === 'access' && '✅ Acessar'}
                                {action === 'create' && '➕ Criar'}
                                {action === 'read' && '👁️ Visualizar'}
                                {action === 'update' && '✏️ Editar'}
                                {action === 'delete' && '🗑️ Deletar'}
                                {action === 'generate' && '⚡ Gerar'}
                                {action === 'manage' && '⚙️ Gerenciar'}
                                {action === 'send' && '📤 Enviar'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ETAPA 2: ASSOCIAÇÕES E CARGA HORÁRIA */}
              <div className="border-2 border-pink-200 rounded-lg p-5 bg-pink-50">
                <h3 className="text-lg font-bold text-pink-900 mb-4 flex items-center gap-2">
                  🔗 ETAPA 2: ASSOCIAÇÕES E CARGA HORÁRIA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['classSubjects', 'teacherSubjects'].map((resource) => {
                    const resourcePerms = editingPermissions[resource] || {};
                    const actions = Object.keys(resourcePerms);
                    return (
                      <div key={resource} className="bg-white border border-pink-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">{permissionLabels[resource]}</h4>
                        <div className="space-y-2">
                          {actions.map((action) => (
                            <label key={action} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={(resourcePerms as any)[action] || false}
                                onChange={() => togglePermission(resource, action)}
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">
                                {action === 'access' && '✅ Acessar'}
                                {action === 'create' && '➕ Criar'}
                                {action === 'read' && '👁️ Visualizar'}
                                {action === 'update' && '✏️ Editar'}
                                {action === 'delete' && '🗑️ Deletar'}
                                {action === 'generate' && '⚡ Gerar'}
                                {action === 'manage' && '⚙️ Gerenciar'}
                                {action === 'send' && '📤 Enviar'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ETAPA 3: GRADE DE HORÁRIOS */}
              <div className="border-2 border-indigo-200 rounded-lg p-5 bg-indigo-50">
                <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  ⏰ ETAPA 3: GRADE DE HORÁRIOS E GERAÇÃO
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['schedules', 'timetableGenerator'].map((resource) => {
                    const resourcePerms = editingPermissions[resource] || {};
                    const actions = Object.keys(resourcePerms);
                    return (
                      <div key={resource} className="bg-white border border-indigo-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">{permissionLabels[resource]}</h4>
                        <div className="space-y-2">
                          {actions.map((action) => (
                            <label key={action} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={(resourcePerms as any)[action] || false}
                                onChange={() => togglePermission(resource, action)}
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">
                                {action === 'access' && '✅ Acessar'}
                                {action === 'create' && '➕ Criar'}
                                {action === 'read' && '👁️ Visualizar'}
                                {action === 'update' && '✏️ Editar'}
                                {action === 'delete' && '🗑️ Deletar'}
                                {action === 'generate' && '⚡ Gerar'}
                                {action === 'manage' && '⚙️ Gerenciar'}
                                {action === 'send' && '📤 Enviar'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FERRAMENTAS E RECURSOS */}
              <div className="border-2 border-green-200 rounded-lg p-5 bg-green-50">
                <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                  ⚙️ FERRAMENTAS E RECURSOS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    'calendar',
                    'emergencySchedule',
                    'teacherAttendance',
                    'frequencyReports',
                    'displayPanel',
                    'settings',
                    'users',
                    'auditLogs'
                  ].map((resource) => {
                    const resourcePerms = editingPermissions[resource] || {};
                    const actions = Object.keys(resourcePerms);
                    return (
                      <div key={resource} className="bg-white border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 text-sm">{permissionLabels[resource]}</h4>
                        <div className="space-y-2">
                          {actions.map((action) => (
                            <label key={action} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                              <input
                                type="checkbox"
                                checked={(resourcePerms as any)[action] || false}
                                onChange={() => togglePermission(resource, action)}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <span className="text-xs text-gray-700">
                                {action === 'access' && '✅ Acessar'}
                                {action === 'create' && '➕ Criar'}
                                {action === 'read' && '👁️ Visualizar'}
                                {action === 'update' && '✏️ Editar'}
                                {action === 'delete' && '🗑️ Deletar'}
                                {action === 'generate' && '⚡ Gerar'}
                                {action === 'manage' && '⚙️ Gerenciar'}
                                {action === 'send' && '📤 Enviar'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6 sticky bottom-0 bg-white pt-4 border-t">
              <button
                onClick={handleSavePermissions}
                disabled={updateUserMutation.isPending}
                className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center gap-2 font-semibold"
              >
                <Save size={20} />
                Salvar Permissões
              </button>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2 font-semibold"
              >
                <X size={20} />
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

      {/* Configurações da Escola */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">Configurações da Escola</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Escola</label>
            <p className="text-lg font-semibold text-gray-900">{schoolFormData.schoolName || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dias de Aula / Semana</label>
            <p className="text-lg font-semibold text-gray-900">{schoolFormData.workingDays}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo</label>
            <p className="text-lg font-semibold text-gray-900">{schoolFormData.academicYear}</p>
          </div>
        </div>
      </div>

      {/* Cabeçalho de Impressão */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Printer className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Cabeçalho de Impressão</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePreviewPrintHeader}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Pré-visualizar
            </button>
            {!editingPrintHeader ? (
              <button
                onClick={() => setEditingPrintHeader(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPrintHeader(false);
                    loadPrintHeaderData();
                  }}
                  className="bg-gray-300 text-gray-700 hover:bg-gray-400 px-3 py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePrintHeader}
                  disabled={savingPrintHeader}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingPrintHeader ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          🖨️ Configure o cabeçalho institucional com emblema que aparecerá em todas as impressões do sistema.
        </p>

        {!editingPrintHeader ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-center gap-4">
              {printHeaderData.emblemBase64 ? (
                <img
                  src={printHeaderData.emblemBase64}
                  alt="Emblema Esquerdo"
                  className="w-16 h-16 object-contain rounded"
                />
              ) : (
                <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs text-center">
                  Sem emblema
                </div>
              )}
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-indigo-900">
                  {printHeaderData.line1 || printHeaderData.schoolName || <span className="text-orange-500 italic text-sm">Linha 1 não definida</span>}
                </p>
                <p className="text-sm text-gray-600">
                  {printHeaderData.line2 || <span className="text-orange-500 italic text-xs">Linha 2 não definida</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {printHeaderData.line3 || <span className="text-orange-500 italic text-xs">Linha 3 não definida</span>}
                </p>
                {printHeaderData.line4 && <p className="text-xs text-gray-500">{printHeaderData.line4}</p>}
                {printHeaderData.line5 && <p className="text-xs text-gray-500">{printHeaderData.line5}</p>}
                {printHeaderData.line6 && <p className="text-xs text-gray-500">{printHeaderData.line6}</p>}
                {printHeaderData.line7 && <p className="text-xs text-gray-500">{printHeaderData.line7}</p>}
              </div>
              {printHeaderData.emblemBase64Right ? (
                <img
                  src={printHeaderData.emblemBase64Right}
                  alt="Emblema Direito"
                  className="w-16 h-16 object-contain rounded"
                />
              ) : (
                <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs text-center">
                  Sem emblema
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upload Emblemas - Esquerdo e Direito */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emblema Esquerdo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏆 Emblema Esquerdo (Ex: Brasão do Estado)
                </label>
                <div className="flex items-center gap-4">
                  {printHeaderData.emblemBase64 ? (
                    <div className="relative">
                      <img
                        src={printHeaderData.emblemBase64}
                        alt="Emblema Esquerdo"
                        className="object-contain rounded border-2 border-indigo-200"
                        style={{ width: `${printHeaderData.emblemSizeLeft || 80}px`, height: `${printHeaderData.emblemSizeLeft || 80}px` }}
                      />
                      <button
                        type="button"
                        onClick={() => setPrintHeaderData({ ...printHeaderData, emblemBase64: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Upload</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleEmblemUpload(e, 'left')}
                    className="hidden"
                  />
                  <div className="text-sm text-gray-500 space-y-2">
                    <p>PNG, JPG, SVG (máx 2MB)</p>
                    {printHeaderData.emblemBase64 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-indigo-600 hover:underline block"
                      >
                        Trocar imagem
                      </button>
                    )}
                    {/* Controles de tamanho */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600 font-medium">Tamanho:</span>
                      <button
                        type="button"
                        onClick={() => setPrintHeaderData(prev => ({ ...prev, emblemSizeLeft: Math.max(30, (prev.emblemSizeLeft || 80) - 10) }))}
                        className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded flex items-center justify-center text-lg leading-none"
                        title="Diminuir emblema"
                      >−</button>
                      <span className="w-12 text-center text-sm font-mono font-bold text-indigo-700">
                        {printHeaderData.emblemSizeLeft || 80}px
                      </span>
                      <button
                        type="button"
                        onClick={() => setPrintHeaderData(prev => ({ ...prev, emblemSizeLeft: Math.min(250, (prev.emblemSizeLeft || 80) + 10) }))}
                        className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded flex items-center justify-center text-lg leading-none"
                        title="Aumentar emblema"
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emblema Direito */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏫 Emblema Direito (Ex: Logo da Escola)
                </label>
                <div className="flex items-center gap-4">
                  {printHeaderData.emblemBase64Right ? (
                    <div className="relative">
                      <img
                        src={printHeaderData.emblemBase64Right}
                        alt="Emblema Direito"
                        className="object-contain rounded border-2 border-indigo-200"
                        style={{ width: `${printHeaderData.emblemSizeRight || 80}px`, height: `${printHeaderData.emblemSizeRight || 80}px` }}
                      />
                      <button
                        type="button"
                        onClick={() => setPrintHeaderData({ ...printHeaderData, emblemBase64Right: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRightRef.current?.click()}
                      className="w-20 h-20 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Upload</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRightRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleEmblemUpload(e, 'right')}
                    className="hidden"
                  />
                  <div className="text-sm text-gray-500 space-y-2">
                    <p>PNG, JPG, SVG (máx 2MB)</p>
                    {printHeaderData.emblemBase64Right && (
                      <button
                        type="button"
                        onClick={() => fileInputRightRef.current?.click()}
                        className="text-indigo-600 hover:underline block"
                      >
                        Trocar imagem
                      </button>
                    )}
                    {/* Controles de tamanho */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600 font-medium">Tamanho:</span>
                      <button
                        type="button"
                        onClick={() => setPrintHeaderData(prev => ({ ...prev, emblemSizeRight: Math.max(30, (prev.emblemSizeRight || 80) - 10) }))}
                        className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded flex items-center justify-center text-lg leading-none"
                        title="Diminuir emblema"
                      >−</button>
                      <span className="w-12 text-center text-sm font-mono font-bold text-indigo-700">
                        {printHeaderData.emblemSizeRight || 80}px
                      </span>
                      <button
                        type="button"
                        onClick={() => setPrintHeaderData(prev => ({ ...prev, emblemSizeRight: Math.min(250, (prev.emblemSizeRight || 80) + 10) }))}
                        className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded flex items-center justify-center text-lg leading-none"
                        title="Aumentar emblema"
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Linhas do cabeçalho */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 1 — Nome da Instituição / Secretaria
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={printHeaderData.line1}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line1: e.target.value })}
                placeholder="Ex: Secretaria de Estado da Educação do Piauí"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 2 — Subtítulo / Nome da Escola
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={printHeaderData.line2}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line2: e.target.value })}
                placeholder="Ex: CETI Desembargador Amaral"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 3 — Endereço / Informação Complementar
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={printHeaderData.line3}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line3: e.target.value })}
                placeholder="Ex: Rua das Flores, 123 - Teresina/PI - CEP 64000-000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 4 (opcional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={printHeaderData.line4}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line4: e.target.value })}
                placeholder="Ex: Telefone / CNPJ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 5 (opcional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={printHeaderData.line5}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line5: e.target.value })}
                placeholder="Ex: E-mail institucional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 6 (opcional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={printHeaderData.line6}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line6: e.target.value })}
                placeholder="Ex: Informação complementar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linha 7 (opcional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={printHeaderData.line7}
                onChange={(e) => setPrintHeaderData({ ...printHeaderData, line7: e.target.value })}
                placeholder="Ex: Informação complementar"
              />
            </div>
          </div>
        )}
      </div>

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
