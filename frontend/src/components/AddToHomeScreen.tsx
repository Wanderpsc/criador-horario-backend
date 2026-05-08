/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * Componente: botão "Adicionar à Tela Inicial" para links de ponto
 */
import { useState, useEffect } from 'react';
import { Smartphone, Share2, X, Plus, Chrome, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [installed, setInstalled] = useState(false);
  const currentUrl = window.location.href;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Já instalado como PWA — não precisa mostrar botão
  if (isStandalone || installed) return null;

  const handleAndroidInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    } else {
      // Navegador não suporta beforeinstallprompt — mostra instruções
      setShowModal(true);
    }
  };

  const shortLabel = label || 'Ponto';

  return (
    <>
      {/* ── Botão fixo (canto inferior direito) ──────────────────── */}
      <button
        type="button"
        onClick={platform === 'ios' || platform === 'desktop' ? () => setShowModal(true) : handleAndroidInstall}
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2
                   bg-white border border-gray-200 text-gray-700 text-xs font-semibold
                   px-3 py-2 rounded-2xl shadow-lg hover:shadow-xl
                   active:scale-95 transition-all duration-150 select-none"
        title="Salvar atalho na tela inicial"
      >
        <Smartphone className="w-4 h-4 flex-shrink-0 text-indigo-600" />
        <span>Salvar atalho</span>
      </button>

      {/* ── Modal de instruções ───────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm mx-0 sm:mx-4 p-5 shadow-2xl"
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

            {/* QR Code */}
            <div className="flex flex-col items-center mb-4 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-2">
                Escaneie para abrir em outro dispositivo:
              </p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(currentUrl)}&size=140x140&margin=4`}
                alt="QR Code do link de ponto"
                className="w-36 h-36 rounded-lg border border-gray-200"
              />
            </div>

            {/* Instruções por plataforma */}
            {platform === 'ios' && (
              <div className="space-y-3">
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

            {/* Copiar link */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(currentUrl).then(() => {
                  alert('Link copiado! Cole no navegador do celular do professor.');
                });
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 border border-gray-300
                         rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <Monitor className="w-4 h-4" />
              Copiar link para compartilhar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
