// Live encyclopedia lookups (server only) from Wikipedia's public API — free, no key, always current.
// Text is CC BY-SA 4.0: the UI links back to every article and says so. Results are cached for a day and requests are throttled,
// because Wikipedia rate-limits bursts (a burst of ~6 parallel requests was refused while testing this).

const BASE = () => process.env.WIKI_BASE_URL || 'https://en.wikipedia.org'
const UA = 'DeenCompanion/0.1 (open-source Islamic app)'
const TTL_MS = 24 * 3600_000
const MAX_PARALLEL = 2

export type WikiSummary = { title: string; description: string; extract: string; url: string; thumb?: string }
export type WikiSection = { heading: string; text: string }
export type WikiArticle = { title: string; description: string; url: string; intro: string; sections: WikiSection[]; thumb?: string }
export type WikiHit = { title: string; snippet: string }

// ───────── plumbing ─────────
const cache = new Map<string, { at: number; val: unknown }>()
const inflight = new Map<string, Promise<unknown>>()
let running = 0
const waiting: (() => void)[] = []

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r))
  running++
  try {
    return await fn()
  } finally {
    running--
    waiting.shift()?.()
  }
}

async function getJson(url: string): Promise<unknown> {
  return slot(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, signal: AbortSignal.timeout(12000), cache: 'no-store' })
      const body = await res.text()
      if (res.status === 404) return null
      if (res.ok) {
        try {
          return JSON.parse(body)
        } catch {}
      }
      // Rate-limited (429, or an HTML/plain-text refusal): wait and try again.
      const wait = Math.min(Number(res.headers.get('retry-after')) || 1.5 * (attempt + 1), 6)
      await new Promise((r) => setTimeout(r, wait * 1000))
    }
    throw new Error('Wikipedia is busy')
  })
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.val as T
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>
  const p = load()
    .then((val) => {
      if (val !== null) cache.set(key, { at: Date.now(), val })
      if (cache.size > 800) cache.delete(cache.keys().next().value as string)
      return val
    })
    .catch((err) => {
      if (hit) return hit.val as T // serve stale rather than fail
      throw err
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

// ───────── parsing (pure, unit-tested) ─────────
const DROP = new Set(['see also', 'references', 'external links', 'further reading', 'notes', 'bibliography', 'sources', 'citations', 'footnotes', 'works cited', 'gallery', 'general and cited references', 'cited sources'])

export function parseExtract(extract: string): { intro: string; sections: WikiSection[] } {
  const lines = extract.replace(/\r/g, '').split('\n')
  const intro: string[] = []
  const sections: { heading: string; level: number; lines: string[] }[] = []
  for (const line of lines) {
    const m = line.match(/^(={2,6})\s*(.+?)\s*\1\s*$/)
    if (m) sections.push({ heading: m[2], level: m[1].length, lines: [] })
    else if (sections.length) sections[sections.length - 1].lines.push(line)
    else intro.push(line)
  }
  const squash = (ls: string[]) => ls.map((l) => l.trim()).filter(Boolean).join('\n')
  const out: WikiSection[] = []
  let skipping = false
  for (const s of sections) {
    if (s.level === 2) skipping = DROP.has(s.heading.toLowerCase())
    if (skipping) continue
    const text = squash(s.lines)
    if (s.level === 2) out.push({ heading: s.heading, text })
    else if (out.length) out[out.length - 1].text += (out[out.length - 1].text ? '\n' : '') + `${s.heading}\n${text}`.trim() // fold sub-sections into their parent
  }
  return { intro: squash(intro), sections: out.filter((s) => s.text.length > 0) }
}

// The search API wraps matches in <span class="searchmatch"> and may include entities.
export const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

const slug = (t: string) => encodeURIComponent(t.replace(/ /g, '_'))

// ───────── lookups ─────────
export async function wikiSummary(title: string): Promise<WikiSummary | null> {
  return cached(`s:${title}`, async () => {
    const d = (await getJson(`${BASE()}/api/rest_v1/page/summary/${slug(title)}?redirect=true`)) as {
      type?: string
      title?: string
      description?: string
      extract?: string
      thumbnail?: { source?: string }
      content_urls?: { desktop?: { page?: string } }
    } | null
    if (!d || d.type === 'disambiguation' || !d.extract) return null
    return {
      title: d.title || title,
      description: d.description || '',
      extract: d.extract,
      url: d.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${slug(title)}`,
      thumb: d.thumbnail?.source,
    } satisfies WikiSummary
  })
}

export async function wikiArticle(title: string): Promise<WikiArticle | null> {
  return cached(`a:${title}`, async () => {
    const qs = `action=query&format=json&formatversion=2&redirects=1&prop=extracts%7Cdescription%7Cinfo%7Cpageimages&explaintext=1&exsectionformat=wiki&inprop=url&piprop=thumbnail&pithumbsize=640&titles=${encodeURIComponent(title)}`
    const d = (await getJson(`${BASE()}/w/api.php?${qs}`)) as {
      query?: { pages?: { missing?: boolean; title?: string; extract?: string; description?: string; fullurl?: string; thumbnail?: { source?: string } }[] }
    } | null
    const page = d?.query?.pages?.[0]
    if (!page || page.missing || !page.extract) return null
    const { intro, sections } = parseExtract(page.extract.slice(0, 120_000))
    return {
      title: page.title || title,
      description: page.description || '',
      url: page.fullurl || `https://en.wikipedia.org/wiki/${slug(title)}`,
      intro,
      sections,
      thumb: page.thumbnail?.source,
    } satisfies WikiArticle
  })
}

export async function wikiSearch(q: string): Promise<WikiHit[]> {
  // Keep results on topic: unless the question already says so, search "… Islam".
  const query = /islam|muslim|quran|qur'an|hadith|prophet|caliph|mosque|allah/i.test(q) ? q : `${q} Islam`
  return cached(`q:${query.toLowerCase()}`, async () => {
    const d = (await getJson(`${BASE()}/w/api.php?action=query&format=json&formatversion=2&list=search&srlimit=8&srprop=snippet&srsearch=${encodeURIComponent(query)}`)) as {
      query?: { search?: { title: string; snippet?: string }[] }
    } | null
    return (d?.query?.search ?? []).map((h) => ({ title: h.title, snippet: stripHtml(h.snippet || '') }))
  })
}
