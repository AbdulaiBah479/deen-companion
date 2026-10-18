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

export async function fetchLectures(channel: LectureChannel, base = process.env.LECTURES_BASE_URL || 'https://www.youtube.com'): Promise<Lecture[]> {
  const key = `${base}|${channel.id}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.items
  try {
    const res = await fetch(`${base}/feeds/videos.xml?channel_id=${channel.id}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
    if (!res.ok) throw new Error(String(res.status))
    const items = parseFeed(await res.text(), channel)
    cache.set(key, { at: Date.now(), items })
    return items
  } catch (err) {
    if (hit) return hit.items // serve the last good list if YouTube hiccups
    throw err
  }
}
