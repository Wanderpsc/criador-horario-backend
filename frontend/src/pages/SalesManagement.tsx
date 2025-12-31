import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Calendar, CreditCard } from 'lucide-react';
import { saleAPI, Sale, CreateSaleData } from '../services/saleAPI';
import { schoolAPI } from '../services/schoolAPI';
import { planAPI } from '../services/planAPI';

export default function SalesManagement() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSaleData>({
    schoolId: '',
    planId: '',
    amount: 0,
    paymentMethod: 'pix',
    paymentStatus: 'pending',
    saleDate: new Date().toISOString().split('T')[0],
    notes: '',
    invoiceNumber: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesRes, schoolsRes, plansRes] = await Promise.all([
        saleAPI.getAll(),
        schoolAPI.getAll(),
        planAPI.getAll()
      ]);
      setSales(salesRes.data.data);
      setSchools(schoolsRes.data.data);
      setPlans(plansRes.data.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await saleAPI.update(editingId, formData);
      } else {
        await saleAPI.create(formData);
      }
      loadData();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      alert('Erro ao salvar venda');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;
    try {
      await saleAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
    }
  };

  const resetForm = () => {
    setFormData({ schoolId: '', planId: '', amount: 0, paymentMethod: 'pix', paymentStatus: 'pending', saleDate: new Date().toISOString().split('T')[0], notes: '', invoiceNumber: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const paymentMethods = [
    { value: 'credit_card', label: 'Cartão Crédito' },
    { value: 'debit_card', label: 'Cartão Débito' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'pix', label: 'PIX' },
    { value: 'bank_transfer', label: 'Transferência' },
    { value: 'other', label: 'Outro' }
  ];

  const paymentStatuses = [
    { value: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'paid', label: 'Pago', color: 'bg-green-100 text-green-800' },
    { value: 'failed', label: 'Falhou', color: 'bg-red-100 text-red-800' },
    { value: 'refunded', label: 'Reembolsado', color: 'bg-gray-100 text-gray-800' }
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Carregando vendas...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Vendas</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          Nova Venda
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Venda' : 'Nova Venda'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Escola *</label>
                <select required value={formData.schoolId} onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">Selecione...</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plano</label>
                <select value={formData.planId} onChange={(e) => setFormData({ ...formData, planId: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">Nenhum</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor (R$) *</label>
                  <input type="number" required step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data *</label>
                  <input type="date" required value={formData.saleDate} onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Método *</label>
                  <select required value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status *</label>
                  <select required value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    {paymentStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nº Nota Fiscal</label>
                <input type="text" value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingId ? 'Atualizar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escola</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{sale.school?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{sale.plan?.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(sale.amount)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {paymentMethods.find(m => m.value === sale.paymentMethod)?.label}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatuses.find(s => s.value === sale.paymentStatus)?.color}`}>
                    {paymentStatuses.find(s => s.value === sale.paymentStatus)?.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button onClick={() => { setFormData({ schoolId: sale.schoolId, planId: sale.planId || '', amount: sale.amount, paymentMethod: sale.paymentMethod, paymentStatus: sale.paymentStatus, saleDate: sale.saleDate.split('T')[0], notes: sale.notes || '', invoiceNumber: sale.invoiceNumber || '' }); setEditingId(sale.id); setShowForm(true); }} className="text-blue-600 hover:text-blue-800">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(sale.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma venda registrada</p>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-gray-500 py-4">
        © 2025 Wander Pires Silva Coelho (wanderpsc@gmail.com)
      </div>
    </div>
  );
}
