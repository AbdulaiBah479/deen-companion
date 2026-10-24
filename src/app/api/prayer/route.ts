import { NextRequest, NextResponse } from 'next/server'
import { track } from '@/lib/ops'
import { getPrayerTimes, getPrayerTimesByCoords } from '@/lib/prayer'

// GET /api/prayer?city=London&country=UK&method=2   or   /api/prayer?lat=51.5&lng=-0.12&method=2
export async function GET(request: NextRequest) {
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
    times = await getPrayerTimes(sp.get('city') || 'London', sp.get('country') || 'UK', method)
  }

  if (!times) {
    return NextResponse.json({ error: 'Could not load prayer times for that location' }, { status: 404 })
  }
  return NextResponse.json({ times })
}
