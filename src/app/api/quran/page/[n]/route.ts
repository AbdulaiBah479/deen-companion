import { NextRequest, NextResponse } from 'next/server'
import { dataAvailable, getPage, isLang, metaAvailable } from '@/lib/data'

// One page of the 604-page Madani mushaf layout: verses (with surah headers) that fall on that page.
export async function GET(request: NextRequest, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params
  const page = Number(n)
  if (!Number.isInteger(page) || page < 1 || page > 604) {
    return NextResponse.json({ error: 'Page must be 1-604' }, { status: 400 })
  }
  const lang = request.nextUrl.searchParams.get('lang') || 'en'
  if (!isLang(lang)) return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })
  if (!dataAvailable() || !metaAvailable()) return NextResponse.json({ error: 'Data not installed. Run: npm run data' }, { status: 503 })
  return NextResponse.json(getPage(page, lang))
}
