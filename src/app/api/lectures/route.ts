import { NextRequest, NextResponse } from 'next/server'
import { effectiveChannels, fetchLectures, type Lecture } from '@/lib/lectures'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis, redisConfigured } from '@/lib/redis'

// GET /api/lectures -> { configured, channels[], lectures[] } newest first, from the channels in LECTURE_CHANNELS.
// YouTube's feeds fail now and then when asked from a server. So: each channel is tried twice, the last good list of every channel is
// kept for a week (when Redis is set up) and used if the feed is down, and an answer with nothing in it is never cached.
const KEEP = 7 * 86400

async function remember(id: string, items: Lecture[]) {
  if (!redisConfigured() || !items.length) return
  try {
    await redis([['SET', `lectures:${id}`, JSON.stringify(items.slice(0, 15)), 'EX', KEEP]])
  } catch {}
}
async function recall(id: string): Promise<Lecture[]> {
  if (!redisConfigured()) return []
  try {
    const [raw] = await redis([['GET', `lectures:${id}`]])
    const list = typeof raw === 'string' ? (JSON.parse(raw) as Lecture[]) : []
    return Array.isArray(list) ? list.filter((l) => l && /^[A-Za-z0-9_-]{11}$/.test(l.id) && typeof l.title === 'string') : []
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const limit = await rateLimit(`lectures:${clientIp(request.headers)}`, 30, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const channels = effectiveChannels(process.env.LECTURE_CHANNELS)
  if (!channels.length) return NextResponse.json({ configured: false, channels: [], lectures: [] })

  let failed = 0
  const lists = await Promise.all(
    channels.map(async (c) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const items = await fetchLectures(c)
          void remember(c.id, items)
          return items.slice(0, 15)
        } catch {}
      }
      const old = await recall(c.id)
      if (!old.length) failed++
      return old.slice(0, 15)
    })
  )
  const lectures = lists.flat()
  lectures.sort((a, b) => (a.published < b.published ? 1 : -1))
  // Only a complete answer may be kept by the network; an empty or partial one is asked for again next time.
  const complete = lectures.length > 0 && failed === 0
  return NextResponse.json(
    { configured: true, channels, lectures, failed },
    { headers: { 'Cache-Control': complete ? 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600' : 'no-store' } }
  )
}
