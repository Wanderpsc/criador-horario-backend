/**
 * Componente de Aceite de Termos de Uso
 * © 2025-2026 Wander Pires Silva Coelho
 */

import React, { useState } from 'react';
import { Shield, FileText, Lock, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface TermsModalProps {
  onAccept: () => void;
  onReject: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onAccept, onReject }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [copyrightAccepted, setCopyrightAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!termsAccepted || !privacyAccepted || !copyrightAccepted) {
      toast.error('Você precisa aceitar todos os termos para continuar');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/accept-terms', {
        termsVersion: '1.0',
        privacyVersion: '1.0',
        copyrightAcknowledged: true
      });
      
      toast.success('Termos aceitos com sucesso!');
      onAccept();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao aceitar termos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" />
            <h1 className="text-2xl font-bold">EduSync-PRO</h1>
          </div>
          <p className="text-blue-100">Sistema Criador de Horário de Aula Escolar</p>
          <p className="text-sm text-blue-200 mt-2">© 2025-2026 Wander Pires Silva Coelho</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Copyright Warning */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">⚠️ AVISO LEGAL IMPORTANTE</h3>
                <p className="text-sm text-red-800">
                  Este software é <strong>PROPRIEDADE EXCLUSIVA</strong> de <strong>Wander Pires Silva Coelho</strong> e está protegido por múltiplas camadas de segurança técnica e legal.
                </p>
                <p className="text-sm text-red-800 mt-2">
                  <strong>CÓPIA, REPRODUÇÃO, DISTRIBUIÇÃO, MODIFICAÇÃO OU ENGENHARIA REVERSA NÃO AUTORIZADAS CONSTITUEM CRIMES</strong> previstos nas Leis 9.609/98, 9.610/98 e Código Penal Brasileiro.
                </p>
              </div>
            </div>
          </div>

          {/* Protections Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Proteções Ativas
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div>✅ Criptografia AES-256</div>
              <div>✅ Assinatura Digital</div>
              <div>✅ Watermarking em Documentos</div>
              <div>✅ Sistema Anti-Debugging</div>
              <div>✅ Detecção de Violações</div>
              <div>✅ Logs de Auditoria (5 anos)</div>
              <div>✅ Rastreamento de Uso</div>
              <div>✅ Monitoramento 24/7</div>
            </div>
          </div>

          {/* Terms Sections */}
          <div className="space-y-4">
            
            {/* Terms of Use */}
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold">Termos de Uso e Licença</h3>
              </div>
              <div className="text-sm text-gray-700 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
                <p className="mb-2"><strong>1. PROPRIEDADE INTELECTUAL:</strong> O software EduSync-PRO é propriedade exclusiva de Wander Pires Silva Coelho.</p>
                <p className="mb-2"><strong>2. LICENÇA:</strong> Concedida de forma não exclusiva, não transferível e revogável.</p>
                <p className="mb-2"><strong>3. PROIBIÇÕES:</strong> É expressamente proibido copiar, modificar, realizar engenharia reversa, sublicenciar ou burlar proteções.</p>
                <p className="mb-2"><strong>4. PENALIDADES:</strong> Violações resultarão em ações legais civis e criminais, com indenizações a partir de R$ 50.000,00.</p>
                <p className="mb-2"><strong>5. RASTREAMENTO:</strong> Todas as ações são registradas e mantidas por 5 anos como prova judicial.</p>
              </div>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  Li e aceito os <a href="/TERMOS_DE_USO.md" target="_blank" className="text-blue-600 underline">Termos de Uso completos</a>
                </span>
              </label>
            </div>

            {/* Privacy Policy */}
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-600" />
                <h3 className="font-bold">Política de Privacidade (LGPD)</h3>
              </div>
              <div className="text-sm text-gray-700 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
                <p className="mb-2"><strong>Dados Coletados:</strong> Nome, email, telefone, dados da instituição, dados operacionais e logs de uso.</p>
                <p className="mb-2"><strong>Finalidade:</strong> Operação do sistema, suporte técnico, segurança e cumprimento de obrigações legais.</p>
                <p className="mb-2"><strong>Compartilhamento:</strong> Dados NÃO são vendidos ou compartilhados, exceto com prestadores essenciais sob DPA.</p>
                <p className="mb-2"><strong>Segurança:</strong> Criptografia TLS/SSL, backups diários, acesso restrito e auditoria completa.</p>
                <p className="mb-2"><strong>Seus Direitos:</strong> Acesso, correção, exclusão, portabilidade e revogação de consentimento.</p>
              </div>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  Li e aceito a <a href="/POLITICA_PRIVACIDADE.md" target="_blank" className="text-blue-600 underline">Política de Privacidade completa</a>
                </span>
              </label>
            </div>

            {/* Copyright Acknowledgment */}
            <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
              <h3 className="font-bold text-red-900 mb-2">DECLARAÇÃO DE CIÊNCIA DE DIREITOS AUTORAIS</h3>
              <div className="text-sm text-red-800 space-y-2">
                <p>Eu, ao marcar esta caixa, DECLARO ESTAR CIENTE que:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>O software é <strong>PROPRIEDADE EXCLUSIVA</strong> de Wander Pires Silva Coelho</li>
                  <li>Qualquer uso não autorizado é <strong>CRIME</strong> previsto em lei</li>
                  <li>Tentativas de cópia ou engenharia reversa são <strong>RASTREADAS</strong></li>
                  <li>Violações resultarão em <strong>AÇÕES LEGAIS CIVIS E CRIMINAIS</strong></li>
                  <li>Indenizações podem chegar a <strong>DEZENAS DE MILHARES DE REAIS</strong></li>
                  <li>O sistema possui <strong>PROTEÇÕES TÉCNICAS ATIVAS</strong></li>
                  <li>Todos os documentos gerados possuem <strong>WATERMARK</strong> digital</li>
                  <li>Logs de uso são <strong>MANTIDOS POR 5 ANOS</strong></li>
                </ul>
                <p className="mt-3 font-bold">
                  Este aceite tem VALIDADE JURÍDICA e será usado como prova em caso de violações.
                </p>
              </div>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyrightAccepted}
                  onChange={(e) => setCopyrightAccepted(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold text-red-900">
                  DECLARO TER LIDO E COMPREENDIDO os avisos de direitos autorais acima
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={onReject}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold disabled:opacity-50"
            >
              Rejeitar e Sair
            </button>
            <button
              onClick={handleAccept}
              disabled={!termsAccepted || !privacyAccepted || !copyrightAccepted || loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : 'Aceitar e Continuar'}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t">
            <p>© 2025-2026 Wander Pires Silva Coelho - Todos os direitos reservados</p>
            <p className="mt-1">EduSync-PRO® - Sistema Criador de Horário de Aula Escolar</p>
            <p className="mt-1">Versão dos Termos: 1.0 | Janeiro de 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};
