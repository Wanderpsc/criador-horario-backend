/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Componente: botão "Adicionar à Tela Inicial" para links de ponto
 */
import { useState, useEffect } from 'react';
import { Smartphone, Share2, X, Plus, Chrome, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { isEmbeddedMobileBrowser } from '../utils/attendanceDevice';
import {
  BeforeInstallPromptEvent,
  clearCapturedPwaInstallPrompt,
  getCapturedPwaInstallPrompt,
  subscribeToPwaInstallPrompt,
} from '../utils/pwaInstallPrompt';

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

interface Props {
  /** Rótulo do atalho (ex: "Ponto - Prof. João") */
  label?: string;
  /** Contexto exibido nas instruções e no botão de instalação */
  context?: 'attendance' | 'substitute';
}

export default function AddToHomeScreen({ label, context = 'attendance' }: Props) {
  const isSubstitute = context === 'substitute';
  const [platform]         = useState<'ios' | 'android' | 'desktop'>(detectPlatform);
  const [isStandalone]     = useState(isInStandaloneMode);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    getCapturedPwaInstallPrompt
  );
  const [showModal, setShowModal] = useState(false);
  const [installed, setInstalled] = useState(false);
  const rememberDestination = () => {
    try {
      localStorage.setItem(isSubstitute ? 'substitute.pwaDestination' : 'ponto.pwaDestination', window.location.hash);
      return true;
    } catch (error) {
      console.error('Não foi possível salvar o destino personalizado do atalho.', error);
      toast.error('Não foi possível salvar o link neste navegador. Permita o armazenamento antes de criar o atalho.');
      return false;
    }
  };

  useEffect(() => {
    rememberDestination();

    const unsubscribe = subscribeToPwaInstallPrompt(() => {
      setDeferredPrompt(getCapturedPwaInstallPrompt());
    });
    const handleInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [context]);

  // Já instalado como PWA — não precisa mostrar botão
  if (isStandalone) return null;

  const handleAndroidInstall = async () => {
    if (!rememberDestination()) return;
    if (deferredPrompt && !isEmbeddedMobileBrowser()) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') setInstalled(true);
        else setShowModal(true);
      } catch (error) {
        console.error('Não foi possível abrir a confirmação de instalação.', error);
        toast.error('O navegador não abriu a instalação. Siga as instruções para adicionar o atalho.');
        setShowModal(true);
      } finally {
        clearCapturedPwaInstallPrompt();
        setDeferredPrompt(null);
      }
    } else {
      // Navegador não suporta beforeinstallprompt — mostra instruções
      setShowModal(true);
    }
  };

  const shortLabel = label || (isSubstitute ? 'Cadastro de substituto' : 'Ponto');
  const installDescription = isSubstitute
    ? 'Fixar o cadastro de substituto na tela inicial'
    : 'Fixar este ponto na tela inicial do celular';
  const protectedResource = isSubstitute ? 'cadastro' : 'ponto';

  return (
    <>
      {/* ── Instalador fixo e visível no celular ─────────────────── */}
      <button
        type="button"
        onClick={platform === 'ios' || platform === 'desktop'
          ? () => { if (rememberDestination()) setShowModal(true); }
          : handleAndroidInstall}
        className="fixed left-4 right-4 z-40 mx-auto flex max-w-md items-center gap-3
                   rounded-2xl border border-white/30 bg-gradient-to-r from-blue-700 to-indigo-700
                   px-4 py-3 text-left text-white shadow-2xl shadow-blue-950/30
                   hover:from-blue-800 hover:to-indigo-800 active:scale-[0.98]
                   transition-all duration-150 select-none"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        title={isSubstitute ? 'Criar atalho para este link na tela inicial' : `Instalar atalho de ${protectedResource} no celular`}
      >
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
          {isSubstitute
            ? <img src="/substitute-icon.svg" alt="" className="h-11 w-11 rounded-xl" />
            : <Smartphone className="h-6 w-6 text-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            {installed ? 'Instalação iniciada' : isSubstitute ? 'Criar atalho deste link' : 'Instalar aplicativo'}
          </span>
          <span className="block text-xs text-blue-100">{installed ? 'Ícone não apareceu? Toque para instalar de novo' : installDescription}</span>
        </span>
        <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-blue-700">
          {installed ? 'De novo' : isSubstitute ? 'Atalho' : 'Instalar'}
        </span>
      </button>

      {/* ── Modal de instruções ───────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm mx-0 sm:mx-4 p-5 shadow-2xl
                       max-h-[calc(100dvh-1rem)] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-800">
                  {isSubstitute ? 'Criar atalho para este link' : 'Salvar atalho na tela inicial'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {installed && (
              <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                Se o ícone ainda não apareceu na tela inicial, siga os passos abaixo para
                instalar de novo.
              </div>
            )}
            {isSubstitute && (
              <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                <strong>Abrir ou copiar o link não instala o ícone.</strong> Confirme a opção
                de adicionar à tela inicial no navegador. O ícone verde abre diretamente
                este link de substituição.
              </div>
            )}
            {isEmbeddedMobileBrowser() && (
              <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Abra este mesmo link no {platform === 'ios' ? 'Safari' : 'Chrome'}, fora
                do WhatsApp ou de outro aplicativo, para adicionar o ícone à tela inicial.
              </div>
            )}

            <div className="mb-4 bg-emerald-50 text-emerald-900 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold mb-1">
                  {isSubstitute ? 'Link da sua escola' : 'Instalação protegida neste aparelho'}
                </p>
                <p className="text-[11px]">
                  {isSubstitute
                    ? 'Este link é de uso da sua escola. Não compartilhe com pessoas não autorizadas.'
                    : 'Este ponto é pessoal. Não copie nem compartilhe o link com outro celular.'}
                </p>
              </div>
            </div>

            {/* Instruções por plataforma */}
            {platform === 'ios' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  <strong>No iPhone a instalação não é automática.</strong> Esta janela mostra os passos
                  exigidos pela Apple. Execute-os no Safari para criar o ícone.
                </div>
                <p className="text-sm font-semibold text-gray-700 text-center">
                  No iPhone / iPad (Safari):
                </p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">1</span>
                    <span className="text-sm text-gray-600">
                      Toque no ícone de <strong>Compartilhar</strong> (
                      <Share2 className="inline w-3.5 h-3.5 text-blue-600" />
                      ) na barra inferior do Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">2</span>
                    <span className="text-sm text-gray-600">
                      Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (
                      <Plus className="inline w-3.5 h-3.5" />
                      )
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">3</span>
                    <span className="text-sm text-gray-600">
                      Confirme o nome <strong>"{shortLabel}"</strong> e toque em <strong>Adicionar</strong>
                    </span>
                  </li>
                </ol>
                <p className="text-xs text-gray-500 text-center">
                  Depois disso, feche o Safari e abra o {protectedResource} pelo novo ícone na tela inicial.
                </p>
              </div>
            )}

            {platform === 'android' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 text-center">
                  No Android (Chrome):
                </p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">1</span>
                    <span className="text-sm text-gray-600">
                      Toque nos <strong>3 pontos</strong> (⋮) no canto superior direito do Chrome
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">2</span>
                    <span className="text-sm text-gray-600">
                      Toque em <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">3</span>
                    <span className="text-sm text-gray-600">
                      Confirme e toque em <strong>Adicionar</strong>
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {platform === 'desktop' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 text-center">
                  No computador (Chrome / Edge):
                </p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">1</span>
                    <span className="text-sm text-gray-600">
                      Clique no ícone <Chrome className="inline w-3.5 h-3.5" /> na barra de endereço ou no menu (⋮)
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">2</span>
                    <span className="text-sm text-gray-600">
                      Selecione <strong>"Instalar {isSubstitute ? 'Substituição de Professor' : 'EduSync-PRO'}"</strong> ou <strong>"Criar atalho…"</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">3</span>
                    <span className="text-sm text-gray-600">
                      Marque <strong>"Abrir como janela"</strong> e confirme
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Fechar instruções
            </button>
          </div>
        </div>
      )}
    </>
  );
}
