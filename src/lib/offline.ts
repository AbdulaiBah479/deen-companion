// "Read the Quran without internet": downloads every surah (and its translation) into the browser's cache so the service worker
// (public/sw.js) can serve it offline. Prayer times for a shared location are calculated on the device (lib/prayer-calc.ts),
// so they work offline too. Recitation audio is not included (it would be hundreds of megabytes).

export const OFFLINE_CACHE = 'deen-v2'
const SURAHS = 114

export const surahUrls = (n: number, lang: string) => [`/quran/${n}`, `/api/quran/surah/${n}?lang=${encodeURIComponent(lang)}`]
export const sharedUrls = () => ['/quran', '/api/quran/surahs', '/offline', '/dashboard', '/prayer', '/dhikr', '/more']

export const offlineSupported = () => typeof caches !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator

// How many surahs are saved for this language.
export async function offlineCount(lang: string): Promise<number> {
  if (!offlineSupported()) return 0
  const cache = await caches.open(OFFLINE_CACHE)
  const keys = await cache.keys()
  const want = `lang=${encodeURIComponent(lang)}`
  const have = new Set<number>()
  for (const k of keys) {
    const u = new URL(k.url)
    const m = u.pathname.match(/^\/api\/quran\/surah\/(\d+)$/)
    if (m && u.search.includes(want)) have.add(Number(m[1]))
  }
  return have.size
}

// A saved page is useless offline if its JavaScript isn't saved too. Pull the file names out of the page's HTML.
const ASSET = /(?:\/_next\/)?static\/(?:chunks|css|media)\/[\w~.\-%/()]+\.(?:js|css|woff2?)/g
export function assetsIn(html: string): string[] {
  const out = new Set<string>()
  for (const m of html.matchAll(ASSET)) out.add('/_next/' + m[0].replace(/^\/_next\//, ''))
  return [...out]
}

// Downloads in small parallel batches and reports progress after each surah. Stops quietly if `signal` is aborted.
export async function downloadQuran(lang: string, onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<{ done: number; failed: number }> {
  const cache = await caches.open(OFFLINE_CACHE)
  const jobs: string[][] = [sharedUrls(), ...Array.from({ length: SURAHS }, (_, i) => surahUrls(i + 1, lang))]
  let done = 0
  let failed = 0
  const total = jobs.length
  const assets = new Set<string>()
  const worker = async () => {
    for (;;) {
      if (signal?.aborted) return
      const urls = jobs.shift()
      if (!urls) return
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'no-store' })
          if (res.ok) {
            if ((res.headers.get('content-type') || '').includes('text/html')) for (const a of assetsIn(await res.clone().text())) assets.add(a)
            await cache.put(url, res)
          } else failed++
        } catch {
          failed++
        }
      }
      onProgress(++done, total)
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])

  // App files the saved pages need (they are content-hashed, so the same file is never saved twice).
  const todo = [...assets]
  const files = async () => {
    for (;;) {
      if (signal?.aborted) return
      const url = todo.shift()
      if (!url) return
      if (await cache.match(url)) continue
      try {
        const res = await fetch(url)
        if (res.ok) await cache.put(url, res)
        else failed++
      } catch {
        failed++
      }
    }
  }
  await Promise.all([files(), files(), files(), files()])
  return { done, failed }
}

export async function removeOfflineQuran(lang?: string): Promise<void> {
  if (!offlineSupported()) return
  const cache = await caches.open(OFFLINE_CACHE)
  for (const k of await cache.keys()) {
    const u = new URL(k.url)
    const isQuran = /^\/quran\/\d+$/.test(u.pathname) || /^\/api\/quran\/surah\/\d+$/.test(u.pathname)
    if (isQuran && (!lang || !u.search || u.search.includes(`lang=${encodeURIComponent(lang)}`))) await cache.delete(k)
  }
}
