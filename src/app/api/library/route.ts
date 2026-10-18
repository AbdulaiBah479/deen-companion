import { NextRequest, NextResponse } from 'next/server'
import { isSafeTitle } from '@/lib/library'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { wikiArticle, wikiSearch, wikiSummary } from '@/lib/wiki'

// GET /api/library?title=Hajj        -> full article (sections)
// GET /api/library?title=Hajj&brief=1 -> short summary only
// GET /api/library?q=battle of badr   -> search results
// Encyclopedic text from Wikipedia (CC BY-SA 4.0), fetched live and cached for a day.
const CACHE = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }
const ATTRIBUTION = { source: 'Wikipedia', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const limit = await rateLimit(`library:${clientIp(request.headers)}`, 60, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })

  try {
    const q = sp.get('q')
    if (q !== null) {
      const term = q.trim()
      if (term.length < 2 || term.length > 100) return NextResponse.json({ error: 'Type at least 2 letters' }, { status: 400 })
      return NextResponse.json({ results: await wikiSearch(term), attribution: ATTRIBUTION }, { headers: CACHE })
    }

    const title = (sp.get('title') || '').trim()
    if (!isSafeTitle(title)) return NextResponse.json({ error: 'Unknown article' }, { status: 400 })

    if (sp.get('brief')) {
      const s = await wikiSummary(title)
      if (!s) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
      return NextResponse.json({ summary: s, attribution: ATTRIBUTION }, { headers: CACHE })
    }
    const article = await wikiArticle(title)
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    return NextResponse.json({ article, attribution: ATTRIBUTION }, { headers: CACHE })
  } catch {
    return NextResponse.json({ error: 'The encyclopedia is busy right now. Please try again in a moment.' }, { status: 503 })
  }
}
