// POST /api/ai  { message, history?, lang?, passage?, kids? }  ->  { response, sources, provider, mode }
//   mode: 'llm' (model answer) | 'cache' (re-used answer, zero tokens) | 'sources' (built from retrieved sources only)
// With { promptOnly: true } it returns { system, history, sources } so the browser can run an on-device model instead.
// `passage` is a verse reference like "2:255" or "12:4-18"; the server looks up the actual text itself,
// so the client can never inject arbitrary instructions through it.

import { NextRequest, NextResponse } from 'next/server'
import { askAI, prepareAI, sanitizeHistory } from '@/lib/ai'
import { dataAvailable, getVerses } from '@/lib/data'
import { clientIp, rateLimit } from '@/lib/ratelimit'

function passageContext(ref: unknown, lang: string): string | undefined {
  if (typeof ref !== 'string' || !dataAvailable()) return undefined
  const m = /^(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/.exec(ref.trim())
  if (!m) return undefined
  const surah = Number(m[1])
  const from = Number(m[2])
  const to = Math.min(Number(m[3] ?? m[2]), from + 24) // cap passage length
  if (surah < 1 || surah > 114 || from < 1) return undefined
  const verses = getVerses(surah, lang, from, to)
  if (!verses.length) return undefined
  return verses.map((v) => `Quran ${v.verse_key}: ${v.text_uthmani}\n${v.translations[0]?.text ?? ''}`).join('\n')
}

export async function POST(request: NextRequest) {
  const limit = await rateLimit(`ai:${clientIp(request.headers)}`, 15, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'You are asking very quickly — please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  let body: { message?: unknown; history?: unknown; lang?: unknown; passage?: unknown; kids?: unknown; promptOnly?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }
  const { message, history, lang, passage, kids, promptOnly } = body ?? {}

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Please provide a message' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message is too long. Please keep it under 2000 characters.' }, { status: 400 })
  }

  const language = typeof lang === 'string' ? lang : 'en'
  try {
    if (promptOnly === true) {
      const p = prepareAI({
        message: message.trim(),
        history: sanitizeHistory(history),
        lang: language,
        context: passageContext(passage, language),
        kids: kids === true,
      })
      return NextResponse.json({ system: p.system, history: p.history, sources: p.sources })
    }
    const result = await askAI({
      message: message.trim(),
      history: sanitizeHistory(history),
      lang: language,
      context: passageContext(passage, language),
      kids: kids === true,
    })
    return NextResponse.json({ response: result.answer, sources: result.sources, provider: result.provider, mode: result.mode })
  } catch (error) {
    console.error('AI API Error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
