// Service Worker placeholder to prevent 404 probes
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
