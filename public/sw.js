// Service worker: makes the app installable and usable offline.
//  • static files (/_next/static, icons): cache-first
//  • pages and API calls: network-first, then whatever was saved last time
//  • a page you never opened while online: a friendly /offline page instead of the browser's error
// The Quran can be saved on purpose from Settings → Offline (see src/lib/offline.ts), which writes into the same cache.
const CACHE = 'deen-v2'
const SHELL = ['/offline', '/dashboard', '/quran', '/prayer', '/dhikr', '/more', '/icon.svg', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // each one separately, so a single failure doesn't stop the rest
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Saved recitation (Settings → Offline). Audio players ask for byte ranges ("Range: bytes=0-"), so a saved file must be answered
// with a proper 206 slice, otherwise seeking and some browsers' playback break. Anything not saved goes to the network as usual.
const AUDIO_CACHE = 'deen-audio-v1'
async function savedAudio(req) {
  const hit = await caches.open(AUDIO_CACHE).then((c) => c.match(req.url))
  if (!hit) return fetch(req)
  const type = hit.headers.get('content-type') || 'audio/mpeg'
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '')
  if (!range) return hit
  const buf = await hit.arrayBuffer()
  const size = buf.byteLength
  const start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1])
  const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1)
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } })
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': type, 'Content-Length': String(end - start + 1), 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Accept-Ranges': 'bytes' },
  })
}

const isStatic = (url) => url.pathname.startsWith('/_next/static/') || /\.(svg|png|ico|webp|woff2?)$/.test(url.pathname)

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (/\.mp3$/.test(url.pathname)) {
    event.respondWith(savedAudio(req))
    return
  }
  if (url.origin !== self.location.origin) return // other CDN requests go straight to the network
  if (url.pathname === '/api/client-error' || url.pathname === '/api/health') return // never cache these

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          })
      )
    )
    return
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit
          // Not saved: for pages show the offline page; for data requests let the app handle the failure.
          if (req.mode === 'navigate') return caches.match('/offline').then((p) => p || Response.error())
          return Response.error()
        })
      )
  )
})

// ── Prayer reminders (Web Push) ────────────────────────────────────────────────────────────────────────────────────────────
// The server sends { title, body, url, tag }. We show it even when no page of the app is open.
self.addEventListener('push', (event) => {
  let m = { title: 'Prayer reminder', body: '', url: '/prayer', tag: 'prayer' }
  try {
    if (event.data) m = { ...m, ...event.data.json() }
  } catch {
    if (event.data) m.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(m.title, {
      body: m.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: m.tag, // a newer reminder replaces an older one for the same prayer
      renotify: true,
      data: { url: m.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/prayer'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) if ('focus' in w) return w.navigate(target).then(() => w.focus()).catch(() => w.focus())
      return self.clients.openWindow(target)
    })
  )
})
