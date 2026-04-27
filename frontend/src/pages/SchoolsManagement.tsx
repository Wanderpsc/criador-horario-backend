import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { 
  Building2, CheckCircle, XCircle, Clock, Eye, Mail, Phone,
  MapPin, FileText, DollarSign, Calendar, Users, Filter, 
  Trash2, Ban, PlayCircle, Edit, Save, AlertTriangle
} from 'lucide-react';
import { format, addDays, addMonths, addYears, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface School {
  _id: string;
  id?: string;
  name?: string;
  email: string;
  schoolName: string;
  cnpj?: string;
  phone?: string;
  city?: string;
  state?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  responsibleCPF?: string;
  responsiblePhone?: string;
  selectedPlan?: string;
  registrationStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
  paymentStatus: 'pending' | 'paid' | 'expired' | 'cancelled';
  approvedByAdmin: boolean;
  isActive: boolean;
  licenseExpiryDate?: string;
  maxUsers?: number;
  createdAt: string;
  numberOfStudents?: number;
  numberOfTeachers?: number;
  schoolType?: string;
  adminNotes?: string;
}

export default function SchoolsManagement() {
  const { user } = useAuthStore();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'active' | 'inactive'>('all');
  const [notes, setNotes] = useState('');
  const [licenseDate, setLicenseDate] = useState('');
  const [maxUsers, setMaxUsers] = useState(50);
  const [editingLicense, setEditingLicense] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingSchoolData, setEditingSchoolData] = useState(false);
  const [editingResponsible, setEditingResponsible] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [schoolFormData, setSchoolFormData] = useState({
    schoolName: '',
    cnpj: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    schoolType: '',
    numberOfStudents: 0,
    numberOfTeachers: 0
  });
  const [responsibleFormData, setResponsibleFormData] = useState({
    responsibleName: '',
    responsibleCPF: '',
    responsiblePhone: '',
    responsibleEmail: ''
  });

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const response = await api.get('/admin/schools');
      console.log('[SchoolsManagement] Response completa:', response);
      console.log('[SchoolsManagement] response.data:', response.data);
      console.log('[SchoolsManagement] response.data.data:', response.data.data);
      console.log('[SchoolsManagement] Tipo de response.data.data:', Array.isArray(response.data.data) ? 'Array' : typeof response.data.data);
      console.log('[SchoolsManagement] Quantidade de escolas:', response.data.data?.length || 0);
      
      const schoolsArray = response.data.data || [];
      console.log('[SchoolsManagement] Array final de escolas:', schoolsArray);
      setSchools(schoolsArray);
    } catch (error: any) {
      console.error('[SchoolsManagement] Erro ao carregar escolas:', error);
      toast.error('Erro ao carregar escolas');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (school: School) => {
    console.log('[SchoolsManagement] Abrindo detalhes da escola:', school);
    setSelectedSchool(school);
    setNotes(school.adminNotes || '');
    setLicenseDate(school.licenseExpiryDate 
      ? format(new Date(school.licenseExpiryDate), 'yyyy-MM-dd') 
      : format(addMonths(new Date(), 1), 'yyyy-MM-dd')
    );
    setMaxUsers(school.maxUsers || 50);
    setEditingLicense(false);
    setEditingSchoolData(false);
    setEditingResponsible(false);
    setShowPaymentPanel(false);
    // Preencher formulários de edição
    setSchoolFormData({
      schoolName: school.schoolName || '',
      cnpj: school.cnpj || '',
      phone: school.phone || '',
      address: school.city || '',
      city: school.city || '',
      state: school.state || '',
      zipCode: '',
      schoolType: school.schoolType || '',
      numberOfStudents: school.numberOfStudents || 0,
      numberOfTeachers: school.numberOfTeachers || 0
    });
    setResponsibleFormData({
      responsibleName: school.responsibleName || '',
      responsibleCPF: '',
      responsiblePhone: '',
      responsibleEmail: school.responsibleEmail || ''
    });
    setShowModal(true);
  };

  const getSchoolId = (school: School) => school._id || school.id || '';

  const handleApprove = async () => {
    if (!selectedSchool) return;
    if (!licenseDate) {
      toast.error('Selecione a data de expiração da licença');
      return;
    }
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      console.log('[SchoolsManagement] Aprovando escola:', { schoolId, licenseDate, maxUsers });
      
      await api.put(`/admin/schools/${schoolId}/approve`, {
        licenseExpiryDate: licenseDate,
        maxUsers: maxUsers,
        adminNotes: notes
      });
      
      toast.success('Escola aprovada com sucesso!');
      setShowModal(false);
      
      // Se estava no filtro "pending", mudar para "approved" para ver a escola aprovada
      if (filter === 'pending') {
        setFilter('approved');
      }
      
      loadSchools();
    } catch (error: any) {
      console.error('[SchoolsManagement] Erro ao aprovar escola:', error);
      toast.error(error.response?.data?.message || 'Erro ao aprovar escola');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSchool) return;
    if (!confirm('Tem certeza que deseja REJEITAR este cadastro? Esta ação pode ser revertida depois.')) return;
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      console.log('[SchoolsManagement] Rejeitando escola:', schoolId);
      
      await api.patch(`/admin/schools/${schoolId}/reject`, { adminNotes: notes });
      toast.success('Cadastro rejeitado');
      setShowModal(false);
      loadSchools();
    } catch (error: any) {
      console.error('[SchoolsManagement] Erro ao rejeitar cadastro:', error);
      toast.error('Erro ao rejeitar cadastro');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedSchool) return;
    const action = selectedSchool.isActive ? 'desativar' : 'reativar';
    if (!confirm(`Tem certeza que deseja ${action} o acesso desta escola?`)) return;
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      console.log('[SchoolsManagement] Alterando status da escola:', { schoolId, action });
      
      await api.put(`/admin/schools/${schoolId}/toggle`);
      toast.success(`Escola ${selectedSchool.isActive ? 'desativada' : 'reativada'} com sucesso`);
      setShowModal(false);
      
      // Atualizar filtro se necessário para manter escola visível
      if (filter === 'active' && selectedSchool.isActive) {
        setFilter('inactive');
      } else if (filter === 'inactive' && !selectedSchool.isActive) {
        setFilter('active');
      }
      
      loadSchools();
    } catch (error: any) {
      console.error('[SchoolsManagement] Erro ao alterar status:', error);
      toast.error('Erro ao alterar status da escola');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSchool) return;
    if (!confirm(
      '⚠️ ATENÇÃO: Tem certeza que deseja EXCLUIR PERMANENTEMENTE esta escola?\n\n' +
      'Esta ação NÃO PODE ser desfeita e todos os dados associados serão perdidos!\n\n' +
      'Digite "EXCLUIR" para confirmar:'
    )) return;
    
    const confirmation = prompt('Digite "EXCLUIR" em letras maiúsculas para confirmar:');
    if (confirmation !== 'EXCLUIR') {
      toast.error('Exclusão cancelada');
      return;
    }
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      console.log('[SchoolsManagement] Excluindo escola:', schoolId);
      
      await api.delete(`/admin/schools/${schoolId}`);
      toast.success('Escola excluída permanentemente');
      setShowModal(false);
      loadSchools();
    } catch (error: any) {
      console.error('[SchoolsManagement] Erro ao excluir escola:', error);
      toast.error('Erro ao excluir escola');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLicense = async () => {
    if (!selectedSchool) return;
    if (!licenseDate) {
      toast.error('Selecione a data de expiração da licença');
      return;
    }
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      console.log('[SchoolsManagement] Atualizando licença:', { schoolId, licenseDate, maxUsers });
      
      await api.put(`/admin/schools/${schoolId}/license`, {
        licenseExpiryDate: licenseDate,
        maxUsers: maxUsers
      });
      
      toast.success('Licença atualizada com sucesso');
      setEditingLicense(false);
      loadSchools();
      
      // Atualizar escola selecionada
      setSelectedSchool({
        ...selectedSchool,
        licenseExpiryDate: licenseDate,
        maxUsers: maxUsers
      });
    } catch (error: any) {
      console.error('[SchoolsManagement] Erro ao atualizar licença:', error);
      toast.error('Erro ao atualizar licença');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedSchool) return;
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      await api.patch(`/admin/schools/${schoolId}/notes`, { adminNotes: notes });
      toast.success('Observações atualizadas');
      loadSchools();
    } catch (error: any) {
      toast.error('Erro ao atualizar observações');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSchoolData = async () => {
    if (!selectedSchool) return;
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      await api.put(`/admin/schools/${schoolId}/data`, schoolFormData);
      toast.success('Dados cadastrais atualizados com sucesso!');
      setEditingSchoolData(false);
      loadSchools();
      
      // Atualizar escola selecionada
      setSelectedSchool({
        ...selectedSchool,
        ...schoolFormData
      });
    } catch (error: any) {
      console.error('Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados cadastrais');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateResponsible = async () => {
    if (!selectedSchool) return;
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      await api.put(`/admin/schools/${schoolId}/responsible`, responsibleFormData);
      toast.success('Dados do responsável atualizados com sucesso!');
      setEditingResponsible(false);
      loadSchools();
      
      // Atualizar escola selecionada
      setSelectedSchool({
        ...selectedSchool,
        ...responsibleFormData
      });
    } catch (error: any) {
      console.error('Erro ao atualizar responsável:', error);
      toast.error('Erro ao atualizar dados do responsável');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedSchool) return;
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Informe um valor válido para o pagamento');
      return;
    }
    
    setActionLoading(true);
    try {
      const schoolId = getSchoolId(selectedSchool);
      await api.post(`/admin/schools/${schoolId}/payment`, {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        date: paymentDate,
        notes: paymentNotes,
        planName: selectedSchool.selectedPlan || 'Plano Padrão',
        planDuration: 1 // 1 mês por padrão
      });
      
      toast.success('✅ Pagamento confirmado! E-mail enviado para a escola.');
      setShowPaymentPanel(false);
      setPaymentAmount('');
      setPaymentNotes('');
      loadSchools();
      
      // Atualizar escola selecionada
      setSelectedSchool({
        ...selectedSchool,
        paymentStatus: 'paid',
        isActive: true
      });
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredSchools = schools.filter(school => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !school.approvedByAdmin;
    if (filter === 'approved') return school.approvedByAdmin;
    if (filter === 'active') return school.isActive;
    if (filter === 'inactive') return !school.isActive;
    return true;
  });

  const getStatusBadge = (school: School) => {
    if (!school.approvedByAdmin) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <Clock size={14} className="mr-1" />
          Aguardando Aprovação
        </span>
      );
    }
    if (!school.isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          <Ban size={14} className="mr-1" />
          Desativada
        </span>
      );
    }
    if (school.licenseExpiryDate && isBefore(new Date(school.licenseExpiryDate), new Date())) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <XCircle size={14} className="mr-1" />
          Licença Expirada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        <CheckCircle size={14} className="mr-1" />
        Ativa
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      paid: { color: 'bg-green-100 text-green-800', text: 'Pago' },
      expired: { color: 'bg-red-100 text-red-800', text: 'Expirado' },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelado' }
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
    return <div className="text-center p-8">Acesso restrito a administradores</div>;
  }

  const pendingCount = schools.filter(s => !s.approvedByAdmin).length;
  const activeCount = schools.filter(s => s.isActive && s.approvedByAdmin).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Escolas</h1>
          <p className="text-gray-600 mt-1">Gerencie cadastros, licenças e permissões</p>
        </div>
        <div className="bg-white rounded-lg shadow px-6 py-3">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <Clock className="text-yellow-600 mr-2" size={20} />
              <span className="font-semibold">{pendingCount}</span>
              <span className="text-gray-600 ml-1">Pendentes</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="text-green-600 mr-2" size={20} />
              <span className="font-semibold">{activeCount}</span>
              <span className="text-gray-600 ml-1">Ativas</span>
            </div>
            <div className="flex items-center">
              <Building2 className="text-primary-600 mr-2" size={20} />
              <span className="font-semibold">{schools.length}</span>
              <span className="text-gray-600 ml-1">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <Filter size={20} className="text-gray-600" />
          <span className="font-medium text-gray-700 mr-2">Filtrar:</span>
          {[
            { value: 'all', label: 'Todas' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'approved', label: 'Aprovadas' },
            { value: 'active', label: 'Ativas' },
            { value: 'inactive', label: 'Inativas' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando escolas...</p>
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600 text-lg">Nenhuma escola encontrada</p>
          <p className="text-gray-500 text-sm mt-2">Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredSchools.map(school => {
            const schoolId = getSchoolId(school);
            const isExpired = school.licenseExpiryDate && isBefore(new Date(school.licenseExpiryDate), new Date());
            
            return (
            <div key={schoolId} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Building2 className="text-primary-600" size={24} />
                      <h3 className="text-xl font-bold text-gray-900">{school.schoolName}</h3>
                      {getStatusBadge(school)}
                      {isExpired && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle size={12} className="mr-1" />
                          Expirada
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {school.email && (
                        <div className="flex items-center text-gray-600">
                          <Mail size={16} className="mr-2 flex-shrink-0" />
                          <span className="truncate">{school.email}</span>
                        </div>
                      )}
                      {school.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone size={16} className="mr-2 flex-shrink-0" />
                          <span>{school.phone}</span>
                        </div>
                      )}
                      {school.city && school.state && (
                        <div className="flex items-center text-gray-600">
                          <MapPin size={16} className="mr-2 flex-shrink-0" />
                          <span>{school.city}/{school.state}</span>
                        </div>
                      )}
                      {school.licenseExpiryDate && (
                        <div className="flex items-center text-gray-600">
                          <Calendar size={16} className="mr-2" />
                          <span className={isExpired ? 'text-red-600 font-semibold' : ''}>
                            Licença: {format(new Date(school.licenseExpiryDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      )}
                      {school.maxUsers && (
                        <div className="flex items-center text-gray-600">
                          <Users size={16} className="mr-2" />
                          <span>Até {school.maxUsers} usuários</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <Calendar size={16} className="mr-2" />
                        <span>Cadastro: {format(new Date(school.createdAt), 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(school)}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center whitespace-nowrap"
                  >
                    <Eye size={16} className="mr-2" />
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Modal de Detalhes Completo */}
      {showModal && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full my-8">
            {/* Cabeçalho */}
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-lg">
              <div>
                <h2 className="text-2xl font-bold">{selectedSchool.schoolName}</h2>
                <p className="text-primary-100 text-sm mt-1">
                  {selectedSchool.cnpj && `CNPJ: ${selectedSchool.cnpj} • `}
                  Cadastro: {format(new Date(selectedSchool.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-white hover:text-primary-100 transition-colors"
                disabled={actionLoading}
              >
                <XCircle size={28} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Status Atual */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <CheckCircle className="mr-2 text-primary-600" size={20} />
                  Status Atual
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                  {getStatusBadge(selectedSchool)}
                  {selectedSchool.licenseExpiryDate && isBefore(new Date(selectedSchool.licenseExpiryDate), new Date()) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      <AlertTriangle size={14} className="mr-1" />
                      Licença Expirada
                    </span>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Dados da Instituição */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                    <h3 className="font-bold text-lg flex items-center">
                      <Building2 className="mr-2 text-blue-600" size={20} />
                      Dados da Instituição
                    </h3>
                    {!editingSchoolData && (
                      <button
                        onClick={() => setEditingSchoolData(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        disabled={actionLoading}
                      >
                        <Edit size={14} className="mr-1" />
                        Editar
                      </button>
                    )}
                  </div>
                  
                  {!editingSchoolData ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Nome da Escola</label>
                        <p className="text-gray-900">{selectedSchool.schoolName || 'Não informado'}</p>
                      </div>
                      {selectedSchool.cnpj && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">CNPJ</label>
                          <p className="text-gray-900">{selectedSchool.cnpj}</p>
                        </div>
                      )}
                      {selectedSchool.schoolType && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Tipo</label>
                          <p className="text-gray-900">{selectedSchool.schoolType}</p>
                        </div>
                      )}
                      {selectedSchool.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Telefone</label>
                          <p className="text-gray-900">{selectedSchool.phone}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600">E-mail</label>
                        <p className="text-gray-900">{selectedSchool.email}</p>
                      </div>
                      {selectedSchool.city && selectedSchool.state && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Localização</label>
                          <p className="text-gray-900">{selectedSchool.city}/{selectedSchool.state}</p>
                        </div>
                      )}
                      {(selectedSchool.numberOfStudents || selectedSchool.numberOfTeachers) && (
                        <div className="flex gap-4">
                          {selectedSchool.numberOfStudents && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Alunos</label>
                              <p className="text-gray-900">{selectedSchool.numberOfStudents}</p>
                            </div>
                          )}
                          {selectedSchool.numberOfTeachers && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Professores</label>
                              <p className="text-gray-900">{selectedSchool.numberOfTeachers}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nome da Escola *</label>
                        <input
                          type="text"
                          value={schoolFormData.schoolName}
                          onChange={(e) => setSchoolFormData({...schoolFormData, schoolName: e.target.value})}
                          className="input w-full mt-1"
                          disabled={actionLoading}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">CNPJ</label>
                        <input
                          type="text"
                          value={schoolFormData.cnpj}
                          onChange={(e) => setSchoolFormData({...schoolFormData, cnpj: e.target.value})}
                          className="input w-full mt-1"
                          disabled={actionLoading}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Telefone</label>
                        <input
                          type="tel"
                          value={schoolFormData.phone}
                          onChange={(e) => setSchoolFormData({...schoolFormData, phone: e.target.value})}
                          className="input w-full mt-1"
                          disabled={actionLoading}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Cidade</label>
                          <input
                            type="text"
                            value={schoolFormData.city}
                            onChange={(e) => setSchoolFormData({...schoolFormData, city: e.target.value})}
                            className="input w-full mt-1"
                            disabled={actionLoading}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Estado</label>
                          <input
                            type="text"
                            value={schoolFormData.state}
                            onChange={(e) => setSchoolFormData({...schoolFormData, state: e.target.value})}
                            className="input w-full mt-1"
                            maxLength={2}
                            disabled={actionLoading}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm font-medium text-gray-700">N° Alunos</label>
                          <input
                            type="number"
                            value={schoolFormData.numberOfStudents || ''}
                            onChange={(e) => setSchoolFormData({...schoolFormData, numberOfStudents: parseInt(e.target.value) || 0})}
                            className="input w-full mt-1"
                            disabled={actionLoading}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">N° Professores</label>
                          <input
                            type="number"
                            value={schoolFormData.numberOfTeachers || ''}
                            onChange={(e) => setSchoolFormData({...schoolFormData, numberOfTeachers: parseInt(e.target.value) || 0})}
                            className="input w-full mt-1"
                            disabled={actionLoading}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleUpdateSchoolData}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          disabled={actionLoading}
                        >
                          <Save size={16} className="mr-2" />
                          {actionLoading ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditingSchoolData(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          disabled={actionLoading}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Responsável Legal */}
                <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center border-b border-green-200 pb-2">
                    <h3 className="font-bold text-lg flex items-center">
                      <Users className="mr-2 text-green-600" size={20} />
                      Responsável Legal
                    </h3>
                    {!editingResponsible && (
                      <button
                        onClick={() => setEditingResponsible(true)}
                        className="text-sm text-green-600 hover:text-green-800 flex items-center"
                        disabled={actionLoading}
                      >
                        <Edit size={14} className="mr-1" />
                        Editar
                      </button>
                    )}
                  </div>
                  
                  {!editingResponsible ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Nome do Responsável</label>
                        <p className="text-gray-900">
                          {selectedSchool.responsibleName || (
                            <span className="text-orange-600 italic">Não cadastrado</span>
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">CPF do Responsável</label>
                        <p className="text-gray-900">
                          {selectedSchool.responsibleCPF || (
                            <span className="text-orange-600 italic">Não cadastrado</span>
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">Telefone do Responsável</label>
                        <p className="text-gray-900">
                          {selectedSchool.responsiblePhone || selectedSchool.phone || (
                            <span className="text-orange-600 italic">Não cadastrado</span>
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">E-mail do Responsável</label>
                        <p className="text-gray-900">
                          {selectedSchool.responsibleEmail || (
                            <span className="text-orange-600 italic">Não cadastrado - usando email da escola: {selectedSchool.email}</span>
                          )}
                        </p>
                      </div>
                      
                      {selectedSchool.selectedPlan && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Plano Selecionado</label>
                          <p className="text-gray-900 font-semibold">{selectedSchool.selectedPlan}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600">Data de Cadastro</label>
                        <p className="text-gray-900">
                          {format(new Date(selectedSchool.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nome Completo *</label>
                        <input
                          type="text"
                          value={responsibleFormData.responsibleName}
                          onChange={(e) => setResponsibleFormData({...responsibleFormData, responsibleName: e.target.value})}
                          className="input w-full mt-1"
                          disabled={actionLoading}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">CPF</label>
                        <input
                          type="text"
                          value={responsibleFormData.responsibleCPF}
                          onChange={(e) => setResponsibleFormData({...responsibleFormData, responsibleCPF: e.target.value})}
                          className="input w-full mt-1"
                          disabled={actionLoading}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Telefone</label>
                        <input
                          type="tel"
                          value={responsibleFormData.responsiblePhone}
                          onChange={(e) => setResponsibleFormData({...responsibleFormData, responsiblePhone: e.target.value})}
                          className="input w-full mt-1"
                          disabled={actionLoading}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">E-mail</label>
                        <input
                          type="email"
                          value={responsibleFormData.responsibleEmail}
                          onChange={(e) => setResponsibleFormData({...responsibleFormData, responsibleEmail: e.target.value})}
                          className="input w-full mt-1"
                          disabled={actionLoading}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleUpdateResponsible}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          disabled={actionLoading}
                        >
                          <Save size={16} className="mr-2" />
                          {actionLoading ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditingResponsible(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          disabled={actionLoading}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gerenciamento de Licença */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center">
                    <Calendar className="mr-2 text-purple-600" size={20} />
                    Gerenciamento de Licença
                  </h3>
                  {selectedSchool.approvedByAdmin && !editingLicense && (
                    <button
                      onClick={() => setEditingLicense(true)}
                      className="flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      disabled={actionLoading}
                    >
                      <Edit size={14} className="mr-1" />
                      Editar Licença
                    </button>
                  )}
                </div>

                {selectedSchool.approvedByAdmin && !editingLicense ? (
                  // Visualização da Licença
                  <div className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Data de Expiração</label>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedSchool.licenseExpiryDate 
                            ? format(new Date(selectedSchool.licenseExpiryDate), "dd/MM/yyyy", { locale: ptBR })
                            : 'Não definida'}
                        </p>
                        {selectedSchool.licenseExpiryDate && (
                          <p className="text-sm text-gray-600">
                            {isBefore(new Date(selectedSchool.licenseExpiryDate), new Date()) 
                              ? `Expirada há ${Math.floor((new Date().getTime() - new Date(selectedSchool.licenseExpiryDate).getTime()) / (1000 * 60 * 60 * 24))} dias`
                              : `Expira em ${Math.floor((new Date(selectedSchool.licenseExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias`
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Usuários Permitidos</label>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedSchool.maxUsers || 50} usuários
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Formulário de Edição/Criação da Licença
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Data de Expiração da Licença *</label>
                        <input
                          type="date"
                          value={licenseDate}
                          onChange={(e) => setLicenseDate(e.target.value)}
                          className="input"
                          min={new Date().toISOString().split('T')[0]}
                          disabled={actionLoading}
                        />
                      </div>
                      <div>
                        <label className="label">Número Máximo de Usuários *</label>
                        <input
                          type="number"
                          value={maxUsers}
                          onChange={(e) => setMaxUsers(parseInt(e.target.value) || 50)}
                          className="input"
                          min="1"
                          max="10000"
                          disabled={actionLoading}
                        />
                      </div>
                    </div>
                    
                    {/* Atalhos de Data */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-600 mr-2">Atalhos:</span>
                      <button
                        type="button"
                        onClick={() => setLicenseDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'))}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        disabled={actionLoading}
                      >
                        +7 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setLicenseDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd'))}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        disabled={actionLoading}
                      >
                        +1 mês
                      </button>
                      <button
                        type="button"
                        onClick={() => setLicenseDate(format(addMonths(new Date(), 3), 'yyyy-MM-dd'))}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        disabled={actionLoading}
                      >
                        +3 meses
                      </button>
                      <button
                        type="button"
                        onClick={() => setLicenseDate(format(addMonths(new Date(), 6), 'yyyy-MM-dd'))}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        disabled={actionLoading}
                      >
                        +6 meses
                      </button>
                      <button
                        type="button"
                        onClick={() => setLicenseDate(format(addYears(new Date(), 1), 'yyyy-MM-dd'))}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        disabled={actionLoading}
                      >
                        +1 ano
                      </button>
                    </div>

                    {editingLicense && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleUpdateLicense}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          disabled={actionLoading || !licenseDate}
                        >
                          <Save size={16} className="mr-2" />
                          {actionLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingLicense(false);
                            setLicenseDate(selectedSchool.licenseExpiryDate 
                              ? format(new Date(selectedSchool.licenseExpiryDate), 'yyyy-MM-dd')
                              : format(addMonths(new Date(), 1), 'yyyy-MM-dd')
                            );
                            setMaxUsers(selectedSchool.maxUsers || 50);
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          disabled={actionLoading}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    {!selectedSchool.approvedByAdmin && (
                      <p className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                        💡 Ao aprovar, a escola será ativada automaticamente com a licença configurada acima.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Observações Administrativas */}
              <div className="mb-6">
                <label className="label flex items-center">
                  <FileText className="mr-2" size={16} />
                  Observações Administrativas (Internas)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Adicione observações internas sobre esta escola..."
                  disabled={actionLoading}
                />
                <button
                  onClick={handleUpdateNotes}
                  className="btn btn-secondary mt-2"
                  disabled={actionLoading}
                >
                  <Save size={16} className="mr-2" />
                  {actionLoading ? 'Salvando...' : 'Salvar Observações'}
                </button>
              </div>

              {/* Sistema de Reconhecimento de Pagamento */}
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center">
                    <DollarSign className="mr-2 text-yellow-600" size={20} />
                    Sistema de Pagamento
                  </h3>
                  <button
                    onClick={() => setShowPaymentPanel(!showPaymentPanel)}
                    className="text-sm text-yellow-600 hover:text-yellow-800 flex items-center"
                  >
                    {showPaymentPanel ? 'Ocultar' : 'Registrar Pagamento'}
                  </button>
                </div>

                {/* Status de Pagamento Atual */}
                <div className="mb-4 p-3 bg-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status Atual</label>
                      <div className="mt-1">
                        {getPaymentBadge(selectedSchool.paymentStatus)}
                      </div>
                    </div>
                    {selectedSchool.selectedPlan && (
                      <div className="text-right">
                        <label className="text-sm font-medium text-gray-600">Plano</label>
                        <p className="font-bold text-gray-900">{selectedSchool.selectedPlan}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulário de Registro de Pagamento */}
                {showPaymentPanel && (
                  <div className="space-y-4 p-4 bg-white rounded-lg border-2 border-yellow-300">
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4">
                      <p className="text-sm text-yellow-800 flex items-center">
                        <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                        <span>Ao confirmar o pagamento, o status da escola será atualizado e uma anotação será adicionada às observações.</span>
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Valor do Pagamento (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="input w-full mt-1"
                          placeholder="0,00"
                          disabled={actionLoading}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Método de Pagamento *</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="input w-full mt-1"
                          disabled={actionLoading}
                        >
                          <option value="pix">PIX</option>
                          <option value="boleto">Boleto</option>
                          <option value="cartao_credito">Cartão de Crédito</option>
                          <option value="cartao_debito">Cartão de Débito</option>
                          <option value="transferencia">Transferência Bancária</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Data do Pagamento *</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="input w-full mt-1"
                        max={format(new Date(), 'yyyy-MM-dd')}
                        disabled={actionLoading}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Observações do Pagamento</label>
                      <textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="input w-full mt-1 min-h-[80px]"
                        placeholder="Ex: Referente ao mês de janeiro/2026, número do comprovante, etc..."
                        disabled={actionLoading}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleRegisterPayment}
                        className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        disabled={actionLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                      >
                        <DollarSign size={16} className="mr-2" />
                        {actionLoading ? 'Registrando...' : 'Confirmar Pagamento'}
                      </button>
                      <button
                        onClick={() => {
                          setShowPaymentPanel(false);
                          setPaymentAmount('');
                          setPaymentNotes('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        disabled={actionLoading}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé com Ações */}
            <div className="flex justify-between gap-3 p-6 border-t bg-gray-50 rounded-b-lg flex-wrap">
              <div className="flex gap-2">
                {/* Botão Excluir (Perigoso) */}
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                  disabled={actionLoading}
                  title="Excluir permanentemente esta escola e todos os seus dados"
                >
                  <Trash2 size={18} className="mr-2" />
                  Excluir Permanentemente
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Ações Condicionais */}
                {!selectedSchool.approvedByAdmin ? (
                  // Escola Pendente
                  <>
                    <button
                      onClick={handleReject}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center"
                      disabled={actionLoading}
                    >
                      <XCircle size={18} className="mr-2" />
                      Rejeitar Cadastro
                    </button>
                    <button
                      onClick={handleApprove}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-semibold"
                      disabled={actionLoading || !licenseDate}
                      title={!licenseDate ? 'Defina a data de expiração da licença' : ''}
                    >
                      <CheckCircle size={18} className="mr-2" />
                      {actionLoading ? 'Aprovando...' : 'Aprovar e Ativar'}
                    </button>
                  </>
                ) : (
                  // Escola Aprovada
                  <>
                    <button
                      onClick={handleToggleActive}
                      className={`px-4 py-2 rounded-lg flex items-center ${
                        selectedSchool.isActive
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      disabled={actionLoading}
                    >
                      {selectedSchool.isActive ? (
                        <>
                          <Ban size={18} className="mr-2" />
                          Desativar Acesso
                        </>
                      ) : (
                        <>
                          <PlayCircle size={18} className="mr-2" />
                          Reativar Acesso
                        </>
                      )}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  disabled={actionLoading}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
