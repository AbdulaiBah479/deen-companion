import { NextRequest, NextResponse } from 'next/server'
import { getHadithSections, getLocalHadithRange } from '@/lib/data'
import { editionId, isBookId } from '@/lib/hadith'

// GET /api/hadith/section?book=bukhari&n=8&lang=en&offset=0&limit=20 -> the hadith of one chapter, a page at a time
const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'
type Item = { hadithnumber: number; text: string; arabic?: string; grade?: string }

async function fromCdn(edition: string, n: number): Promise<Item[] | null> {
  try {
    const res = await fetch(`${CDN}/${edition}/sections/${n}.json`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const data = (await res.json()) as { hadiths?: { hadithnumber: number; text?: string; grades?: { name?: string; grade?: string }[] }[] }
    return (data.hadiths ?? [])
      .filter((h) => h.text && h.text.trim())
      .map((h) => ({ hadithnumber: h.hadithnumber, text: h.text!.trim(), grade: h.grades?.find((g) => g.grade)?.grade }))
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const book = sp.get('book') ?? ''
  const lang = sp.get('lang') || 'en'
  const n = Number(sp.get('n'))
  const offset = Math.max(0, Math.floor(Number(sp.get('offset') || 0)) || 0)
  const limit = Math.min(50, Math.max(1, Math.floor(Number(sp.get('limit') || 20)) || 20))
  if (!isBookId(book) || !Number.isInteger(n) || n < 0) return NextResponse.json({ error: 'Invalid collection or chapter' }, { status: 400 })

  const section = getHadithSections(book)?.find((s) => s.id === n)
  if (!section) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })

  // The translation (English from the bundled files when possible) and the Arabic original, fetched together.
  const arabicP = lang === 'ar' ? Promise.resolve(null) : fromCdn(editionId(book, 'ar'), n)
  let items: Item[] | null = lang === 'en' ? getLocalHadithRange(book, section.first, section.last) : null
  if (!items) items = await fromCdn(editionId(book, lang), n)
  if (!items && lang !== 'en') items = await fromCdn(editionId(book, 'en'), n) // no translation in that language: show English
  const arabic = await arabicP
  if (items && arabic) {
    const byNumber = new Map(arabic.map((a) => [a.hadithnumber, a]))
    items = items.map((h) => ({ ...h, arabic: byNumber.get(h.hadithnumber)?.text, grade: h.grade ?? byNumber.get(h.hadithnumber)?.grade }))
  }
  if (!items) return NextResponse.json({ error: 'The hadith could not be loaded. Please try again.' }, { status: 502 })

  const page = items.slice(offset, offset + limit)
  return NextResponse.json({
    book,
    section: { id: section.id, name: section.name, count: items.length },
    hadiths: page,
    nextOffset: offset + limit < items.length ? offset + limit : null,
  })
}
