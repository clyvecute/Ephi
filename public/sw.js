// public/sw.js
//
// Service Worker — handles background push notifications for the astrology app.
// Place this file in your /public folder so it's served from the root URL.
//
// Responsibilities:
//   1. Receive push events (if you add a push server later)
//   2. Handle notification click actions (view / get reading)
//   3. Show notifications even when the app tab is in the background
//   4. Cache app shell for offline support (optional, basic)

const CACHE_NAME    = 'astro-app-v1';
const OFFLINE_URLS  = ['/', '/index.html'];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache the app shell so it loads offline
      return cache.addAll(OFFLINE_URLS).catch(() => {
        // Non-fatal — app still works without offline caching
      });
    })
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Delete old caches
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ─── Fetch (basic offline fallback) ──────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin navigation
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin)
  ) return;

  // For navigation requests, try network first, fall back to cached index
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html')
      )
    );
  }
});

// ─── Push event (for future server-sent pushes) ───────────────────────────────
// Currently the app polls locally — this handler is ready if you add
// a push server (e.g. web-push library on a Node backend) later.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: '✦ Transit Alert',
      body:  event.data.text(),
    };
  }

  const options = {
    body:     payload.body    || '',
    icon:     payload.icon    || '/favicon.ico',
    badge:    payload.badge   || '/favicon.ico',
    tag:      payload.tag     || 'astro-alert',
    data:     payload.data    || {},
    actions: [
      { action: 'view',    title: 'View Transits' },
      { action: 'reading', title: 'Get Reading'   },
    ],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || '✦ Transit Alert', options)
  );
});

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data   = event.notification.data || {};

  // Determine target URL based on which action button was tapped
  let targetUrl = '/';
  if (action === 'reading') targetUrl = '/reading';
  if (data.url) targetUrl = data.url;

  event.waitUntil(
    // Try to focus an existing tab at the target URL
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const appUrl = self.location.origin + targetUrl;

      // Find an already-open tab
      const existing = clients.find(
        (c) => c.url === appUrl || c.url.startsWith(self.location.origin)
      );

      if (existing) {
        // Focus it and navigate
        return existing.focus().then((c) => c.navigate(targetUrl));
      }

      // No open tab — open a new one
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Notification close ───────────────────────────────────────────────────────

self.addEventListener('notificationclose', (event) => {
  // Could log dismissals here if needed
  // console.log('[SW] Notification dismissed:', event.notification.tag);
});

// ─── Message from main thread ─────────────────────────────────────────────────
// The main app can send messages to the SW via postMessage.
// Currently used to trigger a manual notification from the alerts page.

self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  if (type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = payload || {};
    self.registration.showNotification(title || '✦ Transit Alert', {
      body:    body    || '',
      icon:    '/favicon.ico',
      badge:   '/favicon.ico',
      tag:     tag     || `astro-manual-${Date.now()}`,
      data:    data    || {},
      actions: [
        { action: 'view',    title: 'View Transits' },
        { action: 'reading', title: 'Get Reading'   },
      ],
    });
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
