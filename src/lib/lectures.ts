// Educational lectures from YouTube channels YOU choose. Each channel's public RSS feed lists its newest videos — free, no API key,
// always current. Videos play with YouTube's privacy-enhanced player (youtube-nocookie.com) and only load after you tap play.
//
// Add or replace channels with LECTURE_CHANNELS="Display name|UCxxxxxxxxxxxxxxxxxxxxxx, Another name|UCyyyy…"  (see .env.example),
// or LECTURE_CHANNELS=none to turn the page off. If you set nothing, the two starter channels below are used.
// They were chosen because they are widely followed, and each ID was checked against YouTube's own feed (and Wikidata) —
// but a channel is not a fatwa: review what they publish, and swap in the teachers and institutions you trust.

export type LectureChannel = { name: string; id: string }
export type Lecture = { id: string; title: string; published: string; thumb: string; channel: string; channelId: string }

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/

// Starter channels (IDs verified through Wikidata property P2397 and the live YouTube feed on 2026-10-17).
export const DEFAULT_CHANNELS: LectureChannel[] = [
  { name: 'Yaqeen Institute', id: 'UC3vHW2h22WE-pNi5WJtRIjg' },
  { name: 'Mufti Menk', id: 'UCNB_OaI4524fASt8h0IL8dw' },
]

// What the page should use: your list if you set one, nothing if you set "none", otherwise the starter channels.
export function effectiveChannels(raw: string | undefined): LectureChannel[] {
  if (raw && raw.trim().toLowerCase() === 'none') return []
  const mine = parseChannels(raw)
  return mine.length ? mine : DEFAULT_CHANNELS
}

export function parseChannels(raw: string | undefined): LectureChannel[] {
  const out: LectureChannel[] = []
  for (const part of (raw || '').split(',')) {
    const [name, id] = part.split('|').map((s) => s?.trim())
    if (name && id && CHANNEL_ID.test(id) && !out.some((c) => c.id === id)) out.push({ name: name.slice(0, 60), id })
  }
  return out
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

// Parses YouTube's Atom feed (<entry><yt:videoId>…</yt:videoId><title>…</title><published>…</published>).
export function parseFeed(xml: string, channel: LectureChannel): Lecture[] {
  const out: Lecture[] = []
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1]
    const id = e.match(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/)?.[1]
    const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const published = e.match(/<published>([^<]+)<\/published>/)?.[1]
    if (!id || !title) continue
    out.push({ id, title: decode(title).slice(0, 200), published: published || '', thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, channel: channel.name, channelId: channel.id })
  }
  return out
}

const cache = new Map<string, { at: number; items: Lecture[] }>()
const TTL = 30 * 60_000

// YouTube's feed address sometimes answers 404 or 500 to servers. The channel's own "Videos" page always works, so it is the second
// source. Its text is a long script holding the list of videos; each has an id, a title and "3 days ago" instead of a date.
const UNIT_MS: Record<string, number> = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000, month: 2_592_000_000, year: 31_536_000_000 }
const UNIT_KEY: Record<string, string> = { s: 'second', sec: 'second', second: 'second', m: 'minute', min: 'minute', minute: 'minute', h: 'hour', hr: 'hour', hour: 'hour', d: 'day', day: 'day', w: 'week', wk: 'week', week: 'week', mo: 'month', month: 'month', y: 'year', yr: 'year', year: 'year' }
// "3 days ago", "9d ago", "2 mo ago", "1 year ago" -> a date (only as exact as the words are).
export function agoToIso(text: string, now = Date.now()): string {
  const m = text.match(/(\d+)\s*(month|mo|minute|min|m|second|sec|s|hour|hr|h|day|d|week|wk|w|year|yr|y)s?\s+ago/i)
  const unit = m ? UNIT_KEY[m[2].toLowerCase()] : ''
  return m && unit ? new Date(now - Number(m[1]) * UNIT_MS[unit]).toISOString() : ''
}

export function parseChannelPage(html: string, channel: LectureChannel, now = Date.now()): Lecture[] {
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/)
  if (!m) return []
  let data: unknown
  try {
    data = JSON.parse(m[1])
  } catch {
    return []
  }
  const out: Lecture[] = []
  const seen = new Set<string>()
  const walk = (o: unknown, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 60) return
    const v = (o as { lockupViewModel?: { contentType?: string; contentId?: string; metadata?: unknown } }).lockupViewModel
    if (v && v.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' && typeof v.contentId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(v.contentId) && !seen.has(v.contentId)) {
      const meta = (v.metadata as { lockupMetadataViewModel?: { title?: { content?: string }; metadata?: unknown } } | undefined)?.lockupMetadataViewModel
      const title = meta?.title?.content
      // Every piece of text next to the title ("1.2M views", "3 days ago") is searched for the age.
      const texts: string[] = []
      const collect = (x: unknown, d = 0) => {
        if (!x || typeof x !== 'object' || d > 20) return
        for (const [k, val] of Object.entries(x as Record<string, unknown>)) {
          if ((k === 'content' || k === 'accessibilityLabel') && typeof val === 'string') texts.push(val)
          else collect(val, d + 1)
        }
      }
      collect(meta?.metadata)
      const age = texts.map((t) => agoToIso(t, now)).find(Boolean) || ''
      if (typeof title === 'string' && title && age) {
        seen.add(v.contentId)
        out.push({ id: v.contentId, title: decode(title).slice(0, 200), published: age, thumb: `https://i.ytimg.com/vi/${v.contentId}/mqdefault.jpg`, channel: channel.name, channelId: channel.id })
      }
    }
    for (const val of Object.values(o as Record<string, unknown>)) walk(val, depth + 1)
  }
  walk(data)
  return out
}

const BROWSER = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', 'Accept-Language': 'en', Cookie: 'CONSENT=YES+1; SOCS=CAI' }
const YOUTUBE = 'https://www.youtube.com'

export async function fetchLectures(channel: LectureChannel, base = process.env.LECTURES_BASE_URL || YOUTUBE): Promise<Lecture[]> {
  const key = `${base}|${channel.id}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.items
  try {
    let items: Lecture[] = []
    try {
      const res = await fetch(`${base}/feeds/videos.xml?channel_id=${channel.id}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      items = parseFeed(await res.text(), channel)
    } catch (err) {
      if (base !== YOUTUBE) throw err // a test or a custom source: no second source
      const page = await fetch(`${YOUTUBE}/channel/${channel.id}/videos`, { headers: BROWSER, signal: AbortSignal.timeout(12000), cache: 'no-store' })
      if (!page.ok) throw new Error(String(page.status))
      items = parseChannelPage(await page.text(), channel)
      if (!items.length) throw err
    }
    cache.set(key, { at: Date.now(), items })
    return items
  } catch (err) {
    if (hit) return hit.items // serve the last good list if YouTube hiccups
    throw err
  }
}
