import { Building, Save } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SchoolSettings() {
  const [formData, setFormData] = useState({
    schoolName: 'Minha Escola',
    workingDays: 5,
    academicYear: new Date().getFullYear()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configurações salvas com sucesso!');
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
