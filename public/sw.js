// Minimal Service Worker to satisfy PWA requirements
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through strategy
  // In a full PWA, we would cache assets here
  event.respondWith(fetch(event.request));
});