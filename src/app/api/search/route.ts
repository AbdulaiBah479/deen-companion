import { NextRequest, NextResponse } from 'next/server'
import { track } from '@/lib/ops'
import { dataAvailable, isLang, searchHadithText, searchQuranText } from '@/lib/data'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// Full-text search over the bundled Quran (English meaning search, shown in the chosen language) and hadith.
export async function GET(request: NextRequest) {
  track('search')
  const sp = request.nextUrl.searchParams
  const q = (sp.get('q') || '').trim()
  const lang = sp.get('lang') || 'en'
  if (q.length < 2 || q.length > 200) return NextResponse.json({ error: 'Enter at least 2 characters' }, { status: 400 })
  if (!isLang(lang)) return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })
  if (!dataAvailable()) return NextResponse.json({ error: 'Data not installed. Run: npm run data' }, { status: 503 })

  const limit = await rateLimit(`search:${clientIp(request.headers)}`, 60, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const quran = searchQuranText(q, 10, lang).map((r) => ({ key: r.key, arabic: r.arabic, text: r.text }))
  const hadith = searchHadithText(q, 8).map((h) => ({
    book: h.book,
    bookId: h.bookId,
    number: h.number,
    text: h.text.length > 500 ? h.text.slice(0, 500) + '…' : h.text,
  }))
  return NextResponse.json({ quran, hadith })
}
