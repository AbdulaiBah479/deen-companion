import type { Evidence } from './khutbah-build'
import type { Topic } from './khutbah'

// The writing side of the sermon builder: the headings, reading a model's draft back safely, and the plain outline
// that is used when no model is available. Pure functions, tested in tests/khutbah.test.mts.

export type Section = { heading: string; body: string }
export const HEADINGS = ['Introduction', 'First point', 'Second point', 'Third point', 'Conclusion and dua'] as const

const headingRe = (h: string) => new RegExp('^\\W*' + h + '\\W*$', 'im')

// Reads a draft written under the five headings. Anything else (missing heading, tiny body) means the draft is not used.
export function parseDraft(text: string): Section[] | null {
  const out: Section[] = []
  for (let i = 0; i < HEADINGS.length; i++) {
    const start = text.search(headingRe(HEADINGS[i]))
    if (start < 0) return null
    const after = text.slice(start).replace(/^[^\n]*\n/, '')
    const next = HEADINGS.slice(i + 1).map((h) => after.search(headingRe(h))).filter((n) => n >= 0)
    const body = dropHeading((next.length ? after.slice(0, Math.min(...next)) : after).replace(/[*#_]/g, '').trim(), HEADINGS[i])
    if (body.length < 40) return null
    out.push({ heading: HEADINGS[i], body })
  }
  return out
}

// Some models repeat the heading as the first line of its own text; that line is removed.
export function dropHeading(body: string, heading: string): string {
  const same = (l: string) => l.replace(/[^a-z ]/gi, '').trim().toLowerCase() === heading.toLowerCase()
  return body.split('\n').filter((l) => !same(l)).join('\n').trim()
}

// A draft may only point at evidence that exists: [Q7] when there is no Q7 is removed.
export function keepKnownMarkers(body: string, evidence: Evidence[]): string {
  const known = new Set(evidence.map((e) => e.id))
  return body
    .replace(/\[((?:Q|H)\d+)\]/g, (m, id: string) => (known.has(id) ? m : ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .trim()
}

// Words the model is asked to write for a length in minutes (the sermon is about 130 words a minute spoken).
export const wordsFor = (minutes: number) => Math.round(minutes * 130)

// The outline when no model can write: the topic's own points, each with the words of a verse or hadith under it.
export function outlineDraft(topic: Pick<Topic, 'title' | 'points' | 'blurb'>, evidence: Evidence[]): Section[] {
  const quran = evidence.filter((e) => e.kind === 'quran')
  const hadith = evidence.filter((e) => e.kind === 'hadith')
  const points = topic.points.slice(0, 3)
  while (points.length < 3) points.push(topic.blurb)
  const sections: Section[] = [
    { heading: 'Introduction', body: `${topic.blurb} Today we reflect on this: ${topic.title}.` },
  ]
  points.forEach((p, i) => {
    const q = quran[i]
    const h = hadith[i]
    const lines = [p]
    if (q) lines.push(`Allah says: “${q.text}” [${q.id}]`)
    if (h) lines.push(`The Messenger of Allah ﷺ said, as recorded in ${h.ref}: “${h.text}” [${h.id}]`)
    sections.push({ heading: HEADINGS[i + 1], body: lines.join('\n\n') })
  })
  sections.push({ heading: 'Conclusion and dua', body: 'Let us hold on to what we have heard and act on it. O Allah, make us among those who listen to the word and follow the best of it. Forgive our sins, guide our hearts, and have mercy on us and on all the believers. Ameen.' })
  return sections
}

// Plain text of a whole sermon, for copying, downloading and printing.
export function sermonText(title: string, parts: { label: string; arabic?: string; text: string }[]): string {
  return [title, '', ...parts.flatMap((p) => [p.label.toUpperCase(), ...(p.arabic ? [p.arabic] : []), p.text, ''])].join('\n').trim() + '\n'
}
