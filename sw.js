// Atlas – "offline-only" service worker
// Once installed and cached, the app never relies on the network
// for its own files (HTML/CSS/JS/images).

const CACHE_NAME = 'atlas-offline-v1';

// Everything the app needs to run offline.
// Adjust this list if you add/remove files.
const ASSETS = [
  './programs.html',
  './schedule.html',
  './log.html',
  './tracker.html',
  './history.html',
  './profile.html',
  './settings.html',

  './style.css',
  './functions.js',

  './manifest.webmanifest',
  './icons/atlas-logo.png',
  './icons/icons.svg'
];

// Install: cache all core assets once
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and take control
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: offline-only for same-origin requests
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GETs from our own origin
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (opening the app, changing pages, etc.)
  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    // Always serve the main shell from cache
    event.respondWith(
      caches.match('./programs.html').then(cached => {
        // Fallback to any cached response for this request if needed
        return cached || caches.match(req) || new Response(
          'Offline shell not found in cache.',
          { status: 503, statusText: 'Offline' }
        );
      })
    );
    return;
  }

  // Static assets (CSS, JS, images) – cache only, no network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      // If we don't have it cached, we *do not* try the network,
      // so the app will not break if the server is gone.
      return new Response('Resource not available offline.', {
        status: 404,
        statusText: 'Not cached'
      });
    })
  );
});
