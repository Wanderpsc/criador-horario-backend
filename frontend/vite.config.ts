import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
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
        
        // Copia arquivos PWA para o dist
        const pwaFiles = ['manifest.json', 'sw.js', 'icon.svg', 'icon-192.svg', 'icon-512.svg'];
        pwaFiles.forEach(file => {
          try {
            copyFileSync(
              resolve(__dirname, `public/${file}`),
              resolve(__dirname, `dist/${file}`)
            );
            console.log(`✅ ${file} copiado para dist/`);
          } catch (error) {
            console.error(`⚠️ Erro ao copiar ${file}:`, error);
          }
        });
      }
    }
  ],
  // Base path vazio - usar caminhos relativos
  base: './',
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
}));
