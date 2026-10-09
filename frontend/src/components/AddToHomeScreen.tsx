/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Componente: botão "Adicionar à Tela Inicial" para links de ponto
 */
import { useState, useEffect } from 'react';
import { Smartphone, Share2, X, Plus, Chrome, ShieldCheck } from 'lucide-react';
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
}

export default function AddToHomeScreen({ label }: Props) {
  const [platform]         = useState<'ios' | 'android' | 'desktop'>(detectPlatform);
  const [isStandalone]     = useState(isInStandaloneMode);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    getCapturedPwaInstallPrompt
  );
  const [showModal, setShowModal] = useState(false);
  const [installed, setInstalled] = useState(false);
  const rememberDestination = () => {
    try {
      localStorage.setItem('ponto.pwaDestination', window.location.hash);
    } catch (error) {
      console.warn('Não foi possível salvar o destino personalizado do ponto.', error);
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
  }, []);

  // Já instalado como PWA — não precisa mostrar botão
  if (isStandalone || installed) return null;

  const handleAndroidInstall = async () => {
    rememberDestination();
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      clearCapturedPwaInstallPrompt();
      setDeferredPrompt(null);
    } else {
      // Navegador não suporta beforeinstallprompt — mostra instruções
      setShowModal(true);
    }
  };

  const shortLabel = label || 'Ponto';

  return (
    <>
      {/* ── Instalador fixo e visível no celular ─────────────────── */}
      <button
        type="button"
        onClick={platform === 'ios' || platform === 'desktop' ? () => { rememberDestination(); setShowModal(true); } : handleAndroidInstall}
        className="fixed left-4 right-4 z-40 mx-auto flex max-w-md items-center gap-3
                   rounded-2xl border border-white/30 bg-gradient-to-r from-blue-700 to-indigo-700
                   px-4 py-3 text-left text-white shadow-2xl shadow-blue-950/30
                   hover:from-blue-800 hover:to-indigo-800 active:scale-[0.98]
                   transition-all duration-150 select-none"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        title="Instalar aplicativo de ponto no celular"
      >
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Smartphone className="h-6 w-6 text-white" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Instalar aplicativo</span>
          <span className="block text-xs text-blue-100">Fixar este ponto na tela inicial do celular</span>
        </span>
        <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-blue-700">
          Instalar
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
                <h3 className="font-bold text-gray-800">Salvar atalho na tela inicial</h3>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4 bg-emerald-50 text-emerald-900 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold mb-1">Instalação protegida neste aparelho</p>
                <p className="text-[11px]">
                  Este ponto é pessoal. Não copie nem compartilhe o link com outro celular.
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
                  Depois disso, feche o Safari e abra o ponto pelo novo ícone na tela inicial.
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
                      Toque em <strong>"Adicionar à tela inicial"</strong>
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
                      Selecione <strong>"Instalar EduSync-PRO"</strong> ou <strong>"Criar atalho…"</strong>
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
