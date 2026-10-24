// Grounded Islamic AI companion.
//
// 1. Retrieve real verses and hadith that match the question from the bundled datasets (BM25 search).
// 2. Give them to the model as numbered SOURCES and instruct it to cite only those.
// 3. Try each configured free provider in order until one answers.
//
// Providers are enabled by environment variables (see .env.example). Any OpenAI-compatible endpoint works,
// including a free local model via Ollama (CUSTOM_AI_BASE_URL=http://localhost:11434/v1).

import { GoogleGenerativeAI } from '@google/generative-ai'
import { LANGUAGES } from './language-list'
import { dataAvailable, searchHadithText, searchQuranText } from './data'
import { AnswerCache, questionKey } from './answer-cache'
import { ProviderChain, ProviderError, type ChatTurn, type Provider } from './ai-chain'
import { extractiveAnswer } from './extractive'
import { createHash } from 'node:crypto'
import { redis, redisConfigured } from './redis'
import { readDiscoveredModels, recordProviderStat, track, writeDiscoveredModels } from './ops'
import { discoverModels } from './model-discovery'

export type { ChatTurn } from './ai-chain'


export type Source = {
  id: string // Q1, H2, ...
  kind: 'quran' | 'hadith'
  ref: string // "2:255" or "Sahih al-Bukhari 1"
  arabic?: string
  text: string
  href: string
}

// mode: 'llm' = written by an AI model, 'cache' = a previous model answer re-used (zero tokens),
// 'sources' = assembled from retrieved verses/hadith only (zero tokens, no model involved).
export type AIResult = { answer: string; sources: Source[]; provider: string | null; mode: 'llm' | 'cache' | 'sources' }

// ---------------- Retrieval ----------------

function keepRelevant<T extends { score: number }>(rows: T[], floor: number, ratio = 0.45): T[] {
  if (!rows.length || rows[0].score < floor) return []
  return rows.filter((r) => r.score >= rows[0].score * ratio)
}

export function retrieveSources(question: string, lang = 'en'): Source[] {
  if (!dataAvailable()) return []
  const quran = keepRelevant(searchQuranText(question, 5, lang), 4).slice(0, 4)
  const hadith = keepRelevant(searchHadithText(question, 4), 6).slice(0, 3)
  const out: Source[] = []
  quran.forEach((q, i) =>
    out.push({
      id: `Q${i + 1}`,
      kind: 'quran',
      ref: q.key,
      arabic: q.arabic,
      text: q.text,
      href: `/quran/${q.key.split(':')[0]}`,
    })
  )
  hadith.forEach((h, i) =>
    out.push({
      id: `H${i + 1}`,
      kind: 'hadith',
      ref: `${h.book} ${h.number}`,
      text: h.text.length > 600 ? h.text.slice(0, 600) + '…' : h.text,
      href: `/hadith?book=${h.bookId}&number=${h.number}`,
    })
  )
  return out
}

// ---------------- Prompt ----------------

const KIDS_RULE =
  '\n9. KIDS MODE: the reader is a child (about 6–10). Use very simple words and short sentences, a gentle and cheerful tone, and no frightening or graphic details. Keep it to 2–3 short paragraphs.'

const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? 'English'

export function buildSystemPrompt(sources: Source[], lang = 'en', context?: string, kids = false): string {
  const sourceBlock = sources.length
    ? sources.map((s) => `[${s.id}] ${s.kind === 'quran' ? 'Quran' : 'Hadith'} ${s.ref}: ${s.text}`).join('\n')
    : '(no matching sources were found for this question)'

  return `You are a warm, careful Islamic study companion inside "Deen Companion", a free app for Muslims worldwide.

SOURCES retrieved from verified Quran and hadith datasets for this question:
${sourceBlock}
${context ? `\nPASSAGE THE USER IS READING:\n${context}\n` : ''}
RULES:
1. Ground your answer in the SOURCES above where they are relevant, and cite them inline like [Q1] or [H2]. Never invent a verse, hadith, number, narrator or scholar. Do not cite anything that is not in SOURCES unless you are certain of it; if you mention one, say it should be verified.
2. If the SOURCES do not answer the question, say so plainly, then give only general, well-established knowledge and say you are not certain where appropriate.
3. For personal rulings (fatwa), halal/haram specifics, inheritance, divorce, medical or financial matters: give general educational information only and tell the user to ask a qualified local scholar.
4. Present differences between the schools of thought fairly when relevant; do not declare one the only view on matters of legitimate scholarly disagreement.
5. Write "ﷺ" after the Prophet Muhammad's name and "عليه السلام" after other prophets' names.
6. Be kind and encouraging, never judgmental. Keep answers clear and concise (about 3–5 short paragraphs).
7. Reply in ${langName(lang)}.
8. If the question is not about Islam or self-development, politely steer back to what you can help with.${kids ? KIDS_RULE : ''}`
}

// ---------------- Providers ----------------

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

function retryAfterMs(res: Response): number | undefined {
  const v = res.headers.get('retry-after')
  if (!v) return undefined
  const secs = Number(v)
  return Number.isFinite(secs) ? secs * 1000 : Math.max(0, Date.parse(v) - Date.now()) || undefined
}

async function openAICompatible(baseUrl: string, key: string | undefined, model: string, messages: Msg[]) {
  const res = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 900 }),
  })
  if (!res.ok) throw new ProviderError((await res.text()).slice(0, 200), res.status, retryAfterMs(res))
  const data = await res.json()
  return (data.choices?.[0]?.message?.content as string) || ''
}

let openRouterFree: { at: number; ids: string[] } | null = null
// The best few free OpenRouter models (largest context first). Each has its own rate limit, so more of them = more free capacity.
async function pickOpenRouterModels(): Promise<string[]> {
  if (process.env.OPENROUTER_MODEL) return process.env.OPENROUTER_MODEL.split(',').map((m) => m.trim()).filter(Boolean)
  if (openRouterFree && Date.now() - openRouterFree.at < 6 * 3600_000) return openRouterFree.ids
  try {
    const data = await (await fetch('https://openrouter.ai/api/v1/models')).json()
    const free = (data.data as { id: string; context_length: number }[])
      .filter((m) => m.id.endsWith(':free') && m.context_length >= 32000 && !/safety|code|guard|embed|vl|omni|preview/i.test(m.id))
      .sort((a, b) => b.context_length - a.context_length)
    openRouterFree = { at: Date.now(), ids: free.slice(0, 3).map((m) => m.id) }
  } catch {
    openRouterFree = { at: Date.now(), ids: [] }
  }
  return openRouterFree.ids
}

// Free OpenAI-compatible services. Each key you add is one more independent quota; each model listed has its own limit too.
// MODEL env vars accept a comma-separated list (tried in order). Names/models change often, so every one can be overridden.
export type Compat = { name: string; keyEnv: string; base: string; modelEnv: string; models: string[]; needsModel?: boolean; optIn?: boolean }
export const COMPAT_PROVIDERS: Compat[] = [
  { name: 'Groq', keyEnv: 'GROQ_API_KEY', base: 'https://api.groq.com/openai/v1', modelEnv: 'GROQ_MODEL', models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'] },
  { name: 'Mistral', keyEnv: 'MISTRAL_API_KEY', base: 'https://api.mistral.ai/v1', modelEnv: 'MISTRAL_MODEL', models: ['mistral-small-latest', 'open-mistral-nemo'] },
  { name: 'Cerebras', keyEnv: 'CEREBRAS_API_KEY', base: 'https://api.cerebras.ai/v1', modelEnv: 'CEREBRAS_MODEL', models: [], needsModel: true },
  { name: 'GitHub Models', keyEnv: 'GITHUB_MODELS_TOKEN', base: 'https://models.github.ai/inference', modelEnv: 'GITHUB_MODELS_MODEL', models: ['openai/gpt-4o-mini'] },
  { name: 'SambaNova', keyEnv: 'SAMBANOVA_API_KEY', base: 'https://api.sambanova.ai/v1', modelEnv: 'SAMBANOVA_MODEL', models: ['Meta-Llama-3.3-70B-Instruct'] },
  { name: 'NVIDIA', keyEnv: 'NVIDIA_API_KEY', base: 'https://integrate.api.nvidia.com/v1', modelEnv: 'NVIDIA_MODEL', models: ['meta/llama-3.3-70b-instruct'] },
  { name: 'HuggingFace', keyEnv: 'HF_TOKEN', base: 'https://router.huggingface.co/v1', modelEnv: 'HF_MODEL', models: ['meta-llama/Llama-3.3-70B-Instruct'] },
  // No key at all, so it works out of the box — but your users' questions go to a third party we have no agreement with.
  // Therefore opt-in only: set POLLINATIONS=on.
  { name: 'Pollinations', keyEnv: 'POLLINATIONS', base: 'https://text.pollinations.ai/openai', modelEnv: 'POLLINATIONS_MODEL', models: ['openai'], optIn: true },
]

const list = (v: string | undefined) => (v || '').split(',').map((m) => m.trim()).filter(Boolean)

// Models the watchdog found working today (see model-discovery.ts). They fill in only where you have not set your own *_MODEL.
let discovered: Record<string, string[]> = {}
let discoveredAt = 0
export function setDiscoveredModels(m: Record<string, string[]>) {
  discovered = m
  discoveredAt = Date.now()
}
async function refreshDiscovered() {
  if (Date.now() - discoveredAt < 5 * 60_000) return
  discoveredAt = Date.now()
  try {
    const m = await readDiscoveredModels()
    if (Object.keys(m).length) discovered = m
  } catch {}
}

// Everything failed: perhaps a provider retired the model we ask for. Look up what exists today (at most every 10 minutes
// per server, in the background, so the person waiting is not slowed down).
let lastHeal = 0
export async function healModels(force = false): Promise<{ found: Record<string, string[]>; notes: string[] }> {
  if (!force && Date.now() - lastHeal < 10 * 60_000) return { found: {}, notes: ['skipped: tried recently'] }
  lastHeal = Date.now()
  const result = await discoverModels(process.env)
  if (Object.keys(result.found).length) {
    setDiscoveredModels({ ...discovered, ...result.found })
    await writeDiscoveredModels(result.found).catch(() => {})
    chain.reset()
  }
  return result
}

export function configuredProviders(): Provider[] {
  const env = process.env
  const out: Provider[] = []
  const chat = (system: string, history: ChatTurn[]): Msg[] => [{ role: 'system', content: system }, ...history]
  // Test hook: send every OpenAI-compatible provider to one local fake server.
  const override = env.AI_COMPAT_BASE_OVERRIDE

  // 1. Google Gemini — two models, each with its own free quota.
  if (env.GEMINI_API_KEY) {
    const models = list(env.GEMINI_MODEL).length ? list(env.GEMINI_MODEL) : (discovered.Gemini ?? ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'])
    models.forEach((modelName, i) =>
      out.push({
        name: i === 0 ? 'Gemini' : 'Gemini (' + modelName + ')',
        run: async (system, history) => {
          try {
            const model = new GoogleGenerativeAI(env.GEMINI_API_KEY!).getGenerativeModel({ model: modelName, systemInstruction: system })
            const contents = history.map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] }))
            return (await model.generateContent({ contents })).response.text()
          } catch (e) {
            const status = (e as { status?: number }).status
            throw new ProviderError(e instanceof Error ? e.message : String(e), status)
          }
        },
      })
    )
  }

  const addCompat = (p: Compat) => {
    const key = env[p.keyEnv]
    if (!key || (p.optIn && !/^(on|1|true|yes)$/i.test(key))) return
    const models = list(env[p.modelEnv]).length ? list(env[p.modelEnv]) : (discovered[p.name] ?? p.models)
    if (!models.length) return // e.g. Cerebras needs you to pick a model
    models.forEach((model, i) =>
      out.push({
        name: i === 0 ? p.name : p.name + ' (' + model + ')',
        run: (system, history) => openAICompatible(override || p.base, p.optIn ? undefined : key, model, chat(system, history)),
      })
    )
  }
  // 2. Every free OpenAI-compatible service that has a key.
  COMPAT_PROVIDERS.filter((p) => !p.optIn).forEach(addCompat)

  // 3. OpenRouter — automatically picks the largest free models.
  if (env.OPENROUTER_API_KEY) {
    for (let i = 0; i < 3; i++) {
      out.push({
        name: i === 0 ? 'OpenRouter' : 'OpenRouter #' + (i + 1),
        run: async (system, history) => {
          const models = await pickOpenRouterModels()
          const model = models[i]
          if (!model) throw new ProviderError('no free model available', 503)
          return openAICompatible(override || 'https://openrouter.ai/api/v1', env.OPENROUTER_API_KEY, model, chat(system, history))
        },
      })
    }
  }

  // 4. Cloudflare Workers AI.
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_KEY) {
    out.push({
      name: 'Cloudflare',
      run: async (system, history) => {
        const res = await fetch(
          'https://api.cloudflare.com/client/v4/accounts/' + env.CLOUDFLARE_ACCOUNT_ID + '/ai/run/@cf/meta/llama-3.1-8b-instruct',
          {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + env.CLOUDFLARE_AI_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: chat(system, history) }),
          }
        )
        if (!res.ok) throw new ProviderError('cloudflare ' + res.status, res.status, retryAfterMs(res))
        return (await res.json()).result?.response || ''
      },
    })
  }

  // 5. Keyless services you opted in to (last: nothing to lose if everything else is working).
  COMPAT_PROVIDERS.filter((p) => p.optIn).forEach(addCompat)

  // 6. Any OpenAI-compatible server, e.g. a FREE LOCAL model with Ollama or LM Studio (no quota at all).
  if (env.CUSTOM_AI_BASE_URL) {
    out.push({
      name: 'Custom',
      run: (system, history) => openAICompatible(env.CUSTOM_AI_BASE_URL!, env.CUSTOM_AI_KEY, env.CUSTOM_AI_MODEL || 'llama3.1', chat(system, history)),
    })
  }
  // Groq answers in about a second, so it goes first; everything else keeps its order.
  return [...out.filter((p) => /^Groq/.test(p.name)), ...out.filter((p) => !/^Groq/.test(p.name))]
}

// ---------------- State shared across requests ----------------

let budget = { day: '', used: 0 }
function dailyBudgetLeft(): boolean {
  const cap = Number(process.env.AI_DAILY_CALLS)
  if (!Number.isFinite(cap) || cap <= 0) return true
  const day = new Date().toISOString().slice(0, 10)
  if (budget.day !== day) budget = { day, used: 0 }
  return budget.used < cap
}
function spendOne() {
  const day = new Date().toISOString().slice(0, 10)
  if (budget.day !== day) budget = { day, used: 0 }
  budget.used++
}

const chain = new ProviderChain([], { timeoutMs: 15_000, hedgeMs: 3_500, onResult: (name, ok, ms, error) => void recordProviderStat(name, ok, ms, error) })
const cache = new AnswerCache<{ answer: string; provider: string }>(300, 24 * 3600_000)

// Which providers are configured, which are resting after hitting a limit, and how many answers are cached.
export function aiStatus() {
  chain.setProviders(configuredProviders())
  return { providers: chain.status(), cachedAnswers: cache.size }
}

// ---------------- Entry points ----------------

export function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t): t is ChatTurn => !!t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim().length > 0)
    .slice(-8)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }))
}

// Keep the most recent turns within a character budget (≈ token budget) so long chats don't burn quota.
export function trimHistory(history: ChatTurn[], budgetChars = 6000): ChatTurn[] {
  const out: ChatTurn[] = []
  let used = 0
  for (let i = history.length - 1; i >= 0; i--) {
    used += history[i].content.length
    if (used > budgetChars && out.length > 0) break
    out.unshift(history[i])
  }
  // Providers expect the conversation to start with a user turn.
  while (out.length > 1 && out[0].role !== 'user') out.shift()
  return out
}

type AskOptions = { message: string; history?: ChatTurn[]; lang?: string; context?: string; kids?: boolean }

// Everything needed to run the model somewhere else (e.g. in the user's own browser).
export function prepareAI(opts: AskOptions) {
  const lang = opts.lang && LANGUAGES.some((l) => l.code === opts.lang) ? opts.lang : 'en'
  const sources = retrieveSources(opts.message, lang)
  const system = buildSystemPrompt(sources, lang, opts.context?.slice(0, 4000), !!opts.kids)
  const history = trimHistory([...(opts.history ?? []), { role: 'user' as const, content: opts.message }])
  return { lang, sources, system, history }
}

export async function askAI(opts: AskOptions): Promise<AIResult> {
  const { lang, sources, system, history } = prepareAI(opts)
  track('ai.ask')
  await refreshDiscovered()

  // 1. Cache: a repeated standalone question costs nothing.
  const cacheable = !(opts.history && opts.history.length)
  const key = questionKey({ message: opts.message, lang, kids: !!opts.kids, passage: opts.context?.slice(0, 80) })
  if (cacheable) {
    const hit = cache.get(key) ?? cache.getSimilar(key)
    if (hit) return { answer: hit.answer, sources, provider: hit.provider, mode: 'cache' }
  }

  // 1b. The same cache shared by every server (Redis): the first person to ask "Explain 2:255" pays the wait, everyone else gets it instantly.
  const sharedKey = 'ai:a:' + createHash('sha1').update(key).digest('hex').slice(0, 32)
  if (cacheable && redisConfigured()) {
    try {
      const [raw] = (await redis([['GET', sharedKey]])) as [string | null]
      if (raw) {
        const hit = JSON.parse(raw) as { answer: string; provider: string }
        cache.set(key, hit)
        return { answer: hit.answer, sources, provider: hit.provider, mode: 'cache' }
      }
    } catch {}
  }

  // 2. Providers, skipping any that are resting after hitting a limit.
  const providers = configuredProviders()
  chain.setProviders(providers)
  if (providers.length === 0) {
    return { answer: extractiveAnswer(sources, 'unconfigured'), sources, provider: null, mode: 'sources' }
  }
  // Optional spending/usage guard for the whole site: AI_DAILY_CALLS=2000 stops calling models after 2000 answers a day
  // (UTC) and serves sourced answers instead. Off by default.
  const result = dailyBudgetLeft() ? await chain.run(system, history) : null
  if (result) {
    spendOne()
    if (cacheable) {
      cache.set(key, result)
      if (redisConfigured()) redis([['SET', sharedKey, JSON.stringify(result), 'EX', 604_800]]).catch(() => {})
    }
    return { answer: result.answer, sources, provider: result.provider, mode: 'llm' }
  }

  // 3. Everything is busy: still give a useful, sourced answer instead of an error.
  if (dailyBudgetLeft()) void healModels().catch(() => {})
  return { answer: extractiveAnswer(sources, 'unavailable'), sources, provider: null, mode: 'sources' }
}

// For the admin view and the watchdog.
export function aiPerformance() {
  return chain.performance()
}

// One tiny real question to see whether anything can answer right now (the watchdog uses this only when real traffic has not).
export async function aiCanary(): Promise<{ ok: boolean; provider: string | null; ms: number }> {
  chain.setProviders(configuredProviders())
  const t0 = Date.now()
  const r = await chain.run('You are a health check. Answer in one short sentence.', [{ role: 'user', content: 'Say that all systems are working.' }])
  return { ok: !!r, provider: r?.provider ?? null, ms: Date.now() - t0 }
}

export function resetAiCooldowns() {
  chain.reset()
}
