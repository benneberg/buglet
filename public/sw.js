// Service Worker for AutoBlackBox Pro
// Provides offline-first functionality and caching

const CACHE_NAME = "autoblackbox-pro-v1"
const RUNTIME_CACHE = "autoblackbox-runtime-v1"

// Assets to cache on install
const PRECACHE_ASSETS = ["/", "/manifest.json", "/icon-192.jpg", "/icon-512.jpg"]

// Install event - precache essential assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...")

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Precaching assets")
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => {
        console.log("[Service Worker] Skip waiting")
        return self.skipWaiting()
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...")

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
            })
            .map((cacheName) => {
              console.log("[Service Worker] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }),
        )
      })
      .then(() => {
        console.log("[Service Worker] Claiming clients")
        return self.clients.claim()
      }),
  )
})

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Skip API calls to external services (Groq, OpenAI, etc.)
  if (
    url.hostname.includes("api.groq.com") ||
    url.hostname.includes("api.openai.com") ||
    url.hostname.includes("api.tavily.com")
  ) {
    return
  }

  event.respondWith(
    // Network first strategy
    fetch(request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone()

        // Cache successful responses
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })
        }

        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("[Service Worker] Serving from cache:", request.url)
            return cachedResponse
          }

          // If not in cache and it's a navigation request, return offline page
          if (request.mode === "navigate") {
            return caches.match("/")
          }

          // For other requests, return a basic response
          return new Response("Offline - Resource not available", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({
              "Content-Type": "text/plain",
            }),
          })
        })
      }),
  )
})

// Message event - handle messages from the app
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message received:", event.data)

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      }),
    )
  }
})

// Background sync for offline telemetry data
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync:", event.tag)

  if (event.tag === "sync-telemetry") {
    event.waitUntil(syncTelemetryData())
  }
})

// Sync telemetry data when back online
async function syncTelemetryData() {
  try {
    // Get pending telemetry from IndexedDB or localStorage
    const pendingData = await getPendingTelemetry()

    if (pendingData && pendingData.length > 0) {
      // Send to logging endpoint if configured
      const endpoint = await getLoggingEndpoint()

      if (endpoint) {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "batch-sync",
            data: pendingData,
            timestamp: Date.now(),
          }),
        })

        // Clear pending data after successful sync
        await clearPendingTelemetry()
        console.log("[Service Worker] Telemetry synced successfully")
      }
    }
  } catch (error) {
    console.error("[Service Worker] Sync failed:", error)
    throw error // Retry sync
  }
}

// Helper functions for telemetry sync
async function getPendingTelemetry() {
  // In a real implementation, this would read from IndexedDB
  // For now, return empty array
  return []
}

async function getLoggingEndpoint() {
  // Read from localStorage via clients
  const clients = await self.clients.matchAll()
  if (clients.length > 0) {
    // Send message to client to get endpoint
    return null // Simplified for now
  }
  return null
}

async function clearPendingTelemetry() {
  // Clear pending data after sync
  console.log("[Service Worker] Clearing pending telemetry")
}

// Push notification support (for future anomaly alerts)
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push received:", event)

  const data = event.data ? event.data.json() : {}
  const title = data.title || "AutoBlackBox Pro"
  const options = {
    body: data.body || "New debugging alert",
    icon: "/icon-192.jpg",
    badge: "/icon-192.jpg",
    tag: "autoblackbox-notification",
    requireInteraction: data.severity === "critical",
    data: data,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification clicked:", event)

  event.notification.close()

  event.waitUntil(clients.openWindow("/"))
})
