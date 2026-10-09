const CACHE_NAME = 'uthk-admin-shell-v3';
const APP_FILES = [
    './index.html',
    './style.css',
    './logo.png',
    './manifest.webmanifest',
    './icons/app-icon-192.png',
    './icons/app-icon-512.png',
    './pages/admin-api.js',
    './pages/home.js',
    './pages/historyorder.html',
    './pages/historyorder.js',
    './pages/createorder.html',
    './pages/createorder.js',
    './pages/chnagerequest.html',
    './pages/chnagerequest.js',
    './pages/createvoucher.html',
    './pages/createvoucher.js',
    './pages/checkstock.html',
    './pages/checkstock.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key.startsWith('uthk-admin-shell-') && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                const cached = await caches.match(request);
                return cached || caches.match(new URL('./index.html', self.registration.scope).href);
            })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request).then((response) => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
        }))
    );
});
