import { Building, Save, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface ResponsibleData {
  responsibleName: string;
  responsibleCPF: string;
  responsiblePhone: string;
  responsibleEmail: string;
}

export default function SchoolSettings() {
  const [formData, setFormData] = useState({
    schoolName: 'Minha Escola',
    workingDays: 5,
    academicYear: new Date().getFullYear()
  });

  const [responsibleData, setResponsibleData] = useState<ResponsibleData>({
    responsibleName: '',
    responsibleCPF: '',
    responsiblePhone: '',
    responsibleEmail: ''
  });

  const [loading, setLoading] = useState(false);
  const [editingResponsible, setEditingResponsible] = useState(false);

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    try {
      const response = await api.get('/schools/profile');
      if (response.data.success) {
        const data = response.data.data;
        setResponsibleData({
          responsibleName: data.responsibleName || '',
          responsibleCPF: data.responsibleCPF || '',
          responsiblePhone: data.responsiblePhone || '',
          responsibleEmail: data.responsibleEmail || ''
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configurações salvas com sucesso!');
  };

  const handleSaveResponsible = async () => {
    setLoading(true);
    try {
      await api.put('/schools/responsible', responsibleData);
      toast.success('Dados do responsável salvos com sucesso!');
      setEditingResponsible(false);
      await loadSchoolData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar dados do responsável');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Building className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Configurações da Escola</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Escola
          </label>
          <input
            type="text"
            className="input"
            value={formData.schoolName}
            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dias de Aula por Semana
            </label>
            <select 
              className="input"
              value={formData.workingDays}
              onChange={(e) => setFormData({ ...formData, workingDays: parseInt(e.target.value) })}
            >
              <option value="5">5 dias (Segunda a Sexta)</option>
              <option value="6">6 dias (Segunda a Sábado)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ano Letivo
            </label>
            <input
              type="number"
              className="input"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: parseInt(e.target.value) })}
              min="2020"
              max="2030"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </form>

      {/* Dados do Responsável */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Dados do Responsável</h2>
          </div>
          {!editingResponsible ? (
            <button
              onClick={() => setEditingResponsible(true)}
              className="btn btn-primary"
            >
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingResponsible(false);
                  loadSchoolData();
                }}
                className="btn bg-gray-300 text-gray-700 hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveResponsible}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-6">
          ℹ️ Estes dados são utilizados pelo administrador do sistema para contato e gestão da conta da escola.
        </p>

        {!editingResponsible ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600">Nome Completo</label>
              <p className="text-gray-900 mt-1">
                {responsibleData.responsibleName || (
                  <span className="text-orange-600 italic">Não cadastrado</span>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">CPF</label>
              <p className="text-gray-900 mt-1">
                {responsibleData.responsibleCPF || (
                  <span className="text-orange-600 italic">Não cadastrado</span>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Telefone</label>
              <p className="text-gray-900 mt-1">
                {responsibleData.responsiblePhone || (
                  <span className="text-orange-600 italic">Não cadastrado</span>
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">E-mail</label>
              <p className="text-gray-900 mt-1">
                {responsibleData.responsibleEmail || (
                  <span className="text-orange-600 italic">Não cadastrado</span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                className="input"
                value={responsibleData.responsibleName}
                onChange={(e) => setResponsibleData({...responsibleData, responsibleName: e.target.value})}
                placeholder="Nome do responsável"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF *
              </label>
              <input
                type="text"
                className="input"
                value={responsibleData.responsibleCPF}
                onChange={(e) => setResponsibleData({...responsibleData, responsibleCPF: e.target.value})}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                className="input"
                value={responsibleData.responsiblePhone}
                onChange={(e) => setResponsibleData({...responsibleData, responsiblePhone: e.target.value})}
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail *
              </label>
              <input
                type="email"
                className="input"
                value={responsibleData.responsibleEmail}
                onChange={(e) => setResponsibleData({...responsibleData, responsibleEmail: e.target.value})}
                placeholder="email@exemplo.com"
                required
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-bold mb-2">ℹ️ Informação</h3>
        <p className="text-sm text-gray-600 mb-3">
          As configurações definidas aqui afetam a geração de horários e o funcionamento geral do sistema.
        </p>
        <p className="text-sm text-gray-700 font-medium">
          📋 Configure os períodos e horários específicos na página <span className="text-primary-600">"Horários de Aula"</span>
        </p>
        <ul className="text-sm text-gray-600 mt-2 ml-4 space-y-1">
          <li>• Horário Integral (manhã + tarde)</li>
          <li>• Horário Parcial Manhã</li>
          <li>• Horário Parcial Tarde</li>
          <li>• Horário Parcial Noite</li>
          <li>• Horários para Sábado/Domingo</li>
        </ul>
      </div>
    </div>
  );
}
