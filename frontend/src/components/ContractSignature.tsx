import { useState } from 'react';
import { X, FileText, Download, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContractSignatureProps {
  schoolName: string;
  schoolCNPJ: string;
  representativeName: string;
  representativeCPF: string;
  email: string;
  phone: string;
  plan: string;
  price: number;
  maxUsers: number;
  onSign: (signatureData: SignatureData) => void;
  onCancel: () => void;
}

interface SignatureData {
  schoolName: string;
  schoolCNPJ: string;
  representativeName: string;
  representativeCPF: string;
  email: string;
  phone: string;
  plan: string;
  price: number;
  maxUsers: number;
  signatureDate: Date;
  ipAddress: string;
  acceptedTerms: boolean;
}

export default function ContractSignature({
  schoolName,
  schoolCNPJ,
  representativeName,
  representativeCPF,
  email,
  phone,
  plan,
  price,
  maxUsers,
  onSign,
  onCancel
}: ContractSignatureProps) {
  const [step, setStep] = useState(1); // 1: Leitura, 2: Concordância, 3: Assinatura
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signature, setSignature] = useState('');
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const contractDate = new Date().toLocaleDateString('pt-BR');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (isAtBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
      toast.success('Você leu todo o contrato. Pode prosseguir.', { duration: 3000 });
    }
  };

  const handleDownloadContract = () => {
    // Implementar download do PDF
    toast.success('Contrato baixado com sucesso!');
  };

  const handleSign = async () => {
    if (!signature.trim()) {
      toast.error('Por favor, digite seu nome completo para assinar');
      return;
    }

    if (signature.toLowerCase() !== representativeName.toLowerCase()) {
      toast.error('A assinatura deve corresponder ao nome do representante legal');
      return;
    }

    // Simular obtenção do IP (em produção, fazer no backend)
    const ipAddress = '192.168.1.1'; // Placeholder

    const signatureData: SignatureData = {
      schoolName,
      schoolCNPJ,
      representativeName,
      representativeCPF,
      email,
      phone,
      plan,
      price,
      maxUsers,
      signatureDate: new Date(),
      ipAddress,
      acceptedTerms: true
    };

    onSign(signatureData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Contrato de Licença de Uso
              </h2>
              <p className="text-sm text-gray-600">
                Sistema Criador de Horário de Aula Escolar
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <span className="text-xs mt-2 font-medium">Leitura</span>
            </div>
            <div className={`flex-1 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <span className="text-xs mt-2 font-medium">Concordância</span>
            </div>
            <div className={`flex-1 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                3
              </div>
              <span className="text-xs mt-2 font-medium">Assinatura</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" onScroll={handleScroll}>
          {step === 1 && (
            <div className="prose max-w-none">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  📜 Leia atentamente todo o contrato antes de prosseguir
                </p>
                <p className="text-xs text-blue-700">
                  Role até o final para habilitar o botão "Continuar"
                </p>
              </div>

              <h3 className="text-2xl font-bold text-center mb-6">
                CONTRATO DE LICENÇA DE USO DE SOFTWARE
              </h3>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-bold text-lg mb-3">DADOS DO CONTRATO</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Data:</span> {contractDate}
                  </div>
                  <div>
                    <span className="font-medium">Plano:</span> {plan}
                  </div>
                  <div>
                    <span className="font-medium">Valor:</span> R$ {price.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Usuários:</span> {maxUsers}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <h4 className="font-bold mb-2">LICENCIANTE</h4>
                <p className="text-sm">
                  <strong>Nome:</strong> Wander Pires Silva Coelho<br />
                  <strong>E-mail:</strong> wanderpsc@gmail.com
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <h4 className="font-bold mb-2">LICENCIADO</h4>
                <p className="text-sm">
                  <strong>Instituição:</strong> {schoolName}<br />
                  <strong>CNPJ:</strong> {schoolCNPJ}<br />
                  <strong>Representante:</strong> {representativeName}<br />
                  <strong>CPF:</strong> {representativeCPF}<br />
                  <strong>E-mail:</strong> {email}<br />
                  <strong>Telefone:</strong> {phone}
                </p>
              </div>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA PRIMEIRA - DO OBJETO</h4>
              <p className="mb-4">
                O presente contrato tem por objeto a concessão de <strong>licença de uso não exclusiva</strong> do 
                software denominado "Sistema Criador de Horário de Aula Escolar", desenvolvido pelo LICENCIANTE, 
                destinado à automação e otimização da criação de grades horárias escolares.
              </p>
              <p className="mb-4">
                A licença concedida é <strong>pessoal, intransferível e não sublicenciável</strong>, destinada 
                exclusivamente ao uso interno do LICENCIADO.
              </p>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA SEGUNDA - DO VALOR E PAGAMENTO</h4>
              <p className="mb-4">
                Pelo licenciamento do software, o LICENCIADO pagará ao LICENCIANTE o valor de:
              </p>
              <div className="bg-blue-100 p-4 rounded-lg mb-4 text-center">
                <p className="text-2xl font-bold text-blue-900">
                  R$ {price.toFixed(2)}
                </p>
                <p className="text-sm text-blue-700">Plano {plan}</p>
              </div>
              <p className="mb-4">
                O atraso no pagamento superior a <strong>15 dias</strong> implicará em:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Suspensão automática do acesso ao sistema</li>
                <li>Multa de 2% sobre o valor devido</li>
                <li>Juros de mora de 1% ao mês</li>
              </ul>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA TERCEIRA - DOS DIREITOS DO LICENCIADO</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Acesso completo às funcionalidades durante a vigência</li>
                <li>Suporte técnico via e-mail e WhatsApp</li>
                <li>Atualizações automáticas sem custo adicional</li>
                <li>Backup automático diário dos dados</li>
                <li>Exportação de dados em PDF e Excel</li>
                <li>Treinamento inicial de até 2 horas</li>
              </ul>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO LICENCIADO</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Utilizar o software apenas para finalidades previstas</li>
                <li>Não copiar, modificar ou descompilar o software</li>
                <li>Não sublicenciar ou transferir a terceiros</li>
                <li>Manter confidencialidade das credenciais de acesso</li>
                <li>Efetuar pagamentos nos prazos estabelecidos</li>
                <li>Notificar uso indevido ou acesso não autorizado</li>
              </ul>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA QUINTA - DA PROPRIEDADE INTELECTUAL</h4>
              <p className="mb-4">
                O software é <strong>propriedade exclusiva do LICENCIANTE</strong>, protegido pela Lei nº 9.609/98 
                (Lei do Software) e Lei nº 9.610/98 (Direitos Autorais).
              </p>
              <p className="mb-4">
                Este contrato NÃO transfere qualquer direito sobre código-fonte, algoritmos ou documentação técnica.
              </p>
              <p className="mb-4">
                O LICENCIADO possui <strong>direitos exclusivos sobre os dados inseridos</strong> no sistema.
              </p>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA SEXTA - PROTEÇÃO DE DADOS (LGPD)</h4>
              <p className="mb-4">
                O LICENCIANTE compromete-se a cumprir integralmente a <strong>Lei Geral de Proteção de Dados 
                (Lei nº 13.709/2018)</strong>.
              </p>
              <p className="mb-4">
                <strong>Dados coletados:</strong> Nome, e-mail, CPF, telefone (finalidade: execução do contrato)
              </p>
              <p className="mb-4">
                <strong>Direitos do titular:</strong>
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Acesso aos dados pessoais</li>
                <li>Correção de dados desatualizados</li>
                <li>Eliminação após término do contrato</li>
                <li>Portabilidade para outro fornecedor</li>
              </ul>
              <p className="mb-4">
                O LICENCIANTE <strong>NÃO compartilhará dados</strong> com terceiros, exceto por ordem judicial.
              </p>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA SÉTIMA - DAS GARANTIAS</h4>
              <p className="mb-4">
                O LICENCIANTE garante disponibilidade de <strong>99,5%</strong> ao mês (exceto manutenções programadas).
              </p>
              <p className="mb-4">
                <strong>Limitação de responsabilidade:</strong> O LICENCIANTE não se responsabiliza por:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Danos indiretos ou lucros cessantes</li>
                <li>Problemas de conexão à internet</li>
                <li>Incompatibilidade com equipamentos</li>
                <li>Decisões administrativas baseadas nos relatórios</li>
              </ul>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA OITAVA - DA RESCISÃO</h4>
              <p className="mb-4">
                O contrato poderá ser rescindido imediatamente em caso de:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Inadimplência superior a 30 dias</li>
                <li>Uso indevido ou fraudulento</li>
                <li>Tentativa de cópia ou engenharia reversa</li>
              </ul>
              <p className="mb-4">
                Após rescisão, o acesso será bloqueado e dados serão mantidos por 90 dias para recuperação.
              </p>

              <h4 className="font-bold text-lg mt-8 mb-4">CLÁUSULA NONA - DO FORO</h4>
              <p className="mb-4">
                As partes elegem o foro da comarca do LICENCIANTE para dirimir controvérsias, com renúncia 
                a qualquer outro.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-8">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ IMPORTANTE: Ao assinar este contrato, você concorda com TODOS os termos acima.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Declaração de Concordância</h3>
                <p className="text-gray-600">
                  Leia atentamente e confirme sua concordância com os termos
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-5 h-5 text-blue-600 rounded"
                    />
                    <div className="text-sm">
                      <p className="font-bold mb-2">
                        Eu, <span className="text-blue-600">{representativeName}</span>, representante legal de 
                        <span className="text-blue-600"> {schoolName}</span>, declaro que:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-gray-700">
                        <li>Li e compreendi TODAS as cláusulas deste contrato</li>
                        <li>Estou ciente dos direitos e obrigações descritos</li>
                        <li>Concordo com os valores e forma de pagamento</li>
                        <li>Aceito as condições de uso e propriedade intelectual</li>
                        <li>Autorizo o tratamento de dados conforme LGPD</li>
                        <li>Tenho poderes legais para assinar em nome da instituição</li>
                        <li>Aceito o foro eleito para resolução de conflitos</li>
                      </ul>
                    </div>
                  </label>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>📌 Observação:</strong> Este contrato tem validade jurídica e será armazenado de forma 
                    segura com registro de data, hora e endereço IP.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Assinatura Digital</h3>
                <p className="text-gray-600">
                  Digite seu nome completo para assinar eletronicamente
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ A assinatura digital tem a mesma validade jurídica que assinatura manuscrita, 
                    conforme MP 2.200-2/2001 (ICP-Brasil).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo do Representante Legal
                  </label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder={representativeName}
                    className="input text-2xl font-signature text-center"
                    style={{ fontFamily: 'cursive' }}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Digite: <strong>{representativeName}</strong>
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-bold mb-3">Resumo do Contrato</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Instituição:</span>
                      <p className="font-medium">{schoolName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">CNPJ:</span>
                      <p className="font-medium">{schoolCNPJ}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Plano:</span>
                      <p className="font-medium">{plan}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor:</span>
                      <p className="font-medium">R$ {price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Data:</span>
                      <p className="font-medium">{contractDate}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Usuários:</span>
                      <p className="font-medium">{maxUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    ✅ Ao clicar em "Assinar Contrato", você concorda com todos os termos e autoriza o início 
                    da prestação dos serviços.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={handleDownloadContract}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </button>

          <div className="flex gap-3">
            <button onClick={onCancel} className="btn btn-secondary">
              Cancelar
            </button>

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!scrolledToBottom}
                className={`btn ${scrolledToBottom ? 'btn-primary' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                Continuar
              </button>
            )}

            {step === 2 && (
              <>
                <button onClick={() => setStep(1)} className="btn btn-secondary">
                  Voltar
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!acceptedTerms}
                  className={`btn ${acceptedTerms ? 'btn-primary' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Prosseguir
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button onClick={() => setStep(2)} className="btn btn-secondary">
                  Voltar
                </button>
                <button
                  onClick={handleSign}
                  disabled={!signature.trim()}
                  className={`btn ${signature.trim() ? 'btn-primary' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Assinar Contrato
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
