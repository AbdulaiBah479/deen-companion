import { NextRequest, NextResponse } from 'next/server'
import { track } from '@/lib/ops'
import { getPrayerTimes, getPrayerTimesByCoords } from '@/lib/prayer'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// GET /api/prayer?city=London&country=UK&method=2   or   /api/prayer?lat=51.5&lng=-0.12&method=2
export async function GET(request: NextRequest) {
  // Each different place is a fresh question to an outside service, so one visitor may only ask so many per minute.
  const limit = await rateLimit(`prayer:${clientIp(request.headers)}`, 60, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  track('prayer')
  const sp = request.nextUrl.searchParams
  const method = Number(sp.get('method') || 2)
  if (!Number.isInteger(method) || method < 0 || method > 23) {
    return NextResponse.json({ error: 'Invalid calculation method' }, { status: 400 })
  }

  let times
  if (sp.has('lat') || sp.has('lng')) {
    const lat = Number(sp.get('lat'))
    const lng = Number(sp.get('lng'))
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }
    times = await getPrayerTimesByCoords(lat, lng, method)
  } else {
    const city = sp.get('city') || 'London'
    const country = sp.get('country') || 'UK'
    if (city.length > 80 || country.length > 80 || [...city + country].some((ch) => ch < ' ' || ch === '<' || ch === '>')) return NextResponse.json({ error: 'Invalid place' }, { status: 400 })
    times = await getPrayerTimes(sp.get('city') || 'London', sp.get('country') || 'UK', method)
  }

  if (!times) {
    return NextResponse.json({ error: 'Could not load prayer times for that location' }, { status: 404 })
  }
  return NextResponse.json({ times })
}
