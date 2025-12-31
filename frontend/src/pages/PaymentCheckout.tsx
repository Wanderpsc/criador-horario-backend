import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, QrCode, Clock, Check, X, Loader, ChevronDown } from 'lucide-react';
import api from '../services/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  maxProfessors?: number;
  maxClasses?: number;
}

const PLANS: Plan[] = [
  {
    id: 'basico',
    name: 'Básico',
    price: 99.00,
    maxProfessors: 30,
    maxClasses: 15,
    features: ['Até 30 professores', 'Até 15 turmas', 'Geração automática', 'Suporte por email']
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: 199.00,
    maxProfessors: 50,
    maxClasses: 25,
    features: ['Até 50 professores', 'Até 25 turmas', 'Geração automática', 'Suporte prioritário', 'Backup automático']
  },
  {
    id: 'personalizado',
    name: 'Personalizado',
    price: 450.00,
    features: ['Formulário personalizado', 'R$150 por horário adicional', 'Emissão em 72h', 'Suporte dedicado']
  }
];

const DURATIONS = [
  { months: 1, label: '1 mês', discount: 0 },
  { months: 3, label: '3 meses', discount: 5 },
  { months: 6, label: '6 meses', discount: 10 },
  { months: 12, label: '12 meses', discount: 15 }
];

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preSelectedPlan = queryParams.get('plan') || 'basico';

  const [selectedPlan, setSelectedPlan] = useState<string>(preSelectedPlan);
  const [duration, setDuration] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [timetableCount, setTimetableCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState('');

  const plan = PLANS.find(p => p.id === selectedPlan);
  
  const calculateTotal = () => {
    if (!plan) return 0;
    
    let basePrice = plan.price;
    
    // Para plano personalizado, adicionar custo de horários
    if (selectedPlan === 'personalizado') {
      basePrice += (timetableCount - 1) * 150; // Primeiro horário incluso na taxa base
    }
    
    const subtotal = basePrice * duration;
    const durationData = DURATIONS.find(d => d.months === duration);
    const discount = durationData ? (subtotal * durationData.discount) / 100 : 0;
    
    return subtotal - discount;
  };

  const handleCreatePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.post('/payments/create', {
        plan: selectedPlan,
        durationMonths: duration,
        paymentMethod,
        timetableCount: selectedPlan === 'personalizado' ? timetableCount : undefined
      });

      if (response.data.success) {
        setPaymentData(response.data.data);
        
        // Se for cartão, redirecionar para link do Mercado Pago
        if (paymentMethod === 'credit_card' && response.data.data.paymentLink) {
          window.location.href = response.data.data.paymentLink;
        }
      } else {
        setError(response.data.message || 'Erro ao criar pagamento');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao processar pagamento');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (paymentData?.qrCode) {
      navigator.clipboard.writeText(paymentData.qrCode);
      alert('Código PIX copiado!');
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentData?.paymentId) return;

    try {
      const response = await api.get(`/payments/${paymentData.paymentId}`);
      
      if (response.data.data.status === 'approved') {
        navigate('/payment-success');
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };

  // Verificar status a cada 5 segundos se tiver pagamento PIX pendente
  useEffect(() => {
    if (paymentData && paymentMethod === 'pix') {
      const interval = setInterval(checkPaymentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [paymentData, paymentMethod]);

  if (paymentData && paymentMethod === 'pix') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Pagamento via PIX
              </h2>
              <p className="text-gray-600">
                Escaneie o QR Code ou copie o código para pagar
              </p>
            </div>

            {paymentData.qrCodeBase64 && (
              <div className="flex justify-center mb-6">
                <img 
                  src={`data:image/png;base64,${paymentData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-64 h-64 border-4 border-gray-200 rounded-lg"
                />
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Código PIX:</span>
                <button
                  onClick={copyPixCode}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Copiar código
                </button>
              </div>
              <div className="bg-white rounded p-3 font-mono text-sm break-all border border-gray-200">
                {paymentData.qrCode}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <strong>Aguardando pagamento...</strong>
                  <p className="mt-1 text-blue-700">
                    Assim que o pagamento for confirmado, sua licença será ativada automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Plano:</span>
                <span className="font-medium">{plan?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duração:</span>
                <span className="font-medium">{duration} {duration === 1 ? 'mês' : 'meses'}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">
                  R$ {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-gray-600">
            Selecione o plano ideal para sua escola
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Seleção de Plano e Duração */}
          <div className="space-y-6">
            {/* Planos */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Planos Disponíveis</h3>
              <div className="space-y-3">
                {PLANS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPlan === p.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg">{p.name}</h4>
                      <span className="text-2xl font-bold text-blue-600">
                        R$ {p.price.toFixed(2)}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {p.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Duração */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Duração</h3>
              <div className="grid grid-cols-2 gap-3">
                {DURATIONS.map((d) => (
                  <button
                    key={d.months}
                    onClick={() => setDuration(d.months)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      duration === d.months
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-bold">{d.label}</div>
                    {d.discount > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        {d.discount}% OFF
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantidade de Horários (apenas para Personalizado) */}
            {selectedPlan === 'personalizado' && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Quantidade de Horários</h3>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={timetableCount}
                  onChange={(e) => setTimetableCount(parseInt(e.target.value) || 1)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <p className="text-sm text-gray-600 mt-2">
                  R$ 450,00 (taxa base) + R$ 150,00 por horário adicional
                </p>
              </div>
            )}
          </div>

          {/* Pagamento */}
          <div className="space-y-6">
            {/* Método de Pagamento */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Método de Pagamento</h3>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={`w-full p-4 rounded-lg border-2 flex items-center transition-all ${
                    paymentMethod === 'pix'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <QrCode className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">PIX</div>
                    <div className="text-sm text-gray-600">Aprovação instantânea</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`w-full p-4 rounded-lg border-2 flex items-center transition-all ${
                    paymentMethod === 'credit_card'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Cartão de Crédito</div>
                    <div className="text-sm text-gray-600">Parcelamento disponível</div>
                  </div>
                </button>
              </div>

              {/* Resumo */}
              <div className="border-t-2 border-gray-200 pt-6">
                <h4 className="font-bold mb-4">Resumo do Pedido</h4>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Plano {plan?.name}</span>
                    <span>R$ {plan?.price.toFixed(2)}</span>
                  </div>
                  
                  {selectedPlan === 'personalizado' && timetableCount > 1 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Horários adicionais ({timetableCount - 1}x R$ 150)
                      </span>
                      <span>R$ {((timetableCount - 1) * 150).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duração ({duration} {duration === 1 ? 'mês' : 'meses'})</span>
                    <span>x{duration}</span>
                  </div>
                  
                  {DURATIONS.find(d => d.months === duration)?.discount! > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto ({DURATIONS.find(d => d.months === duration)?.discount}%)</span>
                      <span>
                        - R$ {((calculateTotal() * DURATIONS.find(d => d.months === duration)!.discount) / (100 - DURATIONS.find(d => d.months === duration)!.discount)).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-2xl font-bold pt-3 border-t-2 border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">
                      R$ {calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <X className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreatePayment}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'pix' ? (
                        <>
                          <QrCode className="w-5 h-5 mr-2" />
                          Gerar PIX
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pagar com Cartão
                        </>
                      )}
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate(-1)}
                  className="w-full mt-3 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
