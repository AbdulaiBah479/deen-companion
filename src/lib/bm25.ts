// Small in-memory BM25 text search (no dependencies). Good enough for ~15k short documents.

import { buildSynonymIndex } from './synonyms'

const STOP = new Set(
  (
    'a an the and or but if then of to in on at by for with from as is are was were be been being it its this that these those ' +
    'i me my we our you your he him his she her they them their what which who whom whose how why when where do does did done ' +
    'can could should would will shall may might must not no nor so than too very just about into over under again also any ' +
    'tell say said explain please there here have has had get gets got one all some such only own same both each more most other'
  ).split(' ')
)

export function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2)
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

// neighbour -> neighbor, honour -> honor, behaviour -> behavior (the Saheeh translation uses American spelling).
export function americanize(w: string): string {
  return w.length >= 6 ? w.replace(/our(s|ed|ing)?$/, "or$1") : w
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (Allāh -> allah)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem)
}

let SYNONYMS: Map<string, string[]> | null = null
function synonymsFor(term: string): string[] {
  if (!SYNONYMS) SYNONYMS = buildSynonymIndex((w) => tokenize(w)[0] ?? '')
  return SYNONYMS.get(term) ?? []
}

export class BM25 {
  private tf: Map<string, number>[] = []
  private len: number[] = []
  private df = new Map<string, number>()
  private postings = new Map<string, number[]>()
  private avgLen = 0
  private k1: number
  private b: number

  constructor(docs: string[], k1 = 1.4, b = 0.75) {
    this.k1 = k1
    this.b = b
    let total = 0
    docs.forEach((d, i) => {
      const toks = tokenize(d)
      const tf = new Map<string, number>()
      for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1)
      this.tf.push(tf)
      this.len.push(toks.length)
      total += toks.length
      for (const t of tf.keys()) {
        this.df.set(t, (this.df.get(t) || 0) + 1)
        const p = this.postings.get(t)
        if (p) p.push(i)
        else this.postings.set(t, [i])
      }
    })
    this.avgLen = total / Math.max(1, docs.length)
  }

  // minCoverage: fraction of the distinct query terms a document must contain (0 = any single term).
  search(query: string, limit = 5, minCoverage = 0): { index: number; score: number; matched: number; terms: number }[] {
    const qt = [...new Set(tokenize(query))]
    const N = this.tf.length
    const scores = new Map<number, number>()
    const matchedTerms = new Map<number, number>()
    const SYN_WEIGHT = 0.55
    for (const t of qt) {
      // A document "has" this query term if it contains the term itself or one of its synonyms.
      const seenForTerm = new Set<number>()
      const variants: [string, number][] = [[t, 1], ...synonymsFor(t).map((x): [string, number] => [x, SYN_WEIGHT])]
      for (const [v, weight] of variants) {
        const post = this.postings.get(v)
        if (!post) continue
        const df = this.df.get(v)!
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
        for (const i of post) {
          const f = this.tf[i].get(v)!
          const norm = (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * this.len[i]) / this.avgLen))
          scores.set(i, (scores.get(i) || 0) + weight * idf * norm)
          if (!seenForTerm.has(i)) {
            seenForTerm.add(i)
            matchedTerms.set(i, (matchedTerms.get(i) || 0) + 1)
          }
        }
      }
    }
    const need = Math.max(1, Math.ceil(qt.length * minCoverage - 1e-9))
    return [...scores.entries()]
      .map(([index, score]) => ({ index, score, matched: matchedTerms.get(index) || 0, terms: qt.length }))
      .filter((r) => r.matched >= need)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}
