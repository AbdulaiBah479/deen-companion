import { NextRequest, NextResponse } from 'next/server'
import { defaultTafsirFor, isTafsirId } from '@/lib/tafsirs'
import { fetchTafsir } from '@/lib/tafsir-server'

// Tafsir for one verse, via api.quran.com, returned as plain-text paragraphs.
// GET /api/tafsir?key=2:255[&id=169][&lang=ur]  (id must be one of the listed sources; default follows the language)
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const key = sp.get('key') || ''
  if (!/^\d{1,3}:\d{1,3}$/.test(key)) {
    return NextResponse.json({ error: 'Invalid verse key' }, { status: 400 })
  }
  const idParam = sp.get('id')
  const id = idParam ? Number(idParam) : defaultTafsirFor(sp.get('lang') || 'en')
  if (!Number.isInteger(id) || !isTafsirId(id)) {
    return NextResponse.json({ error: 'Unknown tafsir' }, { status: 400 })
  }
  const t = await fetchTafsir(key, id)
  if (!t) return NextResponse.json({ error: 'No commentary for this verse in this tafsir, or it is unavailable right now' }, { status: 404 })
  return NextResponse.json({ source: t.source, id, paragraphs: t.paragraphs })
}
