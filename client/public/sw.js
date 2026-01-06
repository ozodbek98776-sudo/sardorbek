const CACHE_NAME = 'sardorbek-furnetura-v4';
const STATIC_CACHE_NAME = 'static-assets-v4';

// Only cache essential static assets - NO HTML pages
const staticAssetsToCache = [
  '/manifest.json',
  '/icon.svg',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/icon-384x384.svg',
  '/icon-256x256.svg',
  '/icon-128x128.svg'
];

// Server health check endpoint
const SERVER_HEALTH_CHECK = '/api/health';
const OFFLINE_CHECK_TIMEOUT = 3000; // 3 seconds

// Install event - cache only static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets only');
        return cache.addAll(staticAssetsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Check if server is reachable
async function isServerOnline() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OFFLINE_CHECK_TIMEOUT);

    const response = await fetch(SERVER_HEALTH_CHECK, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Server health check failed:', error.message);
    return false;
  }
}

// Create offline error response
function createOfflineResponse() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Offline - Sardorbek Furnetura</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container { 
          text-align: center; 
          padding: 2rem;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { margin: 0 0 1rem 0; font-size: 2rem; }
        p { margin: 0.5rem 0; opacity: 0.9; }
        .retry-btn {
          margin-top: 2rem;
          padding: 12px 24px;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 1rem;
        }
        .retry-btn:hover { background: rgba(255,255,255,0.3); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🔌</div>
        <h1>Server Offline</h1>
        <p>The application server is currently unavailable.</p>
        <p>Please check your connection and try again.</p>
        <button class="retry-btn" onclick="window.location.reload()">Retry Connection</button>
      </div>
    </body>
    </html>
  `;

  return new Response(offlineHTML, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

// Fetch event - LIMITED offline mode
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle different request types
  if (event.request.method !== 'GET') {
    // Non-GET requests (POST, PUT, DELETE) - always go to network
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: 'Server offline - operation cannot be completed',
          offline: true
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // API requests - NEVER serve from cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: 'API unavailable - server is offline',
          offline: true
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Static assets (icons, manifest) - can use cache
  if (staticAssetsToCache.some(asset => url.pathname === asset)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // HTML pages and app routes - check server first
  if (event.request.destination === 'document' ||
    event.request.headers.get('accept')?.includes('text/html')) {

    event.respondWith(
      isServerOnline().then(online => {
        if (online) {
          // Server is online - fetch normally
          return fetch(event.request);
        } else {
          // Server is offline - return error page
          console.log('Server offline - returning error page');
          return createOfflineResponse();
        }
      }).catch(() => {
        // Health check failed - return error page
        return createOfflineResponse();
      })
    );
    return;
  }

  // All other requests - try network first, no cache fallback
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Resource unavailable offline', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle offline actions when back online
  return new Promise((resolve) => {
    console.log('Background sync triggered');
    resolve();
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from Sardorbek.Furnetura',
    icon: '/icon-192x192.svg',
    badge: '/icon-72x72.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icon-192x192.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Sardorbek.Furnetura', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle app shortcuts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});