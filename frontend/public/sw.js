/**
 * sw.js - EssenShare Service Worker
 * 
 * Rules:
 * - Cache app shell, static assets, logos, and icons.
 * - NEVER cache dynamic food inventory (/api/v1/donations*, /api/v1/pickups*).
 *   Showing stale inventory risks sending hungry people to collect food that is gone.
 * - Provide graceful offline navigation fallback (/offline).
 */

const CACHE_NAME = 'essenshare-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.svg',
  '/essenshare_favicon.ico',
  '/essenshare_logo_transparent.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg',
];

// Install: pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal asset issue:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first or cache-first depending on resource
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never cache food inventory or pickups or authentication API calls
  if (
    url.pathname.startsWith('/api/v1/donations') ||
    url.pathname.startsWith('/api/v1/pickups') ||
    url.pathname.startsWith('/api/v1/auth') ||
    url.pathname.startsWith('/api/v1/reports') ||
    url.pathname.startsWith('/api/v1/admin')
  ) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'OFFLINE',
            message: 'You are currently offline. Please reconnect to check real-time surplus inventory.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 2. Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone and cache for offline reading of informational pages
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Cache about, privacy, safety, impact pages, but not dynamic forms
              if (
                url.pathname === '/' ||
                url.pathname === '/about' ||
                url.pathname === '/safety' ||
                url.pathname === '/privacy' ||
                url.pathname === '/impact'
              ) {
                cache.put(request, copy);
              }
            });
          }
          return response;
        })
        .catch(async () => {
          // If offline, try matching from cache
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fall back to offline page
          const offlinePage = await caches.match('/offline');
          return offlinePage || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // 3. Static assets (_next/static, images, fonts, styles)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/web/') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Default: network pass-through
  event.respondWith(fetch(request));
});
