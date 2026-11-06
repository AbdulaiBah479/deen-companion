// "Offline packs": parts of the app you can save on this device on purpose, so they open with no internet.
// A pack is a list of pages and a list of data addresses. Saving one fetches each page (the browser's service worker keeps the page and
// the scripts it needs) and each data address (the service worker keeps those too). Nothing leaves the device; nothing is sent anywhere.
// Pages cannot be loaded in a hidden frame (the app forbids being framed, for safety), so the page's own script and style files are
// found in its HTML and fetched directly.

export type Pack = { id: string; name: string; blurb: string; approx: string; pages: string[]; data: string[]; hadithBooks?: string[] }

const DUAS = ['morning-dhikr', 'evening-dhikr', 'dhikr-after-salah', 'daily-dua', 'selected-dua'].map((c) => `/api/duas?category=${c}`)

export const PACKS: Pack[] = [
  {
    id: 'worship',
    name: 'Daily worship',
    blurb: 'Duas and adhkar, dhikr counter, 99 Names, prayer times and Qibla, rituals, Islam basics, Hajj and Umrah guides, Ruqyah, calendar, zakat and Ramadan.',
    approx: 'about 3 MB',
    pages: ['/duas', '/dhikr', '/names', '/prayer', '/qibla', '/rituals', '/basics', '/guides', '/ruqyah', '/calendar', '/zakat', '/ramadan'],
    data: [...DUAS, '/api/names'],
  },
  {
    id: 'hadith',
    name: 'Hadith: Forty of Nawawi and Hadith Qudsi',
    blurb: 'Two small collections in full, with their chapters, for reading without internet.',
    approx: 'about 1 MB',
    pages: ['/hadith'],
    data: [],
    hadithBooks: ['nawawi', 'qudsi'],
  },
  {
    id: 'learn',
    name: 'Learn and practise',
    blurb: 'Quran lessons, Hifz, flashcards, quizzes and games, and the stories of the Quran.',
    approx: 'about 2 MB',
    pages: ['/learn', '/hifz', '/flashcards', '/quiz', '/games', '/stories'],
    data: [],
  },
]

export const packById = (id: string) => PACKS.find((p) => p.id === id)
const KEY = 'deen:offline-packs'

export const packsSupported = () => typeof window !== 'undefined' && 'caches' in window && 'serviceWorker' in navigator

export function savedPacks(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, number>
  } catch {
    return {}
  }
}
function markPack(id: string, on: boolean) {
  try {
    const all = savedPacks()
    if (on) all[id] = Date.now()
    else delete all[id]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
}

// The script, style and font files a page's HTML points to.
export function assetsIn(html: string): string[] {
  return [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?#]+(?:\?[^"#]*)?)"/g)].map((m) => m[1]))]
}

async function pool<T>(items: T[], size: number, work: (x: T) => Promise<void>, signal?: AbortSignal) {
  let i = 0
  const run = async () => {
    while (i < items.length && !signal?.aborted) await work(items[i++])
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run))
}

export type Progress = { done: number; total: number }

// Saves a pack. Returns how many items could not be fetched (0 = all saved).
export async function downloadPack(pack: Pack, lang: string, onProgress: (p: Progress) => void, signal?: AbortSignal): Promise<{ failed: number }> {
  const data = [...pack.data]
  // Hadith: every chapter of each collection, a page of 20 at a time, exactly as the hadith screen asks for it.
  for (const book of pack.hadithBooks ?? []) {
    try {
      const list = (await (await fetch(`/api/hadith/sections?book=${book}`)).json()) as { sections?: { id: number; count?: number }[] }
      for (const s of list.sections ?? []) {
        const pages = Math.max(1, Math.ceil((s.count ?? 20) / 20))
        for (let p = 0; p < Math.min(pages, 30); p++) data.push(`/api/hadith/section?book=${book}&n=${s.id}&lang=${lang}&offset=${p * 20}&limit=20`)
        if (data.length > 400) break
      }
      data.push(`/api/hadith/sections?book=${book}`)
    } catch {}
  }
  let failed = 0
  let done = 0
  const total = pack.pages.length + data.length
  const tick = () => onProgress({ done: ++done, total })
  onProgress({ done: 0, total })

  await pool(
    pack.pages,
    3,
    async (path) => {
      try {
        const res = await fetch(path, { credentials: 'same-origin' })
        if (!res.ok) throw new Error(String(res.status))
        const html = await res.text()
        await pool(assetsIn(html), 6, async (a) => void (await fetch(a).catch(() => null)), signal)
      } catch {
        failed++
      }
      tick()
    },
    signal
  )
  await pool(
    data,
    4,
    async (url) => {
      try {
        const r = await fetch(url)
        if (!r.ok) throw new Error(String(r.status))
        await r.arrayBuffer()
      } catch {
        failed++
      }
      tick()
    },
    signal
  )
  if (!signal?.aborted && failed < pack.pages.length / 2) markPack(pack.id, true)
  return { failed }
}

// How many of a pack's pages are in the device's saved files right now.
export async function packPagesSaved(pack: Pack): Promise<number> {
  if (!packsSupported()) return 0
  let n = 0
  for (const p of pack.pages) if (await caches.match(p)) n++
  return n
}

// Forget a pack's pages (the service worker's copies) and the data it saved.
export async function removePack(pack: Pack) {
  if (!packsSupported()) return
  const keys = await caches.keys()
  for (const k of keys.filter((x) => x.startsWith('deen-v'))) {
    const c = await caches.open(k)
    for (const p of pack.pages) await c.delete(p)
    for (const d of pack.data) await c.delete(d)
  }
  markPack(pack.id, false)
}
