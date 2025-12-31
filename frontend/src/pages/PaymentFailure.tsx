import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PaymentFailure() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Pagamento Não Aprovado
        </h1>
        
        <p className="text-gray-600 mb-8">
          Houve um problema ao processar seu pagamento. Por favor, tente novamente ou entre em contato com o suporte.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-yellow-800">
            <strong>Possíveis causas:</strong><br />
            • Dados do cartão incorretos<br />
            • Saldo insuficiente<br />
            • Limite excedido<br />
            • PIX expirado ou não pago
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/payment-checkout')}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Tentar Novamente
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Voltar ao Dashboard
          </button>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Precisa de ajuda?</p>
            <p className="text-sm">
              <a href="mailto:wanderpsc@gmail.com" className="text-blue-600 hover:underline">
                wanderpsc@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
