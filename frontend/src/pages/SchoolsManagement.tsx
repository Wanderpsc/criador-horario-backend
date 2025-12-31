import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { 
  Building2, CheckCircle, XCircle, Clock, Eye, Mail, Phone,
  MapPin, FileText, DollarSign, Calendar, Users, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface School {
  _id: string;
  name: string;
  email: string;
  schoolName: string;
  cnpj: string;
  phone: string;
  city: string;
  state: string;
  responsibleName: string;
  responsibleEmail: string;
  selectedPlan: string;
  registrationStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  paymentStatus: 'pending' | 'paid' | 'expired' | 'cancelled';
  approvedByAdmin: boolean;
  licenseExpiryDate?: string;
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
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('all');
  const [notes, setNotes] = useState('');
  const [licenseDate, setLicenseDate] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const response = await api.get('/admin/schools');
      setSchools(response.data.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar escolas');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (school: School) => {
    setSelectedSchool(school);
    setNotes(school.adminNotes || '');
    setLicenseDate(school.licenseExpiryDate ? format(new Date(school.licenseExpiryDate), 'yyyy-MM-dd') : '');
    setShowModal(true);
  };

  const handleApprove = async (schoolId: string) => {
    try {
      await api.patch(`/admin/schools/${schoolId}/approve`, {
        licenseExpiryDate: licenseDate || undefined,
        adminNotes: notes
      });
      toast.success('Escola aprovada com sucesso!');
      setShowModal(false);
      loadSchools();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao aprovar escola');
    }
  };

  const handleReject = async (schoolId: string) => {
    if (!confirm('Tem certeza que deseja rejeitar este cadastro?')) return;
    
    try {
      await api.patch(`/admin/schools/${schoolId}/reject`, { adminNotes: notes });
      toast.success('Cadastro rejeitado');
      setShowModal(false);
      loadSchools();
    } catch (error: any) {
      toast.error('Erro ao rejeitar cadastro');
    }
  };

  const handleSuspend = async (schoolId: string) => {
    if (!confirm('Tem certeza que deseja suspender o acesso desta escola?')) return;
    
    try {
      await api.patch(`/admin/schools/${schoolId}/suspend`, { adminNotes: notes });
      toast.success('Escola suspensa');
      setShowModal(false);
      loadSchools();
    } catch (error: any) {
      toast.error('Erro ao suspender escola');
    }
  };

  const handleUpdateNotes = async (schoolId: string) => {
    try {
      await api.patch(`/admin/schools/${schoolId}/notes`, { adminNotes: notes });
      toast.success('Observações atualizadas');
      loadSchools();
    } catch (error: any) {
      toast.error('Erro ao atualizar observações');
    }
  };

  const filteredSchools = schools.filter(school => {
    if (filter === 'all') return true;
    return school.registrationStatus === filter;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendente' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Aprovado' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejeitado' },
      suspended: { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Suspenso' }
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon size={14} className="mr-1" />
        {badge.text}
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

  if (!user || user.role !== 'admin') {
    return <div className="text-center p-8">Acesso restrito a administradores</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escolas Cadastradas</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de cadastros e licenças</p>
        </div>
        <div className="bg-white rounded-lg shadow px-6 py-3">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <Clock className="text-yellow-600 mr-2" size={20} />
              <span className="font-semibold">{schools.filter(s => s.registrationStatus === 'pending').length}</span>
              <span className="text-gray-600 ml-1">Pendentes</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="text-green-600 mr-2" size={20} />
              <span className="font-semibold">{schools.filter(s => s.registrationStatus === 'approved').length}</span>
              <span className="text-gray-600 ml-1">Aprovados</span>
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
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-gray-600" />
          <span className="font-medium text-gray-700 mr-4">Filtrar por status:</span>
          {[
            { value: 'all', label: 'Todos' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'approved', label: 'Aprovados' },
            { value: 'rejected', label: 'Rejeitados' },
            { value: 'suspended', label: 'Suspensos' }
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
        <div className="text-center py-12">Carregando...</div>
      ) : filteredSchools.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600">Nenhuma escola encontrada</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredSchools.map(school => (
            <div key={school._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Building2 className="text-primary-600" size={24} />
                      <h3 className="text-xl font-bold text-gray-900">{school.schoolName}</h3>
                      {getStatusBadge(school.registrationStatus)}
                      {getPaymentBadge(school.paymentStatus)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail size={16} className="mr-2 flex-shrink-0" />
                        <span className="truncate">{school.email}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone size={16} className="mr-2 flex-shrink-0" />
                        <span>{school.phone}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin size={16} className="mr-2 flex-shrink-0" />
                        <span>{school.city}/{school.state}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FileText size={16} className="mr-2 flex-shrink-0" />
                        <span>{school.cnpj}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Users size={16} className="mr-2" />
                        <span>{school.numberOfStudents || 'N/A'} alunos</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users size={16} className="mr-2" />
                        <span>{school.numberOfTeachers || 'N/A'} professores</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <DollarSign size={16} className="mr-2" />
                        <span className="font-medium">{school.selectedPlan || 'Não selecionado'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar size={16} className="mr-2" />
                        <span>{format(new Date(school.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(school)}
                    className="ml-4 btn btn-secondary flex items-center whitespace-nowrap"
                  >
                    <Eye size={16} className="mr-2" />
                    Detalhes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {showModal && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedSchool.schoolName}</h2>
                <p className="text-gray-600 text-sm mt-1">CNPJ: {selectedSchool.cnpj}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Dados da Instituição */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2">Dados da Instituição</h3>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo</label>
                    <p className="text-gray-900">{selectedSchool.schoolType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Telefone</label>
                    <p className="text-gray-900">{selectedSchool.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">E-mail</label>
                    <p className="text-gray-900">{selectedSchool.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Localização</label>
                    <p className="text-gray-900">{selectedSchool.city}/{selectedSchool.state}</p>
                  </div>
                </div>

                {/* Responsável */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2">Responsável Legal</h3>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nome</label>
                    <p className="text-gray-900">{selectedSchool.responsibleName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">E-mail</label>
                    <p className="text-gray-900">{selectedSchool.responsibleEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Plano Selecionado</label>
                    <p className="text-gray-900 font-semibold">{selectedSchool.selectedPlan}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Data de Cadastro</label>
                    <p className="text-gray-900">
                      {format(new Date(selectedSchool.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Licença */}
              {selectedSchool.registrationStatus === 'pending' && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-bold text-lg mb-4">Configurar Licença</h3>
                  <div>
                    <label className="label">Data de Expiração da Licença</label>
                    <input
                      type="date"
                      value={licenseDate}
                      onChange={(e) => setLicenseDate(e.target.value)}
                      className="input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Deixe em branco para licença de 30 dias a partir da aprovação
                    </p>
                  </div>
                </div>
              )}

              {/* Observações Administrativas */}
              <div className="mt-6">
                <label className="label">Observações Administrativas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Adicione observações internas sobre esta escola..."
                />
                <button
                  onClick={() => handleUpdateNotes(selectedSchool._id)}
                  className="btn btn-secondary mt-2"
                >
                  Salvar Observações
                </button>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              {selectedSchool.registrationStatus === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedSchool._id)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                  >
                    <XCircle size={18} className="mr-2" />
                    Rejeitar
                  </button>
                  <button
                    onClick={() => handleApprove(selectedSchool._id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Aprovar e Liberar Acesso
                  </button>
                </>
              )}
              {selectedSchool.registrationStatus === 'approved' && (
                <button
                  onClick={() => handleSuspend(selectedSchool._id)}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Suspender Acesso
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
