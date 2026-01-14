import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-404',
      closeBundle() {
        // Copia 404.html para o dist após o build (GitHub Pages SPA fix)
        try {
          copyFileSync(
            resolve(__dirname, 'public/404.html'),
            resolve(__dirname, 'dist/404.html')
          );
          console.log('✅ 404.html copiado para dist/');
        } catch (error) {
          console.error('⚠️ Erro ao copiar 404.html:', error);
        }
      }
    }
  ],
  base: '/criador-horario-backend/',
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
