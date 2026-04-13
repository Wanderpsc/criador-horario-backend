/**
 * Sistema Criador de Horário de Aula Escolar
 * © 2025 Wander Pires Silva Coelho
 * E-mail: wanderpsc@gmail.com
 * Todos os direitos reservados.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { useAuthStore } from './store/authStore';
import './index.css';

console.log('🚀 Main.tsx carregado!');

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
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </React.StrictMode>
  );
  
  console.log('✅ React renderizado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao renderizar:', error);
}
