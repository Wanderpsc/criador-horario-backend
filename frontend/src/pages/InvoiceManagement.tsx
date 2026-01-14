/**
 * Interface administrativa para emissão de nota fiscal
 * © 2025-2026 Wander Pires Silva Coelho
 */

import React, { useState, useEffect } from 'react';
import { FileText, Send, Download, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface School {
  _id: string;
  schoolName: string;
  email: string;
  cnpj: string;
  phone: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  serie: string;
  issueDate: string;
  customer: {
    name: string;
    email: string;
  };
  payment: {
    plan: string;
    method: string;
    date: string;
  };
  values: {
    serviceValue: number;
    issValue: number;
    netValue: number;
  };
  status: 'pending' | 'issued' | 'sent' | 'cancelled';
}

export const InvoiceManagement: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    paymentId: '',
    method: 'PIX',
    date: new Date().toISOString().split('T')[0],
    plan: 'Mensal',
    amount: 49.90
  });

  useEffect(() => {
    loadSchools();
    loadInvoices();
  }, []);

  const loadSchools = async () => {
    try {
      console.log('[InvoiceManagement] Carregando escolas...');
      const response = await api.get('/admin/schools');
      console.log('[InvoiceManagement] Resposta completa:', response.data);
      
      // A resposta vem em response.data.data, não response.data.schools
      const schoolsList = response.data.data || response.data.schools || [];
      console.log('[InvoiceManagement] Escolas extraídas:', schoolsList);
      
      setSchools(schoolsList);
      console.log(`[InvoiceManagement] ${schoolsList.length} escolas carregadas`);
    } catch (error: any) {
      console.error('[InvoiceManagement] Erro ao carregar escolas:', error);
      console.error('[InvoiceManagement] Detalhes do erro:', error.response?.data);
      toast.error('Erro ao carregar lista de escolas: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Erro ao carregar notas fiscais:', error);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSchool) {
      toast.error('Selecione uma escola');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/invoices/create', {
        schoolId: selectedSchool,
        paymentData: formData
      });
      
      toast.success('Nota fiscal criada com sucesso!');
      
      // Gerar PDF automaticamente
      await api.post(`/invoices/${response.data.invoice.id}/generate-pdf`);
      
      // Enviar por email
      await api.post(`/invoices/${response.data.invoice.id}/send-email`);
      
      toast.success('Nota fiscal enviada por email!');
      
      setShowForm(false);
      loadInvoices();
      
      // Resetar formulário
      setFormData({
        paymentId: '',
        method: 'PIX',
        date: new Date().toISOString().split('T')[0],
        plan: 'Mensal',
        amount: 49.90
      });
      setSelectedSchool('');
      
    } catch (error: any) {
      console.error('Erro ao criar nota fiscal:', error);
      toast.error(error.response?.data?.message || 'Erro ao criar nota fiscal');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (invoiceId: string) => {
    try {
      await api.post(`/invoices/${invoiceId}/send-email`);
      toast.success('Email enviado com sucesso!');
      loadInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar email');
    }
  };

  const handleDownload = async (invoiceId: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nota-fiscal-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Download iniciado!');
    } catch (error: any) {
      toast.error('Erro ao fazer download');
    }
  };

  const handleCancel = async (invoiceId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta nota fiscal?')) {
      return;
    }
    
    const reason = prompt('Motivo do cancelamento:');
    if (!reason) return;
    
    try {
      await api.delete(`/invoices/${invoiceId}/cancel`, {
        data: { reason }
      });
      toast.success('Nota fiscal cancelada');
      loadInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'issued': return <CheckCircle size={16} />;
      case 'sent': return <Send size={16} />;
      case 'cancelled': return <X size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'issued': return 'Emitida';
      case 'sent': return 'Enviada';
      case 'cancelled': return 'Cancelada';
      default: return 'Pendente';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="text-blue-600" size={36} />
                Notas Fiscais / ISS
              </h1>
              <p className="text-gray-600 mt-2">
                Geração e envio de notas fiscais após confirmação de pagamento
              </p>
            </div>
            
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
            >
              <FileText size={20} />
              Nova Nota Fiscal
            </button>
          </div>
        </div>

        {/* Formulário de Criação */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="text-blue-600" />
              Emitir Nova Nota Fiscal
            </h2>
            
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Escola */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escola (Tomador de Serviço)
                    <span className="text-xs text-gray-500 ml-2">
                      ({schools.length} escola{schools.length !== 1 ? 's' : ''} disponível{schools.length !== 1 ? 'is' : ''})
                    </span>
                  </label>
                  <select
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">
                      {schools.length === 0 
                        ? 'Carregando escolas...' 
                        : 'Selecione uma escola'}
                    </option>
                    {schools.map(school => (
                      <option key={school._id} value={school._id}>
                        {school.schoolName} - {school.email} {school.cnpj ? `- CNPJ: ${school.cnpj}` : ''}
                      </option>
                    ))}
                  </select>
                  {schools.length === 0 && (
                    <p className="mt-2 text-sm text-orange-600">
                      ⚠️ Nenhuma escola cadastrada no sistema
                    </p>
                  )}
                  {schools.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {schools.length} escola(s) disponível(is)
                    </p>
                  )}
                </div>

                {/* ID do Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID da Transação
                  </label>
                  <input
                    type="text"
                    value={formData.paymentId}
                    onChange={(e) => setFormData({...formData, paymentId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: MP-123456789"
                    required
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Transferência">Transferência Bancária</option>
                  </select>
                </div>

                {/* Data do Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Plano */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plano Contratado
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => {
                      const plan = e.target.value;
                      let amount = 49.90;
                      if (plan === 'Anual') amount = 499.90;
                      if (plan === 'Perpétua') amount = 1999.90;
                      setFormData({...formData, plan, amount});
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Mensal">Mensal - R$ 49,90</option>
                    <option value="Anual">Anual - R$ 499,90</option>
                    <option value="Perpétua">Perpétua - R$ 1.999,90</option>
                  </select>
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Processando...' : 'Emitir e Enviar NF'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Notas Fiscais */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Notas Fiscais Emitidas</h2>
          
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhuma nota fiscal emitida ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Nº NF</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Data</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Plano</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Valor</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">
                        {invoice.invoiceNumber}-{invoice.serie}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(invoice.issueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{invoice.customer.name}</div>
                        <div className="text-gray-500 text-xs">{invoice.customer.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {invoice.payment.plan}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">
                        R$ {invoice.values.netValue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownload(invoice._id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                          
                          {invoice.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleSendEmail(invoice._id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Enviar Email"
                              >
                                <Send size={18} />
                              </button>
                              
                              <button
                                onClick={() => handleCancel(invoice._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancelar NF"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025-2026 Wander Pires Silva Coelho - Sistema de Emissão de Notas Fiscais</p>
          <p className="mt-1">ISS - Imposto Sobre Serviços de Qualquer Natureza</p>
        </div>
        
      </div>
    </div>
  );
};

export default InvoiceManagement;
