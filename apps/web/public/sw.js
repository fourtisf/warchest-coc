/* WARCHEST service worker: web push + notification click-through. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* opaque payload */ }
  e.waitUntil(
    self.registration.showNotification(d.title || 'WARCHEST', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || 'wc',
      data: { url: d.url || '/play' },
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/play';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/play') && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
