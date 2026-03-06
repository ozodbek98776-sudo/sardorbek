// Minimal Service Worker - v7
const CACHE_NAME = 'sardorbek-v7';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Network only - pass through all requests
self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests normally
  // Don't intercept or cache anything
});
