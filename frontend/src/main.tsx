/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import App from './App';
import { useAuthStore } from './store/authStore';
import { initializePwaInstallPromptCapture } from './utils/pwaInstallPrompt';
import './index.css';

console.log('🚀 Main.tsx carregado!');

initializePwaInstallPromptCapture();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .catch(error => console.error('Não foi possível ativar a instalação do aplicativo.', error));
  });
}

// ── Restauração do destino dos aplicativos instalados ───────────────────────
// O app instalado abre em /?app=ponto ou /?shortcut=substitute (sem hash).
// O destino real vem no parâmetro "dest" (gravado no manifest na instalação,
// caso do iPhone) ou do último link aberto salvo no localStorage (Android).
const startupSearch = new URLSearchParams(window.location.search);
const isSubstituteShortcut = startupSearch.get('shortcut') === 'substitute';
const isPontoShortcut = startupSearch.get('app') === 'ponto';
let missingShortcutDestination: 'ponto' | 'substitute' | null = null;
try {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
  const dest = startupSearch.get('dest');
  if (!window.location.hash && dest?.startsWith('#/')) {
    window.location.hash = dest;
  } else if (isSubstituteShortcut && !window.location.hash) {
    const destination = localStorage.getItem('substitute.pwaDestination');
    if (destination?.startsWith('#/substitute/')) window.location.hash = destination;
    else missingShortcutDestination = 'substitute';
  } else if (isPontoShortcut && !window.location.hash) {
    const destination = localStorage.getItem('ponto.pwaDestination');
    if (destination?.startsWith('#/ponto')) window.location.hash = destination;
    else missingShortcutDestination = 'ponto';
  } else if (isStandalone && !window.location.hash) {
    // Instalações antigas (manifest sem start_url próprio)
    const destination = localStorage.getItem('ponto.pwaDestination');
    if (destination?.startsWith('#/ponto')) window.location.hash = destination;
  }
} catch (error) {
  if (!window.location.hash) {
    missingShortcutDestination = isSubstituteShortcut ? 'substitute' : isPontoShortcut ? 'ponto' : null;
  }
  console.error('Não foi possível restaurar o destino personalizado do atalho.', error);
  toast.error('Não foi possível recuperar o link salvo. Abra novamente o link enviado pela escola.');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Fallback de segurança: se localStorage estiver bloqueado (ex: TV box, browsers antigos)
// o Zustand persist pode nunca chamar onRehydrateStorage com state válido.
// Forçamos isHydrated = true após 500ms para não deixar o app preso em "Carregando..."
setTimeout(() => {
  if (!useAuthStore.getState().isHydrated) {
    console.warn('⏱️ Forçando isHydrated=true por timeout (localStorage possivelmente bloqueado)');
    useAuthStore.setState({ isHydrated: true });
  }
}, 500);

console.log('✅ QueryClient criado');

try {
  const root = document.getElementById('root');
  console.log('📍 Root element:', root);
  
  if (!root) {
    throw new Error('Root element not found!');
  }
  
  console.log('🎨 Iniciando renderização...');
  
  const isSubstituteScreen = missingShortcutDestination === 'substitute';
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        {missingShortcutDestination ? (
          <div className={'min-h-screen flex items-center justify-center p-6 ' + (isSubstituteScreen ? 'bg-emerald-50' : 'bg-blue-50')}>
            <div className="max-w-md rounded-2xl bg-white p-6 shadow text-center">
              <img
                src={isSubstituteScreen ? '/substitute-icon.svg' : '/icon-192.png'}
                alt=""
                className="mx-auto mb-4 h-20 w-20 rounded-2xl"
              />
              <h1 className={'text-xl font-bold ' + (isSubstituteScreen ? 'text-emerald-900' : 'text-blue-900')}>
                {isSubstituteScreen ? 'Abra o link de substituição' : 'Abra o link do ponto'}
              </h1>
              <p className="mt-3 text-gray-700">
                {isSubstituteScreen
                  ? 'O link não está disponível neste navegador. Abra novamente o link enviado pela escola e crie o atalho no mesmo navegador.'
                  : 'O link não está disponível neste aparelho. Abra novamente o link do ponto enviado pela escola e instale o aplicativo de novo.'}
              </p>
            </div>
          </div>
        ) : <App />}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </React.StrictMode>
  );
  
  console.log('✅ React renderizado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao renderizar:', error);
}
