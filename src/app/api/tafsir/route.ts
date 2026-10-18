import { NextRequest, NextResponse } from 'next/server'
import { defaultTafsirFor, isTafsirId } from '@/lib/tafsirs'

// Tafsir for one verse, via api.quran.com, returned as plain-text paragraphs.
// GET /api/tafsir?key=2:255[&id=169][&lang=ur]  (id must be one of the listed sources; default follows the language)
function toParagraphs(html: string): string[] {
  return html
    .replace(/<\/(p|h[1-6]|li|div)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

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
  try {
    const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${key}`, { next: { revalidate: 604800 } })
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    const paragraphs = toParagraphs(data.tafsir?.text || '')
    if (!paragraphs.length) return NextResponse.json({ error: 'No commentary for this verse in this tafsir' }, { status: 404 })
    return NextResponse.json({ source: data.tafsir?.resource_name || 'Tafsir', id, paragraphs })
  } catch {
    return NextResponse.json({ error: 'Tafsir unavailable right now' }, { status: 502 })
  }
}
