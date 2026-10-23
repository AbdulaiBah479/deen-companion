import { NextRequest, NextResponse } from 'next/server'
import { distanceKm } from '@/lib/geo'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis, redisConfigured } from '@/lib/redis'

// Nearby mosques from OpenStreetMap. Community-mapped data, so coverage varies by region.
// Sources, in order: Overpass API mirrors (rich tags) -> Nominatim search (separate OSM service) -> last good result.
// The public Overpass servers are often overloaded, hence the fallbacks.

type Mosque = {
  id: string
  name: string
  lat: number
  lng: number
  distanceKm: number
  address?: string
  website?: string
  phone?: string
  denomination?: string
}

const UA = 'DeenCompanion/0.1 (open-source Islamic app)'
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

async function fromOverpassMirror(url: string, lat: number, lng: number, radius: number): Promise<Mosque[]> {
  const query = `[out:json][timeout:20];(
    nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
    nwr["building"="mosque"](around:${radius},${lat},${lng});
  );out center 60;`
  {
    {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(9000),
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`${url} -> ${res.status}`)
      const data = (await res.json()) as { elements: Element[] }
      return data.elements.flatMap((e): Mosque[] => {
        const p = e.center ?? (e.lat !== undefined && e.lon !== undefined ? { lat: e.lat, lon: e.lon } : null)
        if (!p) return []
        const t = e.tags ?? {}
        return [
          {
            id: `${e.type}/${e.id}`,
            name: t['name:en'] || t.name || 'Mosque (unnamed)',
            lat: p.lat,
            lng: p.lon,
            distanceKm: distanceKm(lat, lng, p.lat, p.lon),
            address: [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ') || undefined,
            website: t.website || t['contact:website'] || undefined,
            phone: t.phone || t['contact:phone'] || undefined,
            denomination: t.denomination || undefined,
          },
        ]
      })
    }
  }
}

type NominatimRow = {
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  name?: string
  type?: string
  address?: { road?: string; house_number?: string; city?: string; town?: string; suburb?: string }
}

async function fromNominatim(lat: number, lng: number, radius: number): Promise<Mosque[]> {
  const dLat = radius / 111_000
  const dLng = radius / (111_000 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)))
  const viewbox = [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map((n) => n.toFixed(5)).join(',')
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=mosque&format=jsonv2&limit=40&bounded=1&viewbox=${viewbox}&addressdetails=1`,
    { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000), cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`nominatim ${res.status}`)
  const rows = (await res.json()) as NominatimRow[]
  return rows
    .filter((r) => r.type === 'place_of_worship' || r.type === 'mosque')
    .map((r) => {
      const a = r.address ?? {}
      return {
        id: `${r.osm_type}/${r.osm_id}`,
        name: r.name || 'Mosque (unnamed)',
        lat: Number(r.lat),
        lng: Number(r.lon),
        distanceKm: distanceKm(lat, lng, Number(r.lat), Number(r.lon)),
        address: [a.house_number, a.road, a.city || a.town || a.suburb].filter(Boolean).join(' ') || undefined,
      }
    })
}

// Ask every Overpass mirror and Nominatim at the same time. Nominatim is usually the quickest; Overpass has richer details,
// so if Nominatim answers first we give Overpass a short head start before settling for it.
async function lookup(lat: number, lng: number, radius: number): Promise<{ mosques: Mosque[]; source: string }> {
  const settle = <T,>(p: Promise<T>) => p.then((v) => ({ ok: true as const, v }), () => ({ ok: false as const, v: undefined as T | undefined }))
  const overpass = settle(
    Promise.any(OVERPASS.map((u) => fromOverpassMirror(u, lat, lng, radius).then((r) => (r.length ? r : Promise.reject(new Error('empty')))))).then((r) => tidy(r, radius))
  )
  const nominatim = settle(fromNominatim(lat, lng, radius).then((r) => tidy(r, radius)))
  const good = (r: { ok: boolean; v?: Mosque[] }) => r.ok && !!r.v?.length
  const first = await Promise.race([overpass.then((r) => ['overpass', r] as const), nominatim.then((r) => ['nominatim', r] as const)])
  if (first[0] === 'overpass' && good(first[1])) return { mosques: first[1].v!, source: 'overpass' }
  if (first[0] === 'nominatim' && good(first[1])) {
    const o = await Promise.race([overpass, new Promise<null>((r) => setTimeout(() => r(null), 2500))])
    if (o && good(o)) return { mosques: o.v!, source: 'overpass' }
    return { mosques: first[1].v!, source: 'nominatim' }
  }
  const [o, n] = await Promise.all([overpass, nominatim])
  if (good(o)) return { mosques: o.v!, source: 'overpass' }
  if (good(n)) return { mosques: n.v!, source: 'nominatim' }
  if (n.ok || o.ok) return { mosques: [], source: n.ok ? 'nominatim' : 'overpass' }
  throw new Error('no map service answered')
}

const lastGood = new Map<string, { at: number; mosques: Mosque[]; source: string }>()

function tidy(list: Mosque[], radius: number): Mosque[] {
  const seen = new Set<string>()
  return list
    .filter((m) => m.distanceKm * 1000 <= radius * 1.05)
    .filter((m) => {
      const k = `${m.name}|${m.lat.toFixed(4)}|${m.lng.toFixed(4)}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 40)
}

export const maxDuration = 30

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  if (!sp.has('lat') || !sp.has('lng')) {
    return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 })
  }
  const lat = Number(sp.get('lat'))
  const lng = Number(sp.get('lng'))
  const radius = Math.min(Math.max(Number(sp.get('radius') || 3000), 500), 10000)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(radius)) {
    return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 })
  }
  const limit = await rateLimit(`mosque:${clientIp(request.headers)}`, 15, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${radius}`
  const cached = lastGood.get(cacheKey)
  if (cached && Date.now() - cached.at < 30 * 60_000) {
    return NextResponse.json({ mosques: cached.mosques, radius, source: cached.source, cached: true })
  }

  // Shared across servers for a day (mosques rarely move): the next person nearby gets an instant answer.
  const sharedKey = 'mosques:' + cacheKey
  if (redisConfigured()) {
    try {
      const [hit] = (await redis([['GET', sharedKey]])) as [string | null]
      if (hit) {
        const v = JSON.parse(hit) as { mosques: Mosque[]; source: string }
        lastGood.set(cacheKey, { at: Date.now(), ...v })
        return NextResponse.json({ mosques: v.mosques, radius, source: v.source, cached: true })
      }
    } catch {}
  }
  try {
    const { mosques, source } = await lookup(lat, lng, radius)
    lastGood.set(cacheKey, { at: Date.now(), mosques, source })
    if (mosques.length && redisConfigured()) redis([['SET', sharedKey, JSON.stringify({ mosques, source }), 'EX', 86_400]]).catch(() => {})
    return NextResponse.json({ mosques, radius, source })
  } catch (e) {
    console.warn('mosque lookup failed:', e instanceof Error ? e.message : e)
  }
  if (cached) return NextResponse.json({ mosques: cached.mosques, radius, source: cached.source, cached: true, stale: true })
  return NextResponse.json({ error: 'The map service is busy right now. Please try again in a minute.' }, { status: 502 })
}
