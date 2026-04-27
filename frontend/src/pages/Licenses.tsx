import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { licenseAPI } from '../services/api';
import { Key, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface License {
  _id?: string;
  id?: string;
  key: string;
  userId?: string;
  schoolId?: string;
  expiryDate?: string;
  expiresAt?: string;
  maxSchools?: number;
  isActive: boolean;
  school?: { name: string };
}

interface LicenseForm {
  expiryDate: string;
  maxSchools: number;
  userEmail?: string;
  userName?: string;
  price?: number;
}

export default function Licenses() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate, formState: { errors: errorsCreate } } = useForm<LicenseForm>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const licensesRes = await licenseAPI.getAll();
      
      // Backend pode retornar data.data ou data diretamente
      setLicenses(licensesRes.data.data || licensesRes.data);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar licenças');
    } finally {
      setLoading(false);
    }
  };

  const onCreateLicense = async (data: LicenseForm) => {
    try {
      await licenseAPI.create(data);
      toast.success('Licença criada com sucesso');
      setShowCreateModal(false);
      resetCreate();
      loadData();
    } catch (error: any) {
      toast.error('Erro ao criar licença');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deseja realmente desativar esta licença?')) return;
    
    try {
      await licenseAPI.deactivate(id);
      toast.success('Licença desativada');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao desativar licença');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ ATENÇÃO: Deseja realmente EXCLUIR esta licença permanentemente? Esta ação não pode ser desfeita!')) return;
    
    try {
      await licenseAPI.delete(id);
      toast.success('Licença excluída com sucesso');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao excluir licença');
    }
  };

  const handleSendNotification = async (id: string) => {
    const type = prompt('Tipo de notificação (created, expiring, expired, renewed):');
    if (!type || !['created', 'expiring', 'expired', 'renewed'].includes(type)) {
      toast.error('Tipo de notificação inválido');
      return;
    }
    
    try {
      await licenseAPI.sendNotification(id, type as any);
      toast.success('Notificação enviada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar notificação');
    }
  };

  const handleCheckExpiring = async () => {
    try {
      const response = await licenseAPI.checkExpiring();
      const { expiring, expired } = response.data.result;
      toast.success(`Verificação concluída: ${expiring} expirando, ${expired} expiradas`);
    } catch (error: any) {
      toast.error('Erro ao verificar licenças');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Licenças</h1>
        <div className="flex gap-2">
          <button
            onClick={handleCheckExpiring}
            className="btn btn-secondary flex items-center"
            title="Verificar licenças expirando e enviar notificações"
          >
            <span className="mr-2">🔔</span>
            Verificar Vencimentos
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Licença
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {licenses.map((license) => {
          const licenseId = license._id || license.id;
          return (
          <div key={licenseId} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="w-5 h-5 text-primary-600" />
                  <code className="text-lg font-mono font-semibold">
                    {license.key}
                  </code>
                  {license.isActive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Ativa
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      Inativa
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Escola</p>
                    <p className="font-medium">
                      {license.school?.name || 'Não atribuída'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Validade</p>
                    <p className="font-medium">
                      {(license.expiryDate || license.expiresAt)
                        ? format(new Date(license.expiryDate || license.expiresAt!), 'dd/MM/yyyy')
                        : 'Não definida'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Máx. Escolas</p>
                    <p className="font-medium">{license.maxSchools || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-medium">
                      {(license.expiryDate || license.expiresAt) && 
                       new Date(license.expiryDate || license.expiresAt!) > new Date()
                        ? 'Válida'
                        : 'Expirada'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleSendNotification(licenseId!)}
                  className="btn btn-secondary"
                  title="Enviar notificação por email"
                >
                  📧
                </button>
                {license.isActive && (
                  <button
                    onClick={() => handleDeactivate(licenseId!)}
                    className="btn btn-secondary"
                  >
                    Desativar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(licenseId!)}
                  className="btn btn-danger"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )})}
      </div>

      {/* Create License Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Nova Licença</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate(onCreateLicense)} className="space-y-4">
              <div>
                <label className="label">Email do Cliente</label>
                <input
                  {...registerCreate('userEmail')}
                  type="email"
                  className="input"
                  placeholder="email@exemplo.com (opcional para notificação)"
                />
              </div>

              <div>
                <label className="label">Nome do Cliente</label>
                <input
                  {...registerCreate('userName')}
                  type="text"
                  className="input"
                  placeholder="Nome completo (opcional para notificação)"
                />
              </div>

              <div>
                <label className="label">Data de Validade *</label>
                <input
                  {...registerCreate('expiryDate', { required: 'Data é obrigatória' })}
                  type="date"
                  className="input"
                />
                {errorsCreate.expiryDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsCreate.expiryDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Máximo de Escolas *</label>
                <input
                  {...registerCreate('maxSchools', {
                    required: 'Campo obrigatório',
                    min: { value: 1, message: 'Mínimo 1 escola' }
                  })}
                  type="number"
                  className="input"
                  defaultValue={1}
                />
                {errorsCreate.maxSchools && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsCreate.maxSchools.message}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Valor (R$)</label>
                <input
                  {...registerCreate('price')}
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="Valor da licença (opcional)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
