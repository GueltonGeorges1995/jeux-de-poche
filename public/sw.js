const CACHE_NAME = 'jeux-de-poche-v2';
const APP_FILES = [
  './index.html',
  './manifest.webmanifest',
  './assets/css/dashboard.css',
  './assets/css/mobile.css',
  './assets/js/dashboard.js',
  './assets/js/local-stats.js',
  './assets/js/pwa.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './games/memory/',
  './games/memory/index.html',
  './games/memory/style.css',
  './games/memory/game.js',
  './games/snake/',
  './games/snake/index.html',
  './games/snake/style.css',
  './games/snake/game.js',
  './games/2048/',
  './games/2048/index.html',
  './games/2048/style.css',
  './games/2048/game.js',
  './games/solitaire/',
  './games/solitaire/index.html',
  './games/solitaire/style.css',
  './games/solitaire/game.js',
  './games/tic-tac-toe/',
  './games/tic-tac-toe/index.html',
  './games/tic-tac-toe/style.css',
  './games/tic-tac-toe/local.css',
  './games/tic-tac-toe/game.js',
  './games/connect-four/',
  './games/connect-four/index.html',
  './games/connect-four/style.css',
  './games/connect-four/game.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('jeux-de-poche-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (!response.ok) return response;
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        } catch (error) {
          console.error('Impossible de mettre à jour le cache hors ligne :', error);
        }
        return response;
      })
      .catch(async (error) => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            const homePage = await cache.match(new URL('./index.html', self.registration.scope).href);
            if (homePage) return homePage;
          }
        } catch (cacheError) {
          console.error('Impossible de lire le cache hors ligne :', cacheError);
        }
        console.error('Ressource indisponible hors ligne :', event.request.url, error);
        return Response.error();
      }),
  );
});
