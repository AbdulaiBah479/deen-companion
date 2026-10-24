import { NextRequest, NextResponse } from 'next/server'
import { dataAvailable, getVerses, isLang } from '@/lib/data'

// GET /api/quran/passage?surah=2&from=285&to=286&lang=en -> a few consecutive verses (Arabic + translation), at most 12.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const surah = Number(sp.get('surah'))
  const from = Number(sp.get('from'))
  const to = Number(sp.get('to') ?? sp.get('from'))
  const lang = sp.get('lang') || 'en'
  if (![surah, from, to].every(Number.isInteger) || surah < 1 || surah > 114 || from < 1 || to < from) return NextResponse.json({ error: 'Bad passage' }, { status: 400 })
  if (!isLang(lang)) return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })
  if (!dataAvailable()) return NextResponse.json({ error: 'Quran data is not available right now' }, { status: 503 })
  const verses = getVerses(surah, lang, from, Math.min(to, from + 11))
  if (!verses.length) return NextResponse.json({ error: 'No such verses' }, { status: 404 })
  return NextResponse.json({ verses }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } })
}
