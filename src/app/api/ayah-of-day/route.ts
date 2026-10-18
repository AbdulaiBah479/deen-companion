import { NextRequest, NextResponse } from 'next/server'
import { dataAvailable, isLang, verseOfDay } from '@/lib/data'

// GET /api/ayah-of-day?date=YYYY-MM-DD&lang=en — the same verse for everyone on a given date.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const date = sp.get('date') || ''
  const lang = sp.get('lang') || 'en'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  if (!isLang(lang)) return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })
  if (!dataAvailable()) return NextResponse.json({ error: 'Data not installed. Run: npm run data' }, { status: 503 })
  return NextResponse.json({ verse: verseOfDay(date, lang) })
}
