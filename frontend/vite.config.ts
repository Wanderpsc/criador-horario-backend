import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    {
      name: 'copy-404',
      closeBundle() {
        // Copia index.html para 200.html (Surge SPA support)
        try {
          copyFileSync(
            resolve(__dirname, 'dist/index.html'),
            resolve(__dirname, 'dist/200.html')
          );
          console.log('✅ 200.html copiado para dist/ (Surge SPA)');
        } catch (error) {
          console.error('⚠️ Erro ao copiar 200.html:', error);
        }
        
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
        
        // Cria arquivo .nojekyll (GitHub Pages - desabilita Jekyll)
        try {
          writeFileSync(
            resolve(__dirname, 'dist/.nojekyll'),
            ''
          );
          console.log('✅ .nojekyll criado em dist/');
        } catch (error) {
          console.error('⚠️ Erro ao criar .nojekyll:', error);
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
  // Base path dinâmico: GitHub Pages usa subdiretório, Surge.sh serve do root
  base: mode === 'github' ? '/criador-horario-backend/' : '/',
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
