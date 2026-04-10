/**
 * Service Worker para PWA
 * © 2025 Wander Pires Silva Coelho
 */

const CACHE_NAME = 'edusync-pro-v2';
const BASE_PATH = '/criador-horario-backend';
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('⚙️ Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Cache aberto');
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('⚠️ Erro ao adicionar arquivos ao cache:', err);
        });
      })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('⚙️ Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  // Não interceptar requisições de API (cross-origin para o Render)
  const url = new URL(event.request.url);
  const isApiRequest = url.hostname !== self.location.hostname;
  if (isApiRequest) {
    // Para API: sempre rede, sem cache
    event.respondWith(fetch(event.request).catch(() => {
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Cache hit: servir do cache e atualizar em background
        if (cachedResponse) {
          // Atualizar cache em background (stale-while-revalidate)
          fetch(event.request.clone()).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {/* ignora erro de rede no background */});
          return cachedResponse;
        }

        // Sem cache: buscar da rede
        return fetch(event.request.clone()).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        }).catch(() => {
          // Falha de rede sem cache: retorna página offline genérica para navegação
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 503 });
        });
      })
  );
});
