// QueueLess v4.1. Keep customer contacts and authenticated API responses out of offline caches.
// QueueLess requires the running Java server for profiles and live queues.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
