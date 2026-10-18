// Tests the AI provider registry (free OpenAI-compatible services, per-model fallbacks), near-duplicate caching and the daily cap.
// Run: npm run test:providers
import http from 'node:http'
import { AnswerCache, questionKey } from '../src/lib/answer-cache.ts'
import { ProviderChain } from '../src/lib/ai-chain.ts'
import { askAI, configuredProviders } from '../src/lib/ai.ts'
import { dataAvailable } from '../src/lib/data.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const KEYS = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GROQ_API_KEY', 'GROQ_MODEL', 'MISTRAL_API_KEY', 'MISTRAL_MODEL', 'CEREBRAS_API_KEY', 'CEREBRAS_MODEL', 'GITHUB_MODELS_TOKEN', 'SAMBANOVA_API_KEY', 'NVIDIA_API_KEY', 'HF_TOKEN', 'POLLINATIONS', 'POLLINATIONS_MODEL', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_AI_KEY', 'CUSTOM_AI_BASE_URL', 'AI_COMPAT_BASE_OVERRIDE', 'AI_DAILY_CALLS']
const reset = () => KEYS.forEach((k) => delete process.env[k])
const names = () => configuredProviders().map((p) => p.name)

// ───────── which providers appear ─────────
reset()
ok('nothing configured → no providers (the app then answers from sources)', names().length === 0)

process.env.GROQ_API_KEY = 'k'
ok('Groq: two models, each with its own free quota', names().join() === 'Groq,Groq (llama-3.1-8b-instant)', names().join())
process.env.GROQ_MODEL = 'a,b,c'
ok('Groq: model list can be overridden (comma-separated)', names().join() === 'Groq,Groq (b),Groq (c)', names().join())
delete process.env.GROQ_MODEL

reset()
process.env.GEMINI_API_KEY = 'k'
ok('Gemini: two models by default', names().join() === 'Gemini,Gemini (gemini-2.5-flash-lite)', names().join())

reset()
process.env.CEREBRAS_API_KEY = 'k'
ok('Cerebras: stays off until you pick a model (names change often)', names().length === 0)
process.env.CEREBRAS_MODEL = 'm'
ok('Cerebras: on once a model is set', names().join() === 'Cerebras')

reset()
process.env.GITHUB_MODELS_TOKEN = 't'
process.env.SAMBANOVA_API_KEY = 's'
process.env.NVIDIA_API_KEY = 'n'
process.env.HF_TOKEN = 'h'
ok('GitHub Models, SambaNova, NVIDIA and Hugging Face are available', names().join() === 'GitHub Models,SambaNova,NVIDIA,HuggingFace', names().join())

reset()
process.env.OPENROUTER_API_KEY = 'o'
ok('OpenRouter: three free-model slots', names().join() === 'OpenRouter,OpenRouter #2,OpenRouter #3')

reset()
ok('Pollinations (no key) is OFF unless you opt in — questions would go to a third party', names().length === 0)
process.env.POLLINATIONS = 'off'
ok('Pollinations: "off" stays off', names().length === 0)
process.env.POLLINATIONS = 'on'
ok('Pollinations: "on" enables the keyless provider', names().join() === 'Pollinations')

reset()
Object.assign(process.env, { GEMINI_API_KEY: 'a', GROQ_API_KEY: 'b', MISTRAL_API_KEY: 'c', OPENROUTER_API_KEY: 'd', POLLINATIONS: 'on', CUSTOM_AI_BASE_URL: 'http://x' })
const order = names()
ok('order: best first (Gemini, Groq, Mistral…), keyless/local last', order[0] === 'Gemini' && order.indexOf('Groq') < order.indexOf('Mistral') && order.indexOf('Mistral') < order.indexOf('OpenRouter') && order.indexOf('Pollinations') > order.indexOf('OpenRouter') && order.at(-1) === 'Custom', order.join())
ok('a typical free setup has 10+ separate quotas to fall back on', order.length >= 10, String(order.length))

// ───────── talking to a (fake) OpenAI-compatible server ─────────
type Seen = { url: string; auth: string; model: string }
const seen: Seen[] = []
let mode: 'ok' | 'limit-first' = 'ok'
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (d) => (body += d))
  req.on('end', () => {
    const j = JSON.parse(body || '{}')
    seen.push({ url: req.url || '', auth: String(req.headers.authorization || ''), model: j.model })
    if (mode === 'limit-first' && seen.length === 1) {
      res.writeHead(429, { 'Retry-After': '30', 'Content-Type': 'application/json' })
      return res.end('{"error":"rate limit"}')
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ choices: [{ message: { content: 'A sourced answer of sufficient length for the tests to accept.' } }] }))
  })
})
await new Promise<void>((r) => server.listen(0, r))
const port = (server.address() as { port: number }).port
const system = 'sys'
const hist = [{ role: 'user' as const, content: 'hi' }]

reset()
process.env.AI_COMPAT_BASE_OVERRIDE = `http://localhost:${port}/v1`
process.env.GROQ_API_KEY = 'secret-groq'
const r = await configuredProviders()[0].run(system, hist)
ok('request: Bearer key and the first model are sent to /chat/completions', r.length > 20 && seen[0].auth === 'Bearer secret-groq' && seen[0].model === 'llama-3.3-70b-versatile' && seen[0].url === '/v1/chat/completions', JSON.stringify(seen[0]))

seen.length = 0
mode = 'limit-first'
const chain = new ProviderChain(configuredProviders(), { timeoutMs: 5000 })
const got = await chain.run(system, hist)
ok('when the first model is rate-limited the second model of the same service answers', !!got && got.provider === 'Groq (llama-3.1-8b-instant)' && seen.map((s) => s.model).join() === 'llama-3.3-70b-versatile,llama-3.1-8b-instant', JSON.stringify(seen.map((s) => s.model)))
mode = 'ok'

seen.length = 0
reset()
process.env.AI_COMPAT_BASE_OVERRIDE = `http://localhost:${port}/v1`
process.env.POLLINATIONS = 'on'
await configuredProviders()[0].run(system, hist)
ok('Pollinations: never sends any Authorization header', seen[0].auth === '' && seen[0].model === 'openai')

// ───────── near-duplicate cache ─────────
const c = new AnswerCache<string>(50)
const k = (m: string) => questionKey({ message: m, lang: 'en', kids: false })
c.set(k('How do I perform the wudu before prayer step by step'), 'A')
ok('cache: exact repeat hits', c.get(k('how do I perform the wudu before prayer step by step?')) === 'A')
ok('cache: one extra word still hits', c.getSimilar(k('How do I perform the wudu before prayer step by step please')) === 'A')
ok('cache: a different question does not hit', c.getSimilar(k('How do I perform the ghusl after janabah step by step')) === undefined)
c.set(k('Is listening to music haram in Islam according to scholars'), 'B')
ok('cache: a negated question never matches the original', c.getSimilar(k('Is listening to music not haram in Islam according to scholars')) === undefined)
ok('cache: haram vs halal (one meaningful word) never matches', c.getSimilar(k('Is listening to music halal in Islam according to scholars')) === undefined)
ok('cache: polite filler is ignored (“could you tell me …”, “salam brother”)', c.getSimilar(k('Salam brother could you tell me how do I perform the wudu before prayer step by step')) === 'A')
ok('cache: short questions are never fuzzy-matched', c.getSimilar(k('what is zakat')) === undefined)
const kid = questionKey({ message: 'How do I perform the wudu before prayer step by step please', lang: 'en', kids: true })
ok('cache: kids mode and other languages keep separate answers', c.getSimilar(kid) === undefined && c.getSimilar(questionKey({ message: 'How do I perform the wudu before prayer step by step please', lang: 'fr', kids: false })) === undefined)
ok('cache: a "|" in the passage cannot confuse the lookup', questionKey({ message: 'a b c d', lang: 'en', kids: false, passage: 'x|y' }).split('|').length === 4)

// ───────── daily cap ─────────
if (dataAvailable()) {
  seen.length = 0
  reset()
  process.env.AI_COMPAT_BASE_OVERRIDE = `http://localhost:${port}/v1`
  process.env.GROQ_API_KEY = 'k'
  process.env.AI_DAILY_CALLS = '1'
  const a1 = await askAI({ message: 'What does the Quran say about patience in hardship?' })
  const a2 = await askAI({ message: 'What does the Quran say about gratitude to Allah?' })
  ok('daily cap: first answer uses the AI', a1.mode === 'llm', a1.mode)
  ok('daily cap: after the cap, answers come from sources (no more model calls)', a2.mode === 'sources' && seen.length === 1, a2.mode + ' calls=' + seen.length)
  delete process.env.AI_DAILY_CALLS
} else {
  console.log('SKIP daily-cap test: run `npm run data` first')
}

server.close()
reset()
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
