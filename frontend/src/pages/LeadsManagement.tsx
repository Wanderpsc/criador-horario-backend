import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Building2, Mail, Phone, DollarSign } from 'lucide-react';
import { leadAPI, Lead, CreateLeadData } from '../services/leadAPI';

export default function LeadsManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateLeadData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'new',
    notes: '',
    source: '',
    estimatedValue: 0
  });
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadLeads();
  }, [filterStatus]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const response = await leadAPI.getAll(filterStatus);
      setLeads(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await leadAPI.update(editingId, formData);
      } else {
        await leadAPI.create(formData);
      }
      loadLeads();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      alert('Erro ao salvar lead');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await leadAPI.delete(id);
      loadLeads();
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', company: '', status: 'new', notes: '', source: '', estimatedValue: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const statusOptions = [
    { value: 'new', label: 'Novo', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contatado', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'negotiating', label: 'Negociando', color: 'bg-purple-100 text-purple-800' },
    { value: 'won', label: 'Ganho', color: 'bg-green-100 text-green-800' },
    { value: 'lost', label: 'Perdido', color: 'bg-red-100 text-red-800' }
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Carregando leads...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Leads</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          Novo Lead
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setFilterStatus('')} className={`px-4 py-2 rounded ${!filterStatus ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Todos</button>
        {statusOptions.map(opt => (
          <button key={opt.value} onClick={() => setFilterStatus(opt.value)} className={`px-4 py-2 rounded ${filterStatus === opt.value ? opt.color : 'bg-gray-200'}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Lead' : 'Novo Lead'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Empresa</label>
                  <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fonte</label>
                  <input type="text" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Estimado (R$)</label>
                  <input type="number" step="0.01" value={formData.estimatedValue} onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingId ? 'Atualizar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map((lead) => (
          <div key={lead.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{lead.name}</h3>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${statusOptions.find(s => s.value === lead.status)?.color}`}>
                  {statusOptions.find(s => s.value === lead.status)?.label}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setFormData({ name: lead.name, email: lead.email, phone: lead.phone || '', company: lead.company || '', status: lead.status, notes: lead.notes || '', source: lead.source || '', estimatedValue: lead.estimatedValue || 0 }); setEditingId(lead.id); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(lead.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{lead.company}</span>
                </div>
              )}
              {lead.estimatedValue && lead.estimatedValue > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.estimatedValue)}</span>
                </div>
              )}
            </div>
            {lead.notes && <p className="text-sm text-gray-500 mt-2 pt-2 border-t">{lead.notes}</p>}
          </div>
        ))}
      </div>

      {leads.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nenhum lead encontrado</p>
        </div>
      )}

      <div className="text-center text-sm text-gray-500 py-4">
        © 2025 Wander Pires Silva Coelho (wanderpsc@gmail.com)
      </div>
    </div>
  );
}
