import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';
import api from '../services/api';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const externalRef = queryParams.get('ref') || queryParams.get('external_reference');
  
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!externalRef) {
        setLoading(false);
        return;
      }

      try {
        // Buscar info do pagamento
        const response = await api.get(`/payments/${externalRef}`);
        setPaymentInfo(response.data.data);
      } catch (err) {
        console.error('Erro ao verificar pagamento:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [externalRef]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Pagamento Confirmado!
        </h1>
        
        <p className="text-gray-600 mb-8">
          Sua licença foi ativada com sucesso. Você já pode começar a usar o sistema!
        </p>

        {paymentInfo && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-bold mb-3">Detalhes do Pagamento</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plano:</span>
                <span className="font-medium">{paymentInfo.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duração:</span>
                <span className="font-medium">{paymentInfo.durationMonths} {paymentInfo.durationMonths === 1 ? 'mês' : 'meses'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-medium text-green-600">R$ {paymentInfo.amount.toFixed(2)}</span>
              </div>
              {paymentInfo.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Data:</span>
                  <span className="font-medium">
                    {new Date(paymentInfo.approvedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Ir para o Dashboard
          </button>
          
          <button
            onClick={() => navigate('/timetables')}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Criar Horário
          </button>
        </div>
      </div>
    </div>
  );
}
