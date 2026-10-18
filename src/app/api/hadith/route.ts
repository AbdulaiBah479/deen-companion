import { NextRequest, NextResponse } from 'next/server'
import { dayOfYear, fetchHadith, HADITH_BOOKS, isBookId } from '@/lib/hadith'
import { dataAvailable, getLocalHadith, hadithOfDay } from '@/lib/data'

// GET /api/hadith?date=YYYY-MM-DD              -> hadith of the day (Bukhari), same for everyone on that date
// GET /api/hadith?book=muslim&number=5&lang=ur -> a specific hadith (lang falls back to English)
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const book = sp.get('book')
  const lang = sp.get('lang') || 'en'

  if (!book) {
    const date = sp.get('date')
    if (date !== null && !/^d{4}-d{2}-d{2}$/.test(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
    const day = date ?? new Date().toISOString().slice(0, 10)
    const pick = dataAvailable() ? hadithOfDay(day) : null
    const n = pick?.number ?? dayOfYear()
    const hadith = lang === 'en' && pick ? { hadithnumber: n, text: pick.text } : await fetchHadith('bukhari', n, lang)
    return NextResponse.json({ hadith, book: 'Sahih al-Bukhari', daily: true })
  }

  const number = Number(sp.get('number'))
  if (!isBookId(book) || !Number.isInteger(number) || number < 1) {
    return NextResponse.json({ error: 'Invalid book or number' }, { status: 400 })
  }
  const name = HADITH_BOOKS.find((b) => b.id === book)!.name

  if (lang === 'en' && dataAvailable()) {
    const local = getLocalHadith(book, number)
    if (local) return NextResponse.json({ hadith: { hadithnumber: number, text: local }, book: name })
  }
  const hadith = await fetchHadith(book, number, lang)
  if (!hadith) return NextResponse.json({ error: 'Hadith not found' }, { status: 404 })
  return NextResponse.json({ hadith, book: name })
}
