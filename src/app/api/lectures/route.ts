import { NextRequest, NextResponse } from 'next/server'
import { effectiveChannels, fetchLectures } from '@/lib/lectures'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// GET /api/lectures -> { configured, channels[], lectures[] } newest first, from the channels in LECTURE_CHANNELS.
export async function GET(request: NextRequest) {
  const limit = await rateLimit(`lectures:${clientIp(request.headers)}`, 30, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const channels = effectiveChannels(process.env.LECTURE_CHANNELS)
  if (!channels.length) return NextResponse.json({ configured: false, channels: [], lectures: [] })

  const results = await Promise.allSettled(channels.map((c) => fetchLectures(c)))
  const lectures = results.flatMap((r) => (r.status === 'fulfilled' ? r.value.slice(0, 15) : []))
  lectures.sort((a, b) => (a.published < b.published ? 1 : -1))
  const failed = results.filter((r) => r.status === 'rejected').length
  return NextResponse.json(
    { configured: true, channels, lectures, failed },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' } }
  )
}
