import { NextRequest, NextResponse } from 'next/server'
import { dataAvailable, getVerses, isLang } from '@/lib/data'
import { getSurahVerses } from '@/lib/quran'

export async function GET(request: NextRequest, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params
  const num = Number(n)
  if (!Number.isInteger(num) || num < 1 || num > 114) {
    return NextResponse.json({ error: 'Surah must be 1-114' }, { status: 400 })
  }
  const lang = request.nextUrl.searchParams.get('lang') || 'en'
  if (!isLang(lang)) return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })

  const verses = dataAvailable() ? getVerses(num, lang) : await getSurahVerses(num)
  return NextResponse.json({ verses })
}
