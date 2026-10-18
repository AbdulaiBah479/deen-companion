// "Listen without internet": saves a surah's recitation (one file per verse, from EveryAyah) in the browser. The service worker
// (public/sw.js) answers audio requests from this cache, including the partial-content (Range) requests that the audio player
// makes, so it plays and seeks just like online. Kept apart from the text cache so that the Quran can be saved without the (much
// bigger) audio.
import { getVerseAudioUrl } from './quran'

export const AUDIO_CACHE = 'deen-audio-v1'

export const audioSupported = () => typeof caches !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator

export const verseUrls = (surah: number, verses: number, folder: string) => Array.from({ length: verses }, (_, i) => getVerseAudioUrl(surah, i + 1, folder))

// Rough size before downloading: bitrate from the reciter's folder name (e.g. "…_128kbps"), ~9.5 s of recitation per verse.
export function estimateBytes(verses: number, folder: string): number {
  const kbps = Number(folder.match(/(\d+)kbps/)?.[1] ?? 128)
  return Math.round(verses * ((kbps * 1000) / 8) * 9.5)
}
export const formatMB = (bytes: number) => (bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`)

export type SavedSurah = { surah: number; folder: string; verses: number }

// Which surahs (per reciter) have audio saved, worked out from the cached file names (…/<folder>/<SSS><VVV>.mp3).
export async function savedAudio(): Promise<SavedSurah[]> {
  if (!audioSupported()) return []
  const cache = await caches.open(AUDIO_CACHE)
  const map = new Map<string, SavedSurah>()
  for (const k of await cache.keys()) {
    const m = new URL(k.url).pathname.match(/\/([^/]+)\/(\d{3})(\d{3})\.mp3$/)
    if (!m) continue
    const key = `${m[1]}|${m[2]}`
    const cur = map.get(key) ?? { folder: m[1], surah: Number(m[2]), verses: 0 }
    cur.verses++
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => a.surah - b.surah || a.folder.localeCompare(b.folder))
}

// Downloads verse by verse (3 at a time). If the browser refuses (storage full, offline) it stops and reports how far it got.
export async function saveSurahAudio(
  surah: number,
  verses: number,
  folder: string,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<{ saved: number; failed: number; full: boolean }> {
  const cache = await caches.open(AUDIO_CACHE)
  // Ask the browser not to throw this away when space is short (it's something the user explicitly chose to keep).
  void navigator.storage?.persist?.().catch(() => {})
  const urls = verseUrls(surah, verses, folder)
  let next = 0
  let saved = 0
  let failed = 0
  let full = false
  const worker = async () => {
    while (!signal?.aborted && !full) {
      const i = next++
      if (i >= urls.length) return
      try {
        if (await cache.match(urls[i])) {
          saved++
        } else {
          const res = await fetch(urls[i], { mode: 'cors' })
          if (!res.ok) throw new Error(String(res.status))
          await cache.put(urls[i], res)
          saved++
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') full = true
        else failed++
      }
      onProgress(saved + failed, urls.length)
    }
  }
  await Promise.all([worker(), worker(), worker()])
  return { saved, failed, full }
}

export async function removeSurahAudio(surah: number, folder: string): Promise<void> {
  if (!audioSupported()) return
  const cache = await caches.open(AUDIO_CACHE)
  const prefix = String(surah).padStart(3, '0')
  for (const k of await cache.keys()) {
    const m = new URL(k.url).pathname.match(/\/([^/]+)\/(\d{3})\d{3}\.mp3$/)
    if (m && m[1] === folder && m[2] === prefix) await cache.delete(k)
  }
}

export async function storageUsage(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    return e && typeof e.usage === 'number' && typeof e.quota === 'number' ? { usage: e.usage, quota: e.quota } : null
  } catch {
    return null
  }
}
