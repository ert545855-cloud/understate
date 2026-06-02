// UNDERSTATE Service Worker v3.0
// Önbellek yok — her zaman ağdan yükle (stale kod önlenir)

const CACHE_NAME = 'understate-v5';

// Eski önbellekleri sil
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

// Fetch: JS/CSS/HTML → her zaman ağdan (cache yok)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/socket.io')) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.protocol === 'chrome-extension:') return;

  // JS ve CSS dosyaları — her zaman ağdan, cache kullanma
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // HTML — her zaman ağdan
  if (event.request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('Çevrimdışı', { status: 503 }))
    );
    return;
  }

  // Görseller / ikonlar — ağdan, hata durumunda boş
  event.respondWith(
    fetch(event.request).catch(() => new Response('', { status: 503 }))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'UNDERSTATE', body: 'Yeni bildirim var!', icon: '/icon-192.png' };
  try { data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon  || '/icon-192.png',
      badge: data.badge || '/icon-72.png',
      data:  data.url   || '/',
      vibrate: [100, 50, 100],
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) {
        if (c.url === url && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
