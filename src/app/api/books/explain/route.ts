import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { runModel } from '@/lib/ai'
import { bookById } from '@/lib/books'
import { bookPage } from '@/lib/books-server'
import { readJsonLimited } from '@/lib/http'
import { LANGUAGES } from '@/lib/language-list'
import { track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis, redisConfigured } from '@/lib/redis'

// Helps with ONE paragraph of a shelf book: "translate" or "explain" in plain words.
// POST /api/books/explain { id, lang: 'en'|'ar', page, para, mode: 'translate'|'explain', to? } -> { text, provider }
// The paragraph is read by the server from the book itself; the visitor cannot send their own text, so this cannot be used as a free
// general-purpose model. Everything it returns is labelled as an AI aid on the page.
export async function POST(request: NextRequest) {
  const b = (await readJsonLimited(request, 1000)) as { id?: unknown; lang?: unknown; page?: unknown; para?: unknown; mode?: unknown; to?: unknown } | null
  if (!b || typeof b.id !== 'string' || !bookById(b.id)) return NextResponse.json({ error: 'Unknown book' }, { status: 400 })
  const lang = b.lang === 'ar' ? 'ar' : 'en'
  const mode = b.mode === 'translate' ? 'translate' : 'explain'
  const to = typeof b.to === 'string' && LANGUAGES.some((l) => l.code === b.to) ? b.to : 'en'
  const toName = LANGUAGES.find((l) => l.code === to)?.name ?? 'English'
  const page = Number(b.page)
  const para = Number(b.para)
  if (!Number.isInteger(page) || !Number.isInteger(para) || para < 0) return NextResponse.json({ error: 'Bad position' }, { status: 400 })

  const bp = await bookPage(b.id, lang, page)
  const text = bp?.page === page ? bp.paragraphs[para] : undefined
  if (!bp || !text) return NextResponse.json({ error: 'That passage was not found' }, { status: 404 })

  const cacheKey = 'book:ai:v1:' + createHash('sha1').update(`${b.id}|${lang}|${page}|${para}|${mode}|${to}`).digest('hex').slice(0, 24)
  if (redisConfigured()) {
    try {
      const [raw] = (await redis([['GET', cacheKey]])) as [string | null]
      if (raw) return NextResponse.json({ ...JSON.parse(raw), cached: true })
    } catch {}
  }
  const limit = await rateLimit(`book-ai:${clientIp(request.headers)}`, 10, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Please wait a moment and try again.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })

  track('books.ai')
  const book = bookById(b.id)!
  const system =
    mode === 'translate'
      ? `You translate a passage from the book “${book.title}” by ${book.author} into ${toName}. Translate faithfully and completely, in clear natural language. Keep the meaning, do not add commentary, and do not shorten. If a word is unclear, keep the original word in brackets. Output only the translation.`
      : `You explain a passage from the book “${book.title}” by ${book.author}, in ${toName}, to an ordinary reader. First say in two or three sentences what the passage means in plain words. Then, if needed, explain any difficult word or reference. Use only what is in the passage; do not invent facts, quotes or rulings, and do not give fatwas. If the passage is unclear, say so. No markdown symbols.`
  const r = await runModel(system, text.slice(0, 3500))
  if (!r) return NextResponse.json({ error: 'The AI helper is busy right now. Please try again in a little while.' }, { status: 503 })
  const payload = { text: r.text.trim(), provider: r.provider }
  if (redisConfigured()) redis([['SET', cacheKey, JSON.stringify(payload), 'EX', 30 * 86400]]).catch(() => {})
  return NextResponse.json(payload)
}
