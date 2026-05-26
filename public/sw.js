self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = {
      title: 'ZeroApp',
      body: event.data.text() || ''
    };
  }

  const options = {
    body: payload.body || '',
    icon: '/icons/manifest-icon-192-light.maskable.png',
    badge: '/icons/manifest-icon-192-light.maskable.png',
    data: { url: payload.url || '/' },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'ZeroApp', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((allClients) => {
      const existing = allClients.find((client) => client.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
