import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { runModel } from '@/lib/ai'
import { dataAvailable } from '@/lib/data'
import { readJsonLimited } from '@/lib/http'
import { LANGUAGES } from '@/lib/language-list'
import { AUDIENCES, CLOSING_VERSE, HAJAH_VERSES, LENGTHS, SALAWAT_VERSE, topicById } from '@/lib/khutbah'
import { customEvidence, resolveVerse, topicEvidence, type Evidence } from '@/lib/khutbah-build'
import { HEADINGS, keepKnownMarkers, outlineDraft, parseDraft, wordsFor, type Section } from '@/lib/khutbah-text'
import { track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis, redisConfigured } from '@/lib/redis'

// A draft Friday or occasion sermon.
// POST /api/khutbah { topic?: "sincerity", custom?: "free text topic", minutes?: 5|10|15, lang?, audience? }
//   -> { title, sections: [{heading, body}], evidence: [...], fixed: {...}, source: 'ai' | 'outline', provider }
// The verses and hadith are copied from the app's own data. A model only writes the explanation around them, and may only
// point at the evidence it was given ([Q1], [H1]). With no model available, an outline built from the topic is returned.

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim()

export async function POST(request: NextRequest) {
  const body = (await readJsonLimited(request, 2000)) as { topic?: unknown; custom?: unknown; minutes?: unknown; lang?: unknown; audience?: unknown } | null
  if (!body || !dataAvailable()) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const topic = typeof body.topic === 'string' ? topicById(body.topic) : undefined
  const custom = typeof body.custom === 'string' ? clean(body.custom).slice(0, 100) : ''
  if (!topic && custom.length < 3) return NextResponse.json({ error: 'Choose a topic, or write one of at least 3 letters.' }, { status: 400 })
  const length = LENGTHS.find((l) => l.minutes === body.minutes) ?? LENGTHS[1]
  const lang = typeof body.lang === 'string' && LANGUAGES.some((l) => l.code === body.lang) ? body.lang : 'en'
  const langName = LANGUAGES.find((l) => l.code === lang)?.name ?? 'English'
  const audience = AUDIENCES.find((a) => a.id === body.audience) ?? AUDIENCES[0]

  const title = topic ? topic.title : custom
  const evidence: Evidence[] = topic ? topicEvidence(topic, lang) : customEvidence(custom, lang)
  const fixedVerse = (ref: string) => resolveVerse(ref, lang)
  const fixed = {
    hajah: HAJAH_VERSES.map((r) => ({ ref: r, ...fixedVerse(r) })),
    salawat: { ref: SALAWAT_VERSE, ...fixedVerse(SALAWAT_VERSE) },
    closing: { ref: CLOSING_VERSE, ...fixedVerse(CLOSING_VERSE) },
  }
  const respond = (sections: Section[], source: 'ai' | 'outline', provider: string | null, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ title, minutes: length.minutes, lang, sections, evidence, fixed, source, provider, ...extra })

  const outline = () => outlineDraft(topic ?? { title, blurb: `A reminder about ${title}.`, points: [`Reflect on ${title} in the light of the Quran and Sunnah.`, 'What the Quran says about it.', 'What the Prophet ﷺ taught about it.'] }, evidence)

  const cacheKey = 'khutbah:v1:' + createHash('sha1').update(`${topic?.id ?? custom.toLowerCase()}|${length.minutes}|${lang}|${audience.id}`).digest('hex').slice(0, 24)
  if (redisConfigured()) {
    try {
      const [raw] = (await redis([['GET', cacheKey]])) as [string | null]
      if (raw) return respond(JSON.parse(raw).sections, 'ai', JSON.parse(raw).provider, { cached: true })
    } catch {}
  }

  const limit = await rateLimit(`khutbah:${clientIp(request.headers)}`, 5, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Please wait a moment and try again.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })

  track('khutbah.make')
  const words = wordsFor(length.minutes)
  const evidenceText = evidence.map((e) => `[${e.id}] ${e.kind === 'quran' ? 'Quran ' : ''}${e.ref}: ${e.text}`).join('\n')
  const system = [
    `You help an imam prepare the main talk of a Friday or occasion sermon (khutbah), in ${langName}. Audience: ${audience.label}.`,
    `Write about ${words} words in total, in a warm, clear spoken style, as if the imam is speaking to the people. Short paragraphs.`,
    `Use exactly these five headings, each on its own line with nothing else on the line: ${HEADINGS.join(' / ')}. Then the text under each.`,
    'You are given the EVIDENCE below: verses and hadith with an id such as [Q1] or [H2]. When you rely on one, put its id in square brackets after the sentence, for example [Q2]. Do not quote the verse itself word for word; it will be shown beside the talk. Never use an id that is not in the list.',
    'Do not invent any verse, hadith, story, statistic, scholar quote, or ruling. If you are not sure something is established, leave it out. Do not give fatwas. Do not accuse any person or group of disbelief. No political campaigning, and nothing that calls for hatred or violence.',
    'If the topic is not suitable for a mosque sermon, write instead about mercy and good character.',
    'No markdown symbols, no lists with bullets, no emojis. The opening praise (khutbat al-hajah) and the closing verse are added separately, so do not write them.',
  ].join('\n')
  const user = [`TOPIC: ${title}`, topic ? `WHAT TO MAKE CLEAR (in this order):\n- ${topic.points.join('\n- ')}` : 'Choose three clear points that follow from the evidence.', `EVIDENCE:\n${evidenceText || '(none found; speak in general terms and do not cite)'}`].join('\n\n')

  const r = await runModel(system, user)
  const draft = r ? parseDraft(r.text) : null
  if (!r || !draft) return respond(outline(), 'outline', null)

  const sections = draft.map((s) => ({ heading: s.heading, body: keepKnownMarkers(s.body, evidence) }))
  if (redisConfigured()) redis([['SET', cacheKey, JSON.stringify({ sections, provider: r.provider }), 'EX', 30 * 86400]]).catch(() => {})
  return respond(sections, 'ai', r.provider)
}
