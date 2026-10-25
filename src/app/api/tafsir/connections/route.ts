import { NextRequest, NextResponse, connection } from 'next/server'
import { dataAvailable, getSurahs, getVerses, searchQuranText } from '@/lib/data'
import { fetchTafsir } from '@/lib/tafsir-server'
import { extractRefs, refLabel } from '@/lib/tafsir-refs'
import { LANGUAGES } from '@/lib/language-list'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// Verses connected to one verse: the ones the commentary itself points to (read from Ibn Kathir), and others close in meaning.
// GET /api/tafsir/connections?key=2:255[&lang=en]
export async function GET(request: NextRequest) {
  await connection()
  const limit = await rateLimit(`tafsir-conn:${clientIp(request.headers)}`, 60, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const sp = request.nextUrl.searchParams
  const key = sp.get('key') || ''
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(key)
  if (!m || !dataAvailable()) return NextResponse.json({ error: 'Invalid verse key' }, { status: 400 })
  const surah = Number(m[1])
  const ayah = Number(m[2])
  const langParam = sp.get('lang') || 'en'
  const lang = LANGUAGES.some((l) => l.code === langParam) ? langParam : 'en'
  const counts = getSurahs().map((s) => s.verses_count)
  if (surah < 1 || surah > 114 || ayah < 1 || ayah > (counts[surah - 1] ?? 0)) return NextResponse.json({ error: 'No such verse' }, { status: 400 })

  const show = (s: number, from: number, to: number) => {
    const vs = getVerses(s, lang, from, Math.min(to, from + 5))
    if (!vs.length) return null
    return {
      ref: `${s}:${from}${to > from ? '–' + to : ''}`,
      surah: s,
      from,
      arabic: vs.map((v) => v.text_uthmani).join(' '),
      text: vs.map((v) => v.translations[0]?.text ?? '').join(' '),
      truncated: to - from > 5,
    }
  }

  // 1. The commentary's own links.
  const tafsir = await fetchTafsir(key, 169)
  const refs = tafsir ? extractRefs(tafsir.paragraphs.join('\n\n'), counts, { surah, ayah }) : []
  const pointed = refs.flatMap((r) => {
    const v = show(r.surah, r.from, r.to)
    return v ? [{ ...v, mentions: r.count }] : []
  })

  // 2. Close in meaning (the verse's own words searched across the Quran), without repeating the above or the verse itself.
  const own = getVerses(surah, 'en', ayah, ayah)[0]
  const seen = new Set(pointed.map((p) => `${p.surah}:${p.from}`))
  seen.add(key)
  const similar = own?.translations[0]?.text
    ? searchQuranText(own.translations[0].text.slice(0, 200), 12, 'en')
        .filter((r) => !seen.has(r.key))
        .slice(0, 5)
        .flatMap((r) => {
          const [s, a] = r.key.split(':').map(Number)
          const v = show(s, a, a)
          return v ? [v] : []
        })
    : []

  return NextResponse.json({ key, pointed, similar, labels: refs.map(refLabel) }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
}
