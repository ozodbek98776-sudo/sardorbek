// Minimal Service Worker - v6
const CACHE_NAME = 'sardorbek-v6';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Network only - no caching, no offline handling
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
