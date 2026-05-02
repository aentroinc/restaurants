/* eslint-disable no-restricted-globals */
/**
 * AENTRO Restaurant OS — unified ServiceWorker (staff / manager / sv).
 *
 * Strategy:
 *   - cache-first  for /_next/static/*, /icons/*, /*.svg, /*.png, fonts
 *   - network-first for HTML navigations; falls back to cached page,
 *     then to /offline.html
 *   - non-GET passes through (offline-store handles queueing)
 */

const VERSION = "aentro-pwa-v3"
const STATIC_CACHE = `${VERSION}-static`
const PAGES_CACHE = `${VERSION}-pages`
const OSM_TILES_CACHE = "osm-tiles"  // バージョンに紐付けず長期保持
const OSM_TILE_TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30日
const OSM_TILE_MAX_ENTRIES = 4000  // 概ね 200MB 上限 (1タイル ~50KB)

const PRECACHE = [
  "/offline.html",
  "/manifest-staff.json",
  "/manifest-manager.json",
  "/manifest-sv.json",
  "/icons/aentro-staff.svg",
  "/icons/aentro-manager.svg",
  "/icons/aentro-sv.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // バージョン外 + osm-tiles (長期保持) は残す
            .filter((k) => !k.startsWith(VERSION) && k !== OSM_TILES_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf|css|js|ico)$/i.test(url.pathname)
  )
}

function isHTMLNav(req) {
  return (
    req.mode === "navigate" ||
    (req.method === "GET" &&
      req.headers.get("accept")?.includes("text/html"))
  )
}

function isOsmTile(url) {
  return /\.tile\.openstreetmap\.org$/.test(url.hostname)
}

async function trimOsmCache() {
  try {
    const cache = await caches.open(OSM_TILES_CACHE)
    const keys = await cache.keys()
    if (keys.length <= OSM_TILE_MAX_ENTRIES) return
    // FIFO: 古い順に削除 (Request 順 = put 順)
    const excess = keys.length - OSM_TILE_MAX_ENTRIES
    await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)))
  } catch { /* ignore */ }
}

async function osmTileCacheFirst(req) {
  const cache = await caches.open(OSM_TILES_CACHE)
  const hit = await cache.match(req)
  if (hit) {
    // TTL チェック (Date ヘッダがあれば)
    const dh = hit.headers.get("date")
    if (dh) {
      const age = Date.now() - new Date(dh).getTime()
      if (age < OSM_TILE_TTL_MS) return hit
      // 期限切れ → 再取得を試みつつ、失敗時はキャッシュを返す
    } else {
      return hit
    }
  }
  try {
    const res = await fetch(req, { mode: "cors" })
    if (res.ok) {
      const clone = res.clone()
      cache.put(req, clone).then(() => trimOsmCache()).catch(() => {})
    }
    return res
  } catch (err) {
    if (hit) return hit
    // オフライン & 未キャッシュ: 透明 PNG プレースホルダ
    return new Response(
      Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="), (c) => c.charCodeAt(0)),
      { status: 200, headers: { "Content-Type": "image/png", "X-Aentro-Tile": "offline-placeholder" } },
    )
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)

  // OSM tile cache-first (cross-origin OK)
  if (isOsmTile(url)) {
    event.respondWith(osmTileCacheFirst(req))
    return
  }

  if (url.origin !== self.location.origin) return

  // Cache-first for static assets
  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req)
            .then((res) => {
              const clone = res.clone()
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => {})
              return res
            })
            .catch(() => caches.match("/offline.html"))
      )
    )
    return
  }

  // Network-first for HTML navigations
  if (isHTMLNav(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone()
          caches.open(PAGES_CACHE).then((c) => c.put(req, clone)).catch(() => {})
          return res
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match("/offline.html"))
            .then((r) => r || new Response("offline", { status: 503 }))
        )
    )
    return
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone()
        caches.open(PAGES_CACHE).then((c) => c.put(req, clone)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || new Response("", { status: 503 })))
  )
})

// Optional: respond to skipWaiting messages from clients
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting()
})
