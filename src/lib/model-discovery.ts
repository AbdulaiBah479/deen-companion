// AI companies retire model names every few months, which silently breaks an app that hard-codes them. This asks each
// provider which models exist today, picks the best few, checks that they really answer, and remembers them (see ops.ts),
// so the app heals itself instead of falling back to "sources only".

const SKIP = /whisper|tts|guard|safeguard|embed|orpheus|moderation|rerank|image|audio|transcri|dall|sdxl|flux|vision-preview|speech|ocr|nsfw|reward/i

// Which of a provider's model ids to try, best first. Pure, so it is unit-tested.
export function rankChatModels(ids: string[], n = 3): string[] {
  const scored = ids
    .filter((id) => !SKIP.test(id))
    .map((id) => {
      let s = 0
      const size = /(\d{1,3})b(?![a-z])/i.exec(id)
      if (size) s += Math.min(Number(size[1]), 200) / 2 // bigger models answer better…
      if (/gpt-oss-120b/i.test(id)) s += 40
      if (/instruct|versatile|chat|-it$/i.test(id)) s += 12
      if (/llama-3\.[3-9]|llama-4|qwen|gpt-oss|mistral-(small|medium|large)|deepseek/i.test(id)) s += 12
      if (/preview|beta|exp|alpha/i.test(id)) s -= 25 // …and stable ones beat experiments
      if (/\b(8b|7b|3b|1b)\b/i.test(id)) s -= 5
      return { id, s }
    })
    .sort((a, b) => b.s - a.s || a.id.localeCompare(b.id))
  return scored.slice(0, n).map((x) => x.id)
}

// Gemini: the newest "flash" and "flash-lite" models that can generate text. Each has its own free quota.
export function rankGeminiModels(models: { name: string; supportedGenerationMethods?: string[] }[], n = 3): string[] {
  const rows = models
    .filter((m) => (m.supportedGenerationMethods ?? ['generateContent']).includes('generateContent'))
    .map((m) => {
      const id = m.name.replace(/^models\//, '')
      const x = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/.exec(id)
      return x ? { id, version: Number(x[1]), lite: !!x[2] } : null
    })
    .filter((x): x is { id: string; version: number; lite: boolean } => !!x)
    .sort((a, b) => b.version - a.version || Number(a.lite) - Number(b.lite))
  const flash = rows.filter((r) => !r.lite)
  const lite = rows.filter((r) => r.lite)
  // newest of each kind first, then whatever else is newest (rows are already newest-first)
  const out: string[] = []
  for (const pick of [flash[0], lite[0], ...rows]) if (pick && !out.includes(pick.id) && out.length < n) out.push(pick.id)
  return out
}

type Fetcher = typeof fetch
const TIMEOUT = 12_000

async function getJson(f: Fetcher, url: string, headers: Record<string, string> = {}) {
  const res = await f(url, { headers, signal: AbortSignal.timeout(TIMEOUT), cache: 'no-store' })
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`)
  return res.json()
}

// A model "works" if it returns a real sentence to a tiny question.
async function worksCompat(f: Fetcher, base: string, key: string, model: string): Promise<boolean> {
  try {
    const res = await f(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with the single word: ready' }], max_tokens: 40 }),
      signal: AbortSignal.timeout(TIMEOUT),
      cache: 'no-store',
    })
    if (!res.ok) return false
    const d = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    return !!d.choices?.[0]?.message?.content
  } catch {
    return false
  }
}

async function worksGemini(f: Fetcher, key: string, model: string): Promise<boolean> {
  try {
    const res = await f(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with the single word: ready' }] }] }),
      signal: AbortSignal.timeout(TIMEOUT),
      cache: 'no-store',
    })
    // 429/503 mean "busy", not "gone": the model exists, so keep it.
    if (res.status === 429 || res.status === 503) return true
    return res.ok
  } catch {
    return false
  }
}

// Providers whose model list is read from `${base}/models`. Names match COMPAT_PROVIDERS in ai.ts.
const LISTED: { name: string; keyEnv: string; base: string }[] = [
  { name: 'Groq', keyEnv: 'GROQ_API_KEY', base: 'https://api.groq.com/openai/v1' },
  { name: 'Mistral', keyEnv: 'MISTRAL_API_KEY', base: 'https://api.mistral.ai/v1' },
  { name: 'SambaNova', keyEnv: 'SAMBANOVA_API_KEY', base: 'https://api.sambanova.ai/v1' },
  { name: 'NVIDIA', keyEnv: 'NVIDIA_API_KEY', base: 'https://integrate.api.nvidia.com/v1' },
]

export type Discovery = { found: Record<string, string[]>; notes: string[] }

// Looks up and verifies models for every provider that has a key. Never throws; problems are returned as notes.
export async function discoverModels(env: Record<string, string | undefined>, f: Fetcher = fetch): Promise<Discovery> {
  const found: Record<string, string[]> = {}
  const notes: string[] = []

  const jobs = LISTED.filter((p) => env[p.keyEnv]).map(async (p) => {
    try {
      const data = (await getJson(f, `${p.base}/models`, { Authorization: `Bearer ${env[p.keyEnv]}` })) as { data?: { id: string }[] }
      const candidates = rankChatModels((data.data ?? []).map((m) => m.id), 5)
      const good: string[] = []
      for (const m of candidates) {
        if (good.length >= 3) break
        if (await worksCompat(f, p.base, env[p.keyEnv]!, m)) good.push(m)
      }
      if (good.length) found[p.name] = good
      else notes.push(`${p.name}: no model answered (${candidates.join(', ') || 'none listed'})`)
    } catch (e) {
      notes.push(`${p.name}: ${e instanceof Error ? e.message : e}`)
    }
  })

  if (env.GEMINI_API_KEY) {
    jobs.push(
      (async () => {
        try {
          const data = (await getJson(f, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { 'x-goog-api-key': env.GEMINI_API_KEY! })) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }
          const candidates = rankGeminiModels(data.models ?? [], 5)
          const good: string[] = []
          for (const m of candidates) {
            if (good.length >= 3) break
            if (await worksGemini(f, env.GEMINI_API_KEY!, m)) good.push(m)
          }
          if (good.length) found.Gemini = good
          else notes.push(`Gemini: no model answered (${candidates.join(', ') || 'none listed'})`)
        } catch (e) {
          notes.push(`Gemini: ${e instanceof Error ? e.message : e}`)
        }
      })()
    )
  }

  await Promise.all(jobs)
  return { found, notes }
}
