import { NextRequest, NextResponse, connection } from 'next/server'
import { bookPage } from '@/lib/books-server'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// One page of a shelf book. GET /api/books/page?id=munqidh&lang=en|ar&page=1
export async function GET(request: NextRequest) {
  await connection()
  const limit = await rateLimit(`book-page:${clientIp(request.headers)}`, 90, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const sp = request.nextUrl.searchParams
  const lang = sp.get('lang') === 'ar' ? 'ar' : 'en'
  const p = await bookPage(sp.get('id') ?? '', lang, Number(sp.get('page') || 1))
  if (!p) return NextResponse.json({ error: 'This book is not available in that language, or could not be loaded right now.' }, { status: 404 })
  return NextResponse.json(p, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
}
