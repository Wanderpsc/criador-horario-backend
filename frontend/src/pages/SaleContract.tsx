import { useState } from 'react';
import { FileText, Download, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import SaleContractModal from '../components/SaleContractModal';
import type { ContractAcceptanceData } from '../components/SaleContractModal';
import toast from 'react-hot-toast';

const PLAN_NAMES: Record<string, string> = {
  basico: 'Básico',
  profissional: 'Profissional',
  personalizado: 'Personalizado'
};

const PLAN_PRICES: Record<string, number> = {
  basico: 119.90,
  profissional: 249.90
};

export default function SaleContract() {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basico' | 'profissional'>('basico');
  const [signedContracts, setSignedContracts] = useState<ContractAcceptanceData[]>(() => {
    try {
      const saved = localStorage.getItem('edusync_contracts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const schoolName = user?.schoolName || user?.name || '';
  const representativeName = user?.name || '';
  const email = user?.email || '';

  const handleContractAccepted = (data: ContractAcceptanceData) => {
    const updated = [data, ...signedContracts];
    setSignedContracts(updated);
    try {
      localStorage.setItem('edusync_contracts', JSON.stringify(updated));
    } catch { /* ignore */ }
    setShowModal(false);
    toast.success('Contrato assinado com sucesso! Você pode baixá-lo a qualquer momento.', { duration: 5000 });
  };

  const handleDownloadContract = (contract: ContractAcceptanceData) => {
    const text = buildContractText(contract);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_EduSync_PRO_${contract.schoolName.replace(/\s+/g, '_')}_${new Date(contract.acceptedAt).toLocaleDateString('pt-BR').replace(/\//g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildContractText = (c: ContractAcceptanceData) => {
    const planName = PLAN_NAMES[c.plan] || c.plan;
    const loyaltyDiscount = c.loyaltyPlan ? 15 : 0;
    const finalPrice = c.loyaltyPlan
      ? (c.price * 12 * (1 - loyaltyDiscount / 100))
      : c.price * c.durationMonths;

    return `
CONTRATO DE COMPRA E VENDA / LICENÇA DE USO DE SOFTWARE
EduSync-PRO — Sistema Inteligente de Horários Escolares
================================================================================
Data de Celebração: ${new Date(c.acceptedAt).toLocaleDateString('pt-BR')}

CONTRATADA:
  Empresa:  WPS Soluções Digitais
  Proprietário: Wander Pires Silva Coelho
  CPF:      036.236.556-35
  Endereço: Av. Valdecir Rodrigues de Albuquerque, nº 819 — Centro
            Curimatá, Piauí — CEP 64.960-000
  E-mail:   wanderpsc@gmail.com

CONTRATANTE:
  Escola/Instituição: ${c.schoolName}
  CNPJ/CPF: ${c.schoolCNPJ || 'Não informado'}
  Representante: ${c.representativeName}
  CPF: ${c.representativeCPF || 'Não informado'}
  E-mail: ${c.email}

PLANO: ${planName} — ${c.loyaltyPlan ? 'Fidelidade 12 meses (-15%)' : `Sem Fidelidade (${c.durationMonths} ${c.durationMonths === 1 ? 'mês' : 'meses'})`}
TOTAL: R$ ${finalPrice.toFixed(2)}

CLÁUSULAS PRINCIPAIS:
1. OBJETO: Licença de uso do software EduSync-PRO na modalidade SaaS.
2. FIDELIDADE: ${c.loyaltyPlan ? `Plano 12 meses com desconto de ${loyaltyDiscount}%. Multa de 20% em rescisão antecipada.` : 'Sem fidelidade. Cancelamento sem multa.'}
3. DIREITO DE ARREPENDIMENTO (CDC Art. 49): 7 dias corridos para cancelamento com devolução integral.
4. SUPORTE: E-mail wanderpsc@gmail.com em até 48h úteis.
5. FORO: Comarca de Curimatá/PI (prevalece o domicílio do consumidor em disputas CDC).
6. LGPD: Dados tratados conforme Lei nº 13.709/2018.

ASSINATURA ELETRÔNICA:
  Signatário: ${c.signatureText}
  Data/Hora:  ${new Date(c.acceptedAt).toLocaleString('pt-BR')}
  E-mail:     ${c.email}

© 2025 WPS Soluções Digitais — Wander Pires Silva Coelho — CPF 036.236.556-35
Av. Valdecir Rodrigues de Albuquerque, 819 — Centro — Curimatá/PI — CEP 64.960-000
wanderpsc@gmail.com — EduSync-PRO. Todos os direitos reservados.
    `.trim();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
          <FileText className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrato de Compra e Venda</h1>
          <p className="text-gray-500 text-sm">WPS Soluções Digitais · Wander Pires Silva Coelho · CPF 036.236.556-35 · Curimatá/PI · wanderpsc@gmail.com</p>
        </div>
      </div>

      {/* Destaques de Direitos */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-green-800 text-sm">7 Dias de Arrependimento</h3>
            <p className="text-xs text-green-700 mt-1">CDC Art. 49 — Reembolso integral garantido em compras a distância.</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Clock className="w-8 h-8 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-blue-800 text-sm">Cancelamento Fácil</h3>
            <p className="text-xs text-blue-700 mt-1">Plano sem fidelidade sem multa de rescisão a qualquer momento.</p>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex gap-3">
          <CheckCircle className="w-8 h-8 text-purple-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-purple-800 text-sm">Assinatura Eletrônica</h3>
            <p className="text-xs text-purple-700 mt-1">Válida por Lei nº 14.063/2020 e MP nº 2.200-2/2001.</p>
          </div>
        </div>
      </div>

      {/* Gerar Novo Contrato */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Gerar Novo Contrato</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {(['basico', 'profissional'] as const).map(p => (
            <div
              key={p}
              onClick={() => setSelectedPlan(p)}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                selectedPlan === p
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{PLAN_NAMES[p]}</h3>
                <span className="text-xl font-extrabold text-blue-600">
                  R$ {PLAN_PRICES[p].toFixed(2)}<span className="text-sm font-normal text-gray-400">/mês</span>
                </span>
              </div>
              {p === 'basico' && (
                <p className="text-xs text-gray-500 mt-1">Até 30 professores · 15 turmas</p>
              )}
              {p === 'profissional' && (
                <p className="text-xs text-gray-500 mt-1">Até 50 professores · 25 turmas · Suporte prioritário</p>
              )}
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            O contrato será gerado com os dados da sua conta. Você poderá escolher entre o{' '}
            <strong>Plano Fidelidade (12 meses com 15% de desconto)</strong> ou{' '}
            <strong>Sem Fidelidade</strong> durante o processo.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md"
        >
          <FileText className="w-5 h-5" />
          Visualizar e Assinar Contrato
        </button>
      </div>

      {/* Contratos Assinados */}
      {signedContracts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Contratos Assinados</h2>
          <div className="space-y-3">
            {signedContracts.map((contract, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      Plano {PLAN_NAMES[contract.plan] || contract.plan} — {contract.loyaltyPlan ? 'Fidelidade 12m' : 'Sem Fidelidade'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Assinado em {new Date(contract.acceptedAt).toLocaleString('pt-BR')} por {contract.signatureText}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    contract.loyaltyPlan ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {contract.loyaltyPlan ? 'Fidelidade' : 'Sem Fidelidade'}
                  </span>
                  <button
                    onClick={() => handleDownloadContract(contract)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    title="Baixar contrato"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Baixar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emtpy state */}
      {signedContracts.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhum contrato assinado ainda</p>
          <p className="text-sm mt-1">Clique em "Visualizar e Assinar Contrato" para gerar seu contrato.</p>
        </div>
      )}

      {/* Informações Legais */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" /> Seus Direitos como Consumidor
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">CDC Art. 49 — Arrependimento</h4>
            <p>Em contratos celebrados fora do estabelecimento comercial (internet), você pode cancelar em até 7 dias corridos com reembolso integral, sem necessidade de justificativa.</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">Como solicitar reembolso</h4>
            <p>Envie e-mail para <strong>wanderpsc@gmail.com</strong> com assunto "CANCELAMENTO — [nome da escola]" dentro do prazo de 7 dias. O reembolso será processado em até 10 dias úteis pelo mesmo meio de pagamento.</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">Plano Fidelidade</h4>
            <p>A rescisão após 7 dias no plano de fidelidade implica multa de 20% sobre o valor restante. Fora do período de arrependimento, não há reembolso de meses já utilizados.</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">Plano Sem Fidelidade</h4>
            <p>Cancele a qualquer momento ao fim do período vigente. Basta comunicar com 7 dias de antecedência por e-mail. Sem multas adicionais.</p>
          </div>
        </div>
      </div>

      {showModal && (
        <SaleContractModal
          schoolName={schoolName}
          representativeName={representativeName}
          email={email}
          plan={selectedPlan}
          price={PLAN_PRICES[selectedPlan]}
          durationMonths={1}
          onAccept={handleContractAccepted}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
