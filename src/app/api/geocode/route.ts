import { NextRequest, NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/ratelimit'

const UA = 'DeenCompanion/0.1 (open-source Islamic app)'

// Place name -> coordinates, or (with ?lat&lng) coordinates -> place name, via OpenStreetMap Nominatim
// (free; requires a descriptive User-Agent and light use).
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const limit = await rateLimit(`geo:${clientIp(request.headers)}`, 20, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  if (sp.has('lat') && sp.has('lng')) return reverse(Number(sp.get('lat')), Number(sp.get('lng')))

  const q = (sp.get('q') || '').trim()
  if (q.length < 2 || q.length > 120) return NextResponse.json({ error: 'Enter a city or address' }, { status: 400 })

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=3&addressdetails=0`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) throw new Error(String(res.status))
    const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[]
    if (!rows.length) return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    return NextResponse.json({ results: rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), name: r.display_name })) })
  } catch {
    return NextResponse.json({ error: 'Location search is unavailable right now' }, { status: 502 })
  }
}

// Coordinates -> a short place name ("Cairo, Egypt") so the app can say where your prayer times are for.
async function reverse(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Bad coordinates' }, { status: 400 })
  }
  try {
    // Rounded to ~1 km: the cache is shared and no precise position goes upstream.
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(2)}&lon=${lng.toFixed(2)}&format=json&zoom=10&accept-language=en`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(String(res.status))
    const d = (await res.json()) as { address?: Record<string, string> }
    const a = d.address ?? {}
    const city = a.city || a.town || a.village || a.municipality || a.county || a.state || ''
    const name = [city, a.country].filter(Boolean).join(', ')
    if (!name) return NextResponse.json({ error: 'No name for that spot' }, { status: 404 })
    return NextResponse.json({ name, cc: typeof a.country_code === 'string' ? a.country_code.slice(0, 2) : undefined })
  } catch {
    return NextResponse.json({ error: 'Place lookup is unavailable right now' }, { status: 502 })
  }
}
