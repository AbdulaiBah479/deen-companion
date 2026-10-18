import { NextRequest, NextResponse } from 'next/server'
import { fetchTopicVideos, TOPIC_QUERIES } from '@/lib/pexels'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// GET /api/videos?topic=foryou -> { configured, videos[], attribution }
// Background footage for Reels. Without PEXELS_API_KEY it reports configured:false and the app uses animated backgrounds.
export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get('topic') || 'foryou'
  const effective = topic === 'saved' ? 'foryou' : topic
  if (!(effective in TOPIC_QUERIES)) return NextResponse.json({ error: 'Unknown topic' }, { status: 400 })

  const limit = await rateLimit(`videos:${clientIp(request.headers)}`, 60, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const key = process.env.PEXELS_API_KEY
  const attribution = { text: 'Videos provided by Pexels', url: 'https://www.pexels.com' }
  if (!key) return NextResponse.json({ configured: false, videos: [], attribution })

  try {
    const videos = await fetchTopicVideos(effective, key)
    return NextResponse.json({ configured: true, videos, attribution })
  } catch {
    // Pexels down, rate-limited or bad key: the feed keeps working with animated backgrounds.
    return NextResponse.json({ configured: true, videos: [], attribution, error: 'Video service unavailable right now' })
  }
}
