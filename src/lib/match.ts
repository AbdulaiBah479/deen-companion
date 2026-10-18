// Fuzzy matcher: given (possibly noisy) Arabic text from speech recognition, find the Quran verse(s) it came from.
// Uses character-trigram overlap, tolerant of missing/misheard words and of diacritic/spelling differences.
// Candidate documents are single verses plus pairs of consecutive verses (a recitation often spans two).

import { normalizeArabic } from './arabic'

export type MatchDoc = { surah: number; from: number; to: number; text: string }
export type MatchResult = MatchDoc & { score: number; key: string }

const trigrams = (s: string): Set<string> => {
  const t = ` ${s} `
  const out = new Set<string>()
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3))
  return out
}

export class VerseMatcher {
  private docs: { doc: MatchDoc; grams: Set<string> }[] = []
  private index = new Map<string, number[]>()

  // verses: [verse_key "s:v", simple-arabic text]
  constructor(verses: [string, string][]) {
    const parsed = verses.map(([key, text]) => {
      const [s, v] = key.split(':').map(Number)
      return { s, v, text: normalizeArabic(text) }
    })
    const add = (doc: MatchDoc) => {
      const grams = trigrams(doc.text)
      const id = this.docs.length
      this.docs.push({ doc, grams })
      for (const g of grams) {
        const list = this.index.get(g)
        if (list) list.push(id)
        else this.index.set(g, [id])
      }
    }
    for (let i = 0; i < parsed.length; i++) {
      const a = parsed[i]
      add({ surah: a.s, from: a.v, to: a.v, text: a.text })
      const b = parsed[i + 1]
      if (b && b.s === a.s) add({ surah: a.s, from: a.v, to: b.v, text: `${a.text} ${b.text}` })
    }
  }

  find(query: string, limit = 5): MatchResult[] {
    const q = normalizeArabic(query)
    if (q.replace(/\s/g, '').length < 6) return []
    const qg = trigrams(q)
    const hits = new Map<number, number>()
    for (const g of qg) {
      const list = this.index.get(g)
      if (!list) continue
      // Skip extremely common trigrams: they add noise and cost.
      if (list.length > 4000) continue
      for (const id of list) hits.set(id, (hits.get(id) || 0) + 1)
    }
    const results: MatchResult[] = []
    for (const [id, shared] of hits) {
      const { doc, grams } = this.docs[id]
      const containment = shared / qg.size // how much of what was heard is in this verse
      const dice = (2 * shared) / (qg.size + grams.size)
      let score = 0.7 * containment + 0.3 * dice
      // A contiguous phrase match is stronger evidence than scattered trigram overlap, and recitations
      // usually start at the beginning of a verse.
      if (q.length >= 10 && doc.text.includes(q)) score += 0.12
      if (doc.text.startsWith(q.split(' ').slice(0, 2).join(' '))) score += 0.05
      results.push({ ...doc, score, key: doc.from === doc.to ? `${doc.surah}:${doc.from}` : `${doc.surah}:${doc.from}-${doc.to}` })
    }
    results.sort((a, b) => b.score - a.score)
    // Prefer the tightest match when a pair and its single verse score the same.
    const seen = new Set<string>()
    const out: MatchResult[] = []
    for (const r of results) {
      if (seen.has(r.key)) continue
      seen.add(r.key)
      out.push(r)
      if (out.length >= limit) break
    }
    return out
  }
}
