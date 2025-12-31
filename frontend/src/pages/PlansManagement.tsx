import { Package } from 'lucide-react';

export default function PlansManagement() {
  const plans = [
    {
      id: '1',
      name: 'Básico',
      price: 'R\$ 99,00/mês',
      features: ['Até 30 professores', 'Até 15 turmas', 'Suporte por e-mail']
    },
    {
      id: '2',
      name: 'Profissional',
      price: 'R\$ 199,00/mês',
      features: ['Até 50 professores', 'Até 25 turmas', 'Suporte prioritário', 'Backup automático']
    },
    {
      id: '3',
      name: 'Personalizado',
      price: 'R\$ 450,00 taxa + R\$ 150,00/horário',
      features: ['Formulário personalizado', 'Emissão em até 72 horas', 'Horários sob demanda', 'Suporte dedicado']
    },
    {
      id: '4',
      name: 'Enterprise',
      price: 'Sob consulta',
      features: ['Professores ilimitados', 'Turmas ilimitadas', 'Suporte 24/7', 'Customizações', 'API dedicada']
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Planos de Assinatura</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="card border-2 hover:border-primary-500 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-8 h-8 text-primary-600" />
              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-2xl font-bold text-primary-600">{plan.price}</p>
              </div>
            </div>
            
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <span className="mr-2 text-green-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button className="w-full btn btn-primary">
              Selecionar Plano
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-bold mb-2">📞 Dúvidas sobre os planos?</h3>
        <p className="text-gray-600">
          Entre em contato: <strong>wanderpsc@gmail.com</strong>
        </p>
      </div>
    </div>
  );
}
