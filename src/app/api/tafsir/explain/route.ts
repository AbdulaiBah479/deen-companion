import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { isLevel, runModel, type Level } from '@/lib/ai'
import { dataAvailable, getSurahs, getVerses } from '@/lib/data'
import { readJsonLimited } from '@/lib/http'
import { LANGUAGES } from '@/lib/language-list'
import { track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis, redisConfigured } from '@/lib/redis'
import { fetchTafsir } from '@/lib/tafsir-server'

// A plain-language study of one verse, written ONLY from the verse and what the classical commentaries say about it.
// POST /api/tafsir/explain { key: "2:255", lang?, level? } -> { sections: [{title, body}], source: 'ai' | 'tafsir', provider }
// If no model is available the page still works: the first paragraphs of the commentary are returned as they are.
const HEADINGS = ['What it says', 'Key words', 'What the scholars add', 'Lessons for us']

const headingRe = (h: string) => new RegExp('^\\W*' + h + '\\W*$', 'im')

function parseSections(text: string): { title: string; body: string }[] | null {
  const out: { title: string; body: string }[] = []
  for (let i = 0; i < HEADINGS.length; i++) {
    const start = text.search(headingRe(HEADINGS[i]))
    if (start < 0) return null
    const after = text.slice(start).replace(/^[^\n]*\n/, '')
    const next = HEADINGS.slice(i + 1).map((h) => after.search(headingRe(h))).filter((n) => n >= 0)
    const body = (next.length ? after.slice(0, Math.min(...next)) : after).replace(/[*_#]/g, '').trim()
    if (body.length < 20) return null
    out.push({ title: HEADINGS[i], body })
  }
  return out
}

const DEPTH: Record<Level, string> = {
  simple: 'Use very simple words, as for a beginner or a child. Each section: 2 to 3 short sentences.',
  standard: 'Each section: 3 to 5 sentences, clear and warm.',
  deep: 'Each section: 5 to 8 sentences. Include the meaning of Arabic words and the differences between scholars when the commentary shows them.',
}

export async function POST(request: NextRequest) {
  const body = (await readJsonLimited(request, 2000)) as { key?: unknown; lang?: unknown; level?: unknown } | null
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(typeof body?.key === 'string' ? body.key : '')
  if (!body || !m || !dataAvailable()) return NextResponse.json({ error: 'Invalid verse key' }, { status: 400 })
  const surah = Number(m[1])
  const ayah = Number(m[2])
  const counts = getSurahs().map((s) => s.verses_count)
  if (surah < 1 || surah > 114 || ayah < 1 || ayah > (counts[surah - 1] ?? 0)) return NextResponse.json({ error: 'No such verse' }, { status: 400 })
  const key = `${surah}:${ayah}`
  const level: Level = isLevel(body.level) ? body.level : 'standard'
  const lang = typeof body.lang === 'string' && LANGUAGES.some((l) => l.code === body.lang) ? body.lang : 'en'
  const langName = LANGUAGES.find((l) => l.code === lang)?.name ?? 'English'

  const cacheKey = 'tafsir:ex:v1:' + createHash('sha1').update(`${key}|${lang}|${level}`).digest('hex').slice(0, 24)
  if (redisConfigured()) {
    try {
      const [raw] = (await redis([['GET', cacheKey]])) as [string | null]
      if (raw) return NextResponse.json({ ...JSON.parse(raw), cached: true })
    } catch {}
  }

  const verse = getVerses(surah, lang, ayah, ayah)[0]
  const verseEn = getVerses(surah, 'en', ayah, ayah)[0]
  // Two English commentaries give the model real material to work from: Ibn Kathir and Ma'arif al-Qur'an.
  const [ik, ma] = await Promise.all([fetchTafsir(key, 169), fetchTafsir(key, 168)])
  const material = [ik, ma].flatMap((t) => (t ? [`${t.source}:\n${t.paragraphs.join('\n').slice(0, 5000)}`] : []))
  const fallback = () => {
    const paras = ((ik ?? ma)?.paragraphs ?? []).filter((p) => p.length > 80).slice(0, 3)
    return paras.length ? [{ title: 'From the commentary', body: paras.join('\n\n') }] : []
  }
  if (!verse || !material.length) return NextResponse.json({ sections: fallback(), source: 'tafsir', provider: null })

  const limit = await rateLimit(`tafsir-ex:${clientIp(request.headers)}`, 10, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Please wait a moment and try again.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })

  track('tafsir.explain')
  const system = [
    `You are a careful teacher of the Quran explaining ONE verse to an ordinary reader, in ${langName}.`,
    'Use ONLY the verse and the commentary text given below. Do not add stories, rulings, numbers or hadith that are not in that text. If the commentary does not say something, do not say it.',
    'If scholars differ, say so plainly and do not pick a side. Never give a fatwa or a ruling for a personal situation.',
    `Write exactly these four headings, each on its own line with nothing else on that line: ${HEADINGS.join(' / ')}. Then the text of that section.`,
    DEPTH[level],
    'No markdown symbols, no bullet characters, no verse numbers in brackets.',
  ].join('\n')
  const user = `Verse ${key} (Arabic): ${verse.text_uthmani}\nTranslation: ${verse.translations[0]?.text ?? verseEn?.translations[0]?.text ?? ''}\n\nCOMMENTARY:\n${material.join('\n\n')}`
  const r = await runModel(system, user)
  const sections = r ? parseSections(r.text) : null
  if (!r || !sections) return NextResponse.json({ sections: fallback(), source: 'tafsir', provider: null })

  const payload = { sections, source: 'ai', provider: r.provider }
  if (redisConfigured()) redis([['SET', cacheKey, JSON.stringify(payload), 'EX', 30 * 86400]]).catch(() => {})
  return NextResponse.json(payload)
}
