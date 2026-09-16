// Service Worker para PWA Biblioteca Digital (Android)
const CACHE_NAME = "biblioteca-pwa-v1";

const PRECACHE_ASSETS = [
  "/",
  "/books",
  "/shelves",
  "/manifest.webmanifest",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-512x512.png",
  "/icon.png",
];

// Instalación: Pre-cacheo de recursos esenciales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Advertencia al pre-cachear algunos recursos:", err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

// Activación: Limpieza de versiones antiguas de caché y tomar control inmediato
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Peticiones: Estrategia híbrida Network First para navegación / Cache First para estáticos
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo interceptar peticiones GET del mismo origen
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Ignorar APIs externas (OpenLibrary, Google Books, etc.) y endpoints de Next.js API
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // 1. Peticiones de navegación (páginas HTML) -> Network First con fallback a caché
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          // Fallback a la página principal si está offline
          const rootFallback = await caches.match("/");
          if (rootFallback) return rootFallback;
          return new Response("Estás sin conexión a internet. Vuelve a intentarlo cuando tengas red.", {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }),
    );
    return;
  }

  // 2. Recursos estáticos (_next/static, iconos, imágenes locales) -> Stale-While-Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
    return;
  }
});
