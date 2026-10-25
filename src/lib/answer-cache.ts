// Small LRU cache with TTL for AI answers, so repeated questions cost no tokens at all.
// In-memory and per server instance; fine for a single deployment and harmless on several.

export class AnswerCache<T> {
  private map = new Map<string, { value: T; expires: number }>()
  private max: number
  private ttlMs: number
  private now: () => number

  constructor(max = 300, ttlMs = 24 * 3600_000, now: () => number = Date.now) {
    this.max = max
    this.ttlMs = ttlMs
    this.now = now
  }

  get(key: string): T | undefined {
    const hit = this.map.get(key)
    if (!hit) return undefined
    if (hit.expires <= this.now()) {
      this.map.delete(key)
      return undefined
    }
    // refresh recency
    this.map.delete(key)
    this.map.set(key, hit)
    return hit.value
  }

  set(key: string, value: T) {
    this.map.delete(key)
    this.map.set(key, { value, expires: this.now() + this.ttlMs })
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value as string
      this.map.delete(oldest)
    }
  }

  // Near-duplicate lookup: the same question with only polite/filler words added or removed ("… please", "could you tell me …",
  // "salam brother, …") reuses the cached answer. The remaining content words must be IDENTICAL, so questions that differ by a
  // meaningful word ("haram" vs "halal", "not") are never confused.
  getSimilar(key: string): T | undefined {
    const cut = (k: string) => {
      const i = k.split('|', 3).join('|').length + 1
      const content = k.slice(i).split(' ').filter((w) => w && !FILLER.has(w))
      return { prefix: k.slice(0, i), sig: content.join(' '), n: content.length }
    }
    const want = cut(key)
    if (want.n < 3) return undefined
    const t = this.now()
    for (const [k, v] of this.map) {
      if (v.expires <= t) continue
      const c = cut(k)
      if (c.prefix === want.prefix && c.sig === want.sig) return this.get(k)
    }
    return undefined
  }

  get size() {
    return this.map.size
  }
}

const FILLER = new Set(['please', 'pls', 'kindly', 'could', 'can', 'would', 'you', 'tell', 'me', 'the', 'a', 'an', 'hi', 'hello', 'salam', 'salaam', 'assalamu', 'alaikum', 'alaykum', 'brother', 'sister', 'sheikh', 'dear', 'thanks', 'thank', 'i', 'want', 'to', 'know', 'explain'])

// Same question, differently typed, should hit the same entry.
export function questionKey(parts: { message: string; lang: string; kids: boolean; passage?: string; level?: string }): string {
  const q = parts.message
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${parts.lang}|${parts.kids ? 'k' : 'a'}|${parts.level ? parts.level + '|' : ''}${(parts.passage ?? '').replaceAll('|', ' ')}|${q}`
}
