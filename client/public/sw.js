// Service Worker pour le CRM SFR Business
const CACHE_NAME = 'crm-sfr-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Stratégie de fetch : Network First, fallback to cache
self.addEventListener('fetch', (event) => {
    // Ignorer les requêtes API (elles doivent toujours passer par le réseau)
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cloner la réponse car elle ne peut être utilisée qu'une fois
                const responseClone = response.clone();

                // Mettre en cache la réponse pour usage offline
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });

                return response;
            })
            .catch(() => {
                // Si le réseau échoue, utiliser le cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Si pas de cache, retourner la page d'accueil pour le routing SPA
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    const data = event.data ? event.data.json() : {};
    const title = data.title || 'CRM SFR Business';
    const options = {
        body: data.body || 'Nouvelle notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'Ouvrir' },
            { action: 'close', title: 'Fermer' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const url = event.notification.data?.url || '/';
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                // Si une fenêtre est déjà ouverte, la focus
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Sinon ouvrir une nouvelle fenêtre
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
        );
    }
});

// Sync en arrière-plan (pour envoyer des données en attente quand online)
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-pending-data') {
        event.waitUntil(
            // Logique pour envoyer les données en attente
            Promise.resolve()
        );
    }
});
