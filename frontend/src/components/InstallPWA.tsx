/**
 * Componente de Instalação PWA
 * © 2025 Wander Pires Silva Coelho
 */

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listener para o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('📱 PWA: beforeinstallprompt disparado');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Verificar se o usuário já dispensou o banner antes
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedDate = dismissed ? new Date(dismissed) : null;
      const daysSinceDismissed = dismissedDate 
        ? Math.floor((Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      // Mostrar banner se nunca foi dispensado ou se foi há mais de 7 dias
      if (!dismissed || daysSinceDismissed > 7) {
        setShowInstallBanner(true);
      }
    };

    // Listener para quando o app é instalado
    const handleAppInstalled = () => {
      console.log('✅ PWA: App instalado com sucesso');
      setShowInstallBanner(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('⚠️ PWA: Prompt não disponível');
      return;
    }

    console.log('📱 PWA: Mostrando prompt de instalação');
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`📱 PWA: Escolha do usuário: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ PWA: Usuário aceitou instalar');
    } else {
      console.log('❌ PWA: Usuário recusou instalar');
    }

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    console.log('🚫 PWA: Banner dispensado pelo usuário');
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (isInstalled || !showInstallBanner) {
    return null;
  }

  return (
    <>
      {/* Banner de Instalação - Desktop */}
      <div className="hidden md:block fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-2xl">
            📅
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Instalar EduSync-PRO
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Instale o app para acesso rápido e use offline!
            </p>
            
            <div className="flex space-x-2">
              <button
                onClick={handleInstallClick}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Download size={16} />
                <span>Instalar</span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <span>⚡</span>
              <span>Rápido</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>📱</span>
              <span>Offline</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🔔</span>
              <span>Notificações</span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Instalação - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 shadow-2xl p-4 z-50 animate-slide-up">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-2xl">
            📅
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">
              Instalar EduSync-PRO
            </h3>
            <p className="text-xs text-gray-600">
              Acesso rápido e uso offline
            </p>
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Download size={20} />
          <span>Instalar Aplicativo</span>
        </button>

        <button
          onClick={handleDismiss}
          className="w-full mt-2 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
        >
          Agora não
        </button>
      </div>
    </>
  );
}
