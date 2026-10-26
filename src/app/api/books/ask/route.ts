import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { runModel } from '@/lib/ai'
import { bookById } from '@/lib/books'
import { isArabicText, rank } from '@/lib/books-ask'
import { bookParagraphs } from '@/lib/books-server'
import { readJsonLimited } from '@/lib/http'
import { LANGUAGES } from '@/lib/language-list'
import { track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis, redisConfigured } from '@/lib/redis'

// Ask a question about ONE book. POST /api/books/ask { id, lang: 'en'|'ar', question, to? }
//   -> { answer: string | null, excerpts: [{ page, para, text }], note? }
// The passages that best match are found in the book itself; the answer is written only from them and points to them as [1], [2].
// When no AI is available the passages are still returned, so the visitor always gets the book's own words.
export async function POST(request: NextRequest) {
  const b = (await readJsonLimited(request, 1500)) as { id?: unknown; lang?: unknown; question?: unknown; to?: unknown } | null
  if (!b || typeof b.id !== 'string' || !bookById(b.id)) return NextResponse.json({ error: 'Unknown book' }, { status: 400 })
  const question = typeof b.question === 'string' ? b.question.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) : ''
  if (question.length < 3) return NextResponse.json({ error: 'Write your question first.' }, { status: 400 })
  const lang = b.lang === 'ar' ? 'ar' : 'en'
  const to = typeof b.to === 'string' && LANGUAGES.some((l) => l.code === b.to) ? b.to : 'en'
  const toName = LANGUAGES.find((l) => l.code === to)?.name ?? 'English'
  const book = bookById(b.id)!

  const paras = await bookParagraphs(b.id, lang)
  if (!paras) return NextResponse.json({ error: 'The book could not be loaded right now.' }, { status: 503 })

  const cacheKey = 'book:ask:v1:' + createHash('sha1').update(`${b.id}|${lang}|${to}|${question.toLowerCase()}`).digest('hex').slice(0, 24)
  if (redisConfigured()) {
    try {
      const [raw] = (await redis([['GET', cacheKey]])) as [string | null]
      if (raw) return NextResponse.json({ ...JSON.parse(raw), cached: true })
    } catch {}
  }
  const limit = await rateLimit(`book-ask:${clientIp(request.headers)}`, 6, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Please wait a moment and try again.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  track('books.ask')

  // An English question about an Arabic book is first turned into Arabic search words, so the words can match.
  let search = question
  if (lang === 'ar' && !isArabicText(question)) {
    const t = await runModel('Translate the question into Arabic. Output only the Arabic question, nothing else.', question)
    if (t && isArabicText(t.text)) search = t.text.slice(0, 300)
  }
  const hits = rank(paras.map((p) => p.text), search, 4)
  const excerpts = hits.map((h) => ({ page: paras[h.index].page, para: paras[h.index].para, text: paras[h.index].text.slice(0, 1500) }))
  if (!excerpts.length) {
    return NextResponse.json({ answer: null, excerpts: [], note: 'Nothing in this book matches those words. Try other words, or ask about a different part.' })
  }

  const system = [
    `You answer a question about the book “${book.title}” by ${book.author}, in ${toName}.`,
    'Use ONLY the numbered excerpts below. Every statement must come from them, and each sentence must end with the number of the excerpt it comes from, like [1] or [2].',
    'If the excerpts do not answer the question, say plainly that this book does not answer it in these passages. Do not use outside knowledge, do not add facts, and do not give fatwas.',
    'Keep it short and clear. No markdown symbols.',
  ].join('\n')
  const user = `QUESTION: ${question}\n\nEXCERPTS:\n${excerpts.map((e, i) => `[${i + 1}] ${e.text}`).join('\n\n')}`
  const r = await runModel(system, user)
  const answer = r ? r.text.replace(/\[(\d+)\]/g, (m, n: string) => (Number(n) >= 1 && Number(n) <= excerpts.length ? m : '')).trim() : null
  const payload = answer ? { answer, excerpts } : { answer: null, excerpts, note: 'The AI helper is busy, so here are the passages of the book that match your question.' }
  if (answer && redisConfigured()) redis([['SET', cacheKey, JSON.stringify(payload), 'EX', 7 * 86400]]).catch(() => {})
  return NextResponse.json(payload)
}
