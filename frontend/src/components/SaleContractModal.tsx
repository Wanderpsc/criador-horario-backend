import { useState } from 'react';
import { X, FileText, Download, CheckCircle, Shield, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SaleContractModalProps {
  schoolName: string;
  representativeName: string;
  representativeCPF?: string;
  schoolCNPJ?: string;
  email: string;
  plan: string;
  price: number;
  durationMonths: number;
  onAccept: (data: ContractAcceptanceData) => void;
  onCancel: () => void;
}

export interface ContractAcceptanceData {
  schoolName: string;
  representativeName: string;
  representativeCPF: string;
  schoolCNPJ: string;
  email: string;
  plan: string;
  price: number;
  durationMonths: number;
  loyaltyPlan: boolean;
  acceptedAt: Date;
  signatureText: string;
}

const PLAN_NAMES: Record<string, string> = {
  basico: 'Básico',
  profissional: 'Profissional',
  personalizado: 'Personalizado'
};

export default function SaleContractModal({
  schoolName,
  representativeName,
  representativeCPF = '',
  schoolCNPJ = '',
  email,
  plan,
  price,
  durationMonths,
  onAccept,
  onCancel
}: SaleContractModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loyaltyPlan, setLoyaltyPlan] = useState<boolean>(durationMonths >= 12);
  const [cpf, setCpf] = useState(representativeCPF);
  const [cnpj, setCnpj] = useState(schoolCNPJ);
  const [signature, setSignature] = useState('');
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const today = new Date().toLocaleDateString('pt-BR');
  const planName = PLAN_NAMES[plan] || plan;
  const loyaltyDiscount = loyaltyPlan ? 15 : 0;
  const finalPrice = loyaltyPlan
    ? (price * 12 * (1 - loyaltyDiscount / 100))
    : price * durationMonths;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 60;
    if (atBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
      toast.success('Você leu o contrato completo. Prossiga para aceitar.', { duration: 3000 });
    }
  };

  const handleDownload = () => {
    const contractText = buildContractText();
    const blob = new Blob([contractText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_EduSync_PRO_${schoolName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Contrato baixado com sucesso!');
  };

  const handleAccept = () => {
    if (!signature.trim()) {
      toast.error('Por favor, digite seu nome completo para assinar.');
      return;
    }
    if (signature.trim().toLowerCase() !== representativeName.trim().toLowerCase()) {
      toast.error('A assinatura deve corresponder ao nome do representante legal.');
      return;
    }

    onAccept({
      schoolName,
      representativeName,
      representativeCPF: cpf,
      schoolCNPJ: cnpj,
      email,
      plan,
      price,
      durationMonths: loyaltyPlan ? 12 : durationMonths,
      loyaltyPlan,
      acceptedAt: new Date(),
      signatureText: signature
    });
  };

  const buildContractText = () => {
    return `
CONTRATO DE COMPRA E VENDA / LICENÇA DE USO DE SOFTWARE
EduSync-PRO — Sistema Inteligente de Horários Escolares
================================================================================

Data de Celebração: ${today}

PARTES:

CONTRATADA:
  Empresa:  WPS Soluções Digitais
  Proprietário: Wander Pires Silva Coelho
  CPF:      036.236.556-35
  Endereço: Avenida Valdecir Rodrigues de Albuquerque, nº 819
            Centro — Curimatá, Piauí — CEP 64.960-000
  E-mail:   wanderpsc@gmail.com
  Atividade: Desenvolvimento de Sistemas e Software

CONTRATANTE (CLIENTE):
  Nome/Razão Social: ${schoolName}
  CNPJ/CPF: ${cnpj || '(a preencher)'}
  Representante Legal: ${representativeName}
  CPF do Representante: ${cpf || '(a preencher)'}
  E-mail: ${email}

================================================================================
CLÁUSULA 1 — OBJETO DO CONTRATO
================================================================================
O presente contrato tem por objeto a licença de uso do software EduSync-PRO,
Sistema Inteligente de Criação de Horários Escolares, na modalidade SaaS
(Software as a Service), conforme plano escolhido:

  Plano:    ${planName}
  Valor:    R$ ${price.toFixed(2)} / mês
  Duração:  ${loyaltyPlan ? '12 meses (Plano Fidelidade)' : `${durationMonths} ${durationMonths === 1 ? 'mês' : 'meses'} (Sem Fidelidade)`}
  Total:    R$ ${finalPrice.toFixed(2)}
  ${loyaltyPlan ? `Desconto de Fidelidade: ${loyaltyDiscount}% aplicado` : ''}

================================================================================
CLÁUSULA 2 — PLANO DE FIDELIDADE
================================================================================
${loyaltyPlan
  ? `O CONTRATANTE optou pelo PLANO FIDELIDADE de 12 (doze) meses, com desconto
de ${loyaltyDiscount}% sobre o valor mensal, totalizando R$ ${finalPrice.toFixed(2)}.
Nesta modalidade, o pagamento antecipado é pago pelo período total contratado.
A rescisão antecipada pelo CONTRATANTE antes de 12 meses implicará multa de
20% (vinte por cento) sobre o valor restante do contrato, salvo nas hipóteses
previstas na Cláusula 4 (Direito de Arrependimento).`
  : `O CONTRATANTE optou pela modalidade SEM FIDELIDADE, podendo cancelar o serviço
a qualquer momento ao final do período vigente, sem multa, bastando comunicar
a CONTRATADA com 7 (sete) dias de antecedência.`}

================================================================================
CLÁUSULA 3 — PAGAMENTO
================================================================================
O pagamento será realizado conforme método escolhido (PIX ou Cartão de Crédito),
processado pela plataforma Mercado Pago. A licença é ativada somente após a
confirmação do pagamento.

================================================================================
CLÁUSULA 4 — DIREITO DE ARREPENDIMENTO (CDC Art. 49)
================================================================================
Em conformidade com o Art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/90),
o CONTRATANTE tem o direito de arrependimento e cancelamento do contrato no
prazo de 7 (sete) dias corridos, contados da data de celebração ou do primeiro
acesso ao sistema, com DEVOLUÇÃO INTEGRAL do valor pago.

Para exercer esse direito, o CONTRATANTE deve:
  a) Enviar e-mail para wanderpsc@gmail.com com o assunto:
     "CANCELAMENTO — [nome da escola]";
  b) Informar o número da transação e o motivo do cancelamento.

O reembolso será processado em até 10 (dez) dias úteis pelo mesmo meio de
pagamento utilizado.

EXCEÇÃO: Após os 7 dias, em caso de plano SEM fidelidade, o cancelamento gera
crédito proporcional ao período não utilizado no mês vigente, sem reembolso
de meses anteriores já usufruídos.

================================================================================
CLÁUSULA 5 — OBRIGAÇÕES DA CONTRATADA
================================================================================
  a) Disponibilizar o sistema com disponibilidade mínima de 99% ao mês;
  b) Garantir suporte técnico por e-mail em até 48 h úteis;
  c) Manter backups automáticos dos dados do CONTRATANTE;
  d) Não compartilhar dados com terceiros sem autorização expressa (LGPD).

================================================================================
CLÁUSULA 6 — OBRIGAÇÕES DO CONTRATANTE
================================================================================
  a) Utilizar o sistema apenas para fins educacionais lícitos;
  b) Não ceder, sublicenciar ou revender o acesso a terceiros;
  c) Manter sigilo das credenciais de acesso;
  d) Manter seus dados cadastrais atualizados.

================================================================================
CLÁUSULA 7 — PROPRIEDADE INTELECTUAL
================================================================================
O EduSync-PRO é software proprietário. A licença concede apenas o direito
de uso, não transferindo propriedade intelectual. É vedada engenharia reversa,
cópia ou redistribuição não autorizada.

================================================================================
CLÁUSULA 8 — PRIVACIDADE E LGPD
================================================================================
Os dados inseridos no sistema são tratados em conformidade com a Lei Geral
de Proteção de Dados (LGPD — Lei nº 13.709/2018). O CONTRATANTE é o
responsável pelos dados pessoais de seus professores e alunos inseridos.

================================================================================
CLÁUSULA 9 — FORO
================================================================================
Fica eleito o Foro da Comarca de Curimatá, Estado do Piauí, para dirimir quaisquer
controvérsias não resolvidas amigavelmente, prevalecendo contudo o domicílio do
CONTRATANTE nas disputas de relação de consumo, conforme CDC Art. 101, I.

================================================================================
ASSINATURA ELETRÔNICA
================================================================================
Ao clicar em "Aceitar e Assinar", o CONTRATANTE declara:
  - Ter lido e concordado com todas as cláusulas deste contrato;
  - Ter capacidade jurídica para celebrar este acordo;
  - Que os dados informados são verdadeiros.

Assinatura: ${representativeName}
Data/Hora:  ${new Date().toLocaleString('pt-BR')}
E-mail:     ${email}

================================================================================
© 2025 WPS Soluções Digitais — Wander Pires Silva Coelho — EduSync-PRO
CPF: 036.236.556-35 | E-mail: wanderpsc@gmail.com
Av. Valdecir Rodrigues de Albuquerque, 819 — Centro — Curimatá/PI — CEP 64.960-000
Todos os direitos reservados.
================================================================================
    `.trim();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-700 to-indigo-800 rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Contrato de Compra e Venda</h2>
              <p className="text-xs text-blue-200">EduSync-PRO — Licença de Uso de Software</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 py-3 border-b bg-gray-50 flex items-center justify-center gap-2">
          {(['1. Plano', '2. Contrato', '3. Assinatura'] as const).map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                step > i + 1 ? 'bg-green-500 text-white' :
                step === i + 1 ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step > i + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:inline ${step === i + 1 ? 'text-blue-700' : 'text-gray-500'}`}>
                {label}
              </span>
              {i < 2 && <div className={`w-8 h-1 rounded ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 — Escolha do Plano de Fidelidade */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-800">Escolha o Tipo de Contrato</h3>

            {/* Sem Fidelidade */}
            <div
              onClick={() => setLoyaltyPlan(false)}
              className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                !loyaltyPlan ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 ${!loyaltyPlan ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                  {!loyaltyPlan && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5 ml-0.5" />}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-800">Sem Fidelidade</h4>
                  <p className="text-2xl font-extrabold text-blue-600 mt-1">
                    R$ {price.toFixed(2)}<span className="text-base font-medium text-gray-500">/mês</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> Cancele a qualquer momento ao fim do período</li>
                    <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> Sem multa de rescisão</li>
                    <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> Direito de arrependimento de 7 dias (CDC)</li>
                    <li className="flex gap-2"><AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" /> Sem desconto de fidelidade</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Com Fidelidade */}
            <div
              onClick={() => setLoyaltyPlan(true)}
              className={`p-5 border-2 rounded-xl cursor-pointer transition-all relative overflow-hidden ${
                loyaltyPlan ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-green-400'
              }`}
            >
              <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                RECOMENDADO
              </span>
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 ${loyaltyPlan ? 'border-green-500 bg-green-500' : 'border-gray-400'}`}>
                  {loyaltyPlan && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5 ml-0.5" />}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-800">Plano Fidelidade — 12 meses</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-extrabold text-green-700">
                      R$ {(price * (1 - 15 / 100)).toFixed(2)}<span className="text-base font-medium text-gray-500">/mês</span>
                    </p>
                    <span className="text-sm font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">15% OFF</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">Total: R$ {(price * 12 * 0.85).toFixed(2)} no ano</p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> 15% de desconto sobre o valor mensal</li>
                    <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> Pagamento anual único com economia garantida</li>
                    <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> Direito de arrependimento de 7 dias (CDC)</li>
                    <li className="flex gap-2"><AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" /> Multa de 20% em rescisão antes de 12 meses</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Aviso CDC */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Seus direitos como consumidor (CDC Art. 49):</strong>
                <p className="mt-1">Em compras a distância, você tem <strong>7 dias corridos</strong> para se arrepender e receber <strong>reembolso integral</strong>, independentemente do plano escolhido.</p>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Continuar → Ver Contrato Completo
            </button>
          </div>
        )}

        {/* STEP 2 — Contrato Completo */}
        {step === 2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 pt-4 pb-2 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Leia o Contrato na Íntegra</h3>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Download className="w-4 h-4" /> Baixar .TXT
              </button>
            </div>

            <div
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto mx-6 mb-4 border border-gray-200 rounded-xl bg-gray-50 p-5 text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap"
            >
              {buildContractText()}
            </div>

            {!scrolledToBottom && (
              <p className="text-center text-xs text-amber-600 mb-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> Role até o fim para prosseguir
              </p>
            )}

            <div className="flex gap-3 px-6 pb-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                ← Voltar
              </button>
              <button
                onClick={() => {
                  if (!scrolledToBottom) {
                    toast.error('Por favor, role até o fim do contrato antes de prosseguir.');
                    return;
                  }
                  setStep(3);
                }}
                className={`flex-1 py-3 font-bold rounded-xl transition-colors ${
                  scrolledToBottom
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Li e Entendi → Assinar
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Assinatura Eletrônica */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-800">Assinatura Eletrônica</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CPF do Representante Legal</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CNPJ / CPF da Escola</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-amber-800">Resumo do Contrato</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Contratante:</span> <strong>{schoolName}</strong></div>
                <div><span className="text-gray-500">Plano:</span> <strong>{planName}</strong></div>
                <div><span className="text-gray-500">Modalidade:</span> <strong>{loyaltyPlan ? 'Fidelidade 12m' : 'Sem Fidelidade'}</strong></div>
                <div><span className="text-gray-500">Total:</span> <strong className="text-green-700">R$ {finalPrice.toFixed(2)}</strong></div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Assinatura Eletrônica — Digite seu nome completo
              </label>
              <p className="text-xs text-gray-500 mb-2">O nome deve ser idêntico a: <strong>{representativeName}</strong></p>
              <input
                type="text"
                value={signature}
                onChange={e => setSignature(e.target.value)}
                placeholder="Digite seu nome completo para assinar"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">
                Declaro que li e aceito todas as cláusulas do contrato acima, incluindo a política de{' '}
                <strong>reembolso em 7 dias</strong> (CDC Art. 49) e as condições do{' '}
                <strong>{loyaltyPlan ? 'Plano de Fidelidade' : 'contrato sem fidelidade'}</strong>.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                ← Voltar
              </button>
              <button
                onClick={handleAccept}
                disabled={!accepted || !signature.trim()}
                className={`flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  accepted && signature.trim()
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Aceitar e Assinar
              </button>
            </div>

            <p className="text-center text-xs text-gray-400">
              Esta assinatura eletrônica tem validade jurídica conforme a Lei nº 14.063/2020 e o MP nº 2.200-2/2001.<br />
              Contratada: WPS Soluções Digitais · Wander Pires Silva Coelho · CPF 036.236.556-35 · Curimatá/PI
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
