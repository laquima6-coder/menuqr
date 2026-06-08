// Unregister all service workers to clear old PWA cache
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then(clients => clients.forEach(c => c.navigate(c.url)));
});
