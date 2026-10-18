import { NextRequest, NextResponse } from 'next/server'
import { dataAvailable, isLang } from '@/lib/data'
import { isTopic, reelPage, type NameRow } from '@/lib/reels'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// Names of Allah (AlAdhan), fetched once and kept; reels still work without them.
let namesCache: { at: number; rows: NameRow[] } | null = null
async function getNames(): Promise<NameRow[]> {
  if (namesCache && Date.now() - namesCache.at < 24 * 3600_000) return namesCache.rows
  try {
    const res = await fetch('https://api.aladhan.com/v1/asmaAlHusna', { signal: AbortSignal.timeout(6000), next: { revalidate: 604800 } })
    const data = await res.json()
    const rows: NameRow[] = (data.data || []).map((n: { name: string; transliteration: string; number: number; en: { meaning: string } }) => ({
      number: n.number,
      arabic: n.name,
      transliteration: n.transliteration,
      meaning: n.en.meaning,
    }))
    namesCache = { at: Date.now(), rows }
    return rows
  } catch {
    return namesCache?.rows ?? []
  }
}

// GET /api/reels?topic=foryou&cursor=0&seed=123&lang=en  ->  { items, next }
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const topic = sp.get('topic') || 'foryou'
  const lang = sp.get('lang') || 'en'
  const cursor = Math.max(0, Math.floor(Number(sp.get('cursor') || 0)))
  const seed = Math.floor(Number(sp.get('seed') || 1)) % 1_000_000
  const limit = Math.min(Math.max(Math.floor(Number(sp.get('limit') || 8)), 1), 20)
  if (!isTopic(topic)) return NextResponse.json({ error: 'Unknown topic' }, { status: 400 })
  if (!isLang(lang)) return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })
  if (!Number.isFinite(cursor) || !Number.isFinite(seed)) return NextResponse.json({ error: 'Invalid cursor or seed' }, { status: 400 })
  if (!dataAvailable()) return NextResponse.json({ error: 'Data not installed. Run: npm run data' }, { status: 503 })

  const limitCheck = await rateLimit(`reels:${clientIp(request.headers)}`, 120, 60_000)
  if (!limitCheck.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const names = topic === 'foryou' ? await getNames() : []
  return NextResponse.json(reelPage({ topic, cursor, limit, seed, lang, names }))
}
