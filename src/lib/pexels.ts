// Stock nature footage for Reels backgrounds, from the Pexels API (https://www.pexels.com/api/).
// Needs a free PEXELS_API_KEY. The key stays on the server; the browser only ever sees video links and credits.
//
// Pexels asks apps to (1) show a visible link back to Pexels and (2) credit the videographer — the Reels UI does both.
// The free tier allows 200 requests/hour, so results are cached for hours and each topic costs only a few requests.

export type ReelVideo = {
  id: number
  src: string // mp4 link
  poster: string
  width: number
  height: number
  duration: number
  credit: { name: string; url: string }
  pageUrl: string
}

type PexelsFile = { quality?: string; file_type?: string; width?: number | null; height?: number | null; link?: string | null }
type PexelsVideo = {
  id?: number
  width?: number
  height?: number
  duration?: number
  url?: string
  image?: string
  user?: { name?: string; url?: string }
  video_files?: PexelsFile[]
}

// Choose the best file for a phone screen: MP4 only (the list can also contain HLS entries with no size), no larger than needed.
// Prefers the smallest file that is still at least 720 px on its short side (720p), so playback starts fast and uses little data.
export function pickFile(files: PexelsFile[] | undefined): { link: string; width: number; height: number } | null {
  const usable = (files ?? []).filter(
    (f): f is PexelsFile & { link: string; width: number; height: number } =>
      f.file_type === 'video/mp4' && typeof f.link === 'string' && f.link.startsWith('https://') ||
      (f.file_type === 'video/mp4' && typeof f.link === 'string' && /^http:\/\/(localhost|127\.0\.0\.1)/.test(f.link))
  ).filter((f) => typeof f.width === 'number' && typeof f.height === 'number' && (f.width as number) > 0 && (f.height as number) > 0)
  if (!usable.length) return null
  const sized = usable as { link: string; width: number; height: number }[]
  const byArea = [...sized].sort((a, b) => a.width * a.height - b.width * b.height)
  return byArea.find((f) => Math.min(f.width, f.height) >= 720) ?? byArea[byArea.length - 1]
}

export function shapeVideos(json: unknown): ReelVideo[] {
  const list = (json as { videos?: PexelsVideo[] } | null)?.videos
  if (!Array.isArray(list)) return []
  const out: ReelVideo[] = []
  for (const v of list) {
    const file = pickFile(v.video_files)
    if (!file || typeof v.id !== 'number' || !v.image) continue
    out.push({
      id: v.id,
      src: file.link,
      poster: v.image,
      width: file.width,
      height: file.height,
      duration: typeof v.duration === 'number' ? v.duration : 0,
      credit: { name: v.user?.name || 'Pexels contributor', url: v.user?.url || 'https://www.pexels.com' },
      pageUrl: v.url || 'https://www.pexels.com',
    })
  }
  return out
}

// What to search for on each topic. Nature and sky only — calm scenery that suits recitation and never shows people.
export const TOPIC_QUERIES: Record<string, string[]> = {
  foryou: ['nature sunrise', 'ocean waves', 'forest sunlight', 'clouds sky', 'night stars', 'mountains mist'],
  patience: ['mountains', 'desert dunes'],
  gratitude: ['sunrise', 'golden hour nature'],
  mercy: ['gentle rain', 'rain leaves'],
  hope: ['sunrise sky', 'sunlight clouds'],
  forgiveness: ['calm ocean', 'sea waves'],
  family: ['garden flowers', 'tree sunlight'],
  knowledge: ['night sky stars', 'galaxy'],
  charity: ['wheat field', 'river flowing'],
  prayer: ['sunset clouds', 'dawn sky'],
  death: ['autumn leaves', 'twilight sky'],
}

const cache = new Map<string, { at: number; videos: ReelVideo[] }>()
const TTL_MS = 12 * 3600_000

export async function fetchTopicVideos(topic: string, apiKey: string, base = process.env.PEXELS_BASE_URL || 'https://api.pexels.com'): Promise<ReelVideo[]> {
  const queries = TOPIC_QUERIES[topic] ?? TOPIC_QUERIES.foryou
  const key = `${base}|${topic}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.videos

  const perQuery = Math.ceil(12 / Math.min(queries.length, 3))
  const results = await Promise.all(
    queries.slice(0, 3).map(async (q) => {
      const url = `${base}/v1/videos/search?query=${encodeURIComponent(q)}&orientation=portrait&size=medium&per_page=${perQuery}`
      const res = await fetch(url, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(12000), cache: 'no-store' })
      if (!res.ok) throw new Error(`Pexels ${res.status}`)
      return shapeVideos(await res.json())
    })
  )
  // Interleave the queries for variety and drop duplicates.
  const seen = new Set<number>()
  const videos: ReelVideo[] = []
  for (let i = 0; videos.length < 12 && results.some((r) => i < r.length); i++) {
    for (const r of results) {
      const v = r[i]
      if (v && !seen.has(v.id)) {
        seen.add(v.id)
        videos.push(v)
      }
    }
  }
  if (videos.length) cache.set(key, { at: Date.now(), videos })
  else if (hit) return hit.videos // keep serving the last good set if a refresh comes back empty
  return videos
}
