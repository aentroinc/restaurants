/* eslint-disable no-restricted-globals */
/**
 * AENTRO Line Check ServiceWorker.
 *
 * Strategy:
 *   - install: pre-cache the line-check shell.
 *   - fetch (GET): network-first; on failure, fall back to cache; if still
 *     missing, return cached app shell so the page boots offline.
 *   - non-GET (POST/PATCH...) bypass the cache; the page-level offline-store
 *     (IndexedDB) handles queueing.
 */

const CACHE = "aentro-line-check-v1"
const SHELL = ["/", "/line-check", "/line-check/admin", "/manifest.json"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {})
        return res
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit
          return caches.match("/line-check") || new Response("", { status: 503 })
        })
      )
  )
})
