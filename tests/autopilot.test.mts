// Tests the autopilot's brain: when to alert, which AI models to pick, the admin sign-in, and adaptive provider order.  Run: npm run test:autopilot
import { nextStates, overallOk, type Check } from '../src/lib/autopilot.ts'
import { discoverModels, rankChatModels, rankGeminiModels } from '../src/lib/model-discovery.ts'
import { ADMIN_COOKIE, adminConfigured, keyIsCorrect, makeSession, sessionIsValid } from '../src/lib/admin-auth.ts'
import { ProviderChain, ProviderError, type Provider } from '../src/lib/ai-chain.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ───────── when to alert ─────────
const c = (id: string, status: 'up' | 'degraded' | 'down', critical = false): Check => ({ id, label: id, critical, status, detail: status });
{
  let s = nextStates({}, [c('ai', 'up', true), c('maps', 'up')], 1000)
  ok('first look, all fine: nothing to announce', s.transitions.length === 0)
  s = nextStates(s.states, [c('ai', 'down', true), c('maps', 'up')], 2000)
  ok('one bad look is not announced yet (could be a blip)', s.transitions.length === 0 && s.states.ai.strikes === 1)
  s = nextStates(s.states, [c('ai', 'down', true), c('maps', 'up')], 3000)
  ok('two bad looks in a row: announced once, as critical', s.transitions.length === 1 && s.transitions[0].kind === 'went-bad' && s.transitions[0].critical && s.transitions[0].id === 'ai')
  s = nextStates(s.states, [c('ai', 'down', true), c('maps', 'up')], 4000)
  ok('it stays quiet while the same problem continues (no nagging)', s.transitions.length === 0)
  ok('the time it went bad is remembered', s.states.ai.since === 2000)
  s = nextStates(s.states, [c('ai', 'up', true), c('maps', 'up')], 5000)
  ok('when it recovers that is announced once', s.transitions.length === 1 && s.transitions[0].kind === 'recovered')
  s = nextStates(s.states, [c('ai', 'up', true), c('maps', 'up')], 6000)
  ok('and then silence again', s.transitions.length === 0 && s.states.ai.strikes === 0)
  let blip = nextStates({}, [c('maps', 'degraded')], 1)
  blip = nextStates(blip.states, [c('maps', 'up')], 2)
  ok('a one-look blip that clears is never announced, nor "recovered"', blip.transitions.length === 0)
}
{
  const checks = [c('ai', 'down', true), c('maps', 'down')]
  let s = nextStates({}, checks, 1)
  ok('overall: a critical part down once is still "ok" (waiting for the second look)', overallOk(s.states, checks))
  s = nextStates(s.states, checks, 2)
  ok('overall: critical down twice → not ok (the scheduler job fails and GitHub emails you)', !overallOk(s.states, checks))
  const minor = [c('ai', 'up', true), c('maps', 'down')]
  const s2 = nextStates(nextStates({}, minor, 1).states, minor, 2)
  ok('overall: a non-critical service being down does not fail the job', overallOk(s2.states, minor))
}

// ───────── choosing AI models ─────────
{
  const groq = ['whisper-large-v3', 'canopylabs/orpheus-v1-english', 'openai/gpt-oss-safeguard-20b', 'meta-llama/llama-prompt-guard-2-86m', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'llama-3.1-8b-instant', 'allam-2-7b']
  const r = rankChatModels(groq, 3)
  ok('model ranking: speech, guard and safeguard models are never chosen', !r.some((m) => /whisper|orpheus|guard/.test(m)), r.join())
  ok('model ranking: the big general model comes first', r[0] === 'openai/gpt-oss-120b', r.join())
  ok('model ranking: returns three', r.length === 3)
  ok('model ranking: a stable model beats a preview of the same size', rankChatModels(['llama-3.3-70b-preview', 'llama-3.3-70b-versatile'], 1)[0] === 'llama-3.3-70b-versatile')
  ok('model ranking: nothing usable gives an empty list, not a crash', rankChatModels(['whisper-1', 'text-embedding-3']).length === 0)
}
{
  const models = [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.8-flash-tts', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
    { name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent'] },
  ]
  const r = rankGeminiModels(models, 3)
  ok('gemini ranking: newest flash, then newest flash-lite, then another', r.join() === 'gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite', r.join())
  ok('gemini ranking: no tts, image or embedding models', !r.some((m) => /tts|image|embed/.test(m)))
}
{
  // discovery end to end against a pretend provider: it lists models, and only one of them really answers
  const calls: string[] = []
  const fake = (async (url: string, init?: RequestInit) => {
    const u = String(url)
    calls.push(u)
    if (u.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'whisper-large-v3' }, { id: 'retired-70b-instruct' }, { id: 'new-70b-instruct' }] }), { status: 200 })
    const body = JSON.parse(String(init?.body ?? '{}'))
    if (body.model === 'new-70b-instruct') return new Response(JSON.stringify({ choices: [{ message: { content: 'ready' } }] }), { status: 200 })
    return new Response('gone', { status: 404 })
  }) as unknown as typeof fetch
  const r = await discoverModels({ GROQ_API_KEY: 'k' }, fake)
  ok('discovery: keeps only models that really answer', r.found.Groq?.join() === 'new-70b-instruct', JSON.stringify(r))
  ok('discovery: providers without a key are not contacted', !calls.some((u) => /mistral|sambanova|nvidia|googleapis/.test(u)))
  const down = (async () => new Response('x', { status: 500 })) as unknown as typeof fetch
  const r2 = await discoverModels({ GROQ_API_KEY: 'k', GEMINI_API_KEY: 'g' }, down)
  ok('discovery: a provider that is down gives notes, not a crash', Object.keys(r2.found).length === 0 && r2.notes.length === 2, r2.notes.join(' | '))
}

// ───────── admin sign-in ─────────
{
  const saved = process.env.ADMIN_KEY
  delete process.env.ADMIN_KEY
  ok('admin: switched off when no key is set', !adminConfigured() && !keyIsCorrect('anything') && !sessionIsValid(makeSession()))
  process.env.ADMIN_KEY = 'short'
  ok('admin: a short key is refused (too guessable)', !adminConfigured())
  process.env.ADMIN_KEY = 'a-long-private-key-that-only-the-owner-knows-0123'
  ok('admin: the right key is accepted, wrong ones are not', keyIsCorrect(process.env.ADMIN_KEY) && !keyIsCorrect('a-long-private-key-that-only-the-owner-knows-0124') && !keyIsCorrect('') && !keyIsCorrect(undefined) && !keyIsCorrect(12345))
  const t = makeSession(1_000_000_000_000)
  ok('admin: a fresh session is valid', sessionIsValid(t, 1_000_000_000_000 + 60_000))
  ok('admin: it expires after 12 hours', !sessionIsValid(t, 1_000_000_000_000 + 13 * 3600_000))
  const [exp, sig] = t.split('.')
  ok('admin: a tampered expiry or signature is refused', !sessionIsValid(`${Number(exp) + 99999}.${sig}`, 1_000_000_000_000) && !sessionIsValid(`${exp}.${sig.slice(0, -2)}xx`, 1_000_000_000_000) && !sessionIsValid('garbage') && !sessionIsValid(''))
  process.env.ADMIN_KEY = 'a-different-long-private-key-for-another-site-99999'
  ok('admin: a session made under another key is refused', !sessionIsValid(t, 1_000_000_000_000 + 60_000))
  ok('admin: cookie name is fixed', ADMIN_COOKIE === 'deen_admin')
  if (saved === undefined) delete process.env.ADMIN_KEY
  else process.env.ADMIN_KEY = saved
}

// ───────── adapting to what works ─────────
{
  const mk = (name: string, fn: () => string): Provider => ({ name, run: async () => fn() })
  const GOOD = 'A perfectly good answer that is long enough.'
  const seen: string[] = []
  const bad = mk('Flaky', () => {
    seen.push('Flaky')
    throw new ProviderError('boom', 500)
  })
  const good = mk('Steady', () => {
    seen.push('Steady')
    return GOOD
  })
  let now = 0
  const chain = new ProviderChain([bad, good], { now: () => now, hedgeMs: 5 })
  ok('adaptive order: with no history the configured order is kept', chain.available().map((p) => p.name).join() === 'Flaky,Steady')
  for (let i = 0; i < 6; i++) {
    now += 10 * 60_000 // let the cool-down end each time so Flaky is tried again
    await chain.run('s', [])
  }
  ok('adaptive order: a provider that keeps failing is moved behind the one that works', chain.available().map((p) => p.name).join() === 'Steady,Flaky', chain.available().map((p) => p.name).join())
  seen.length = 0
  now += 60 * 60_000
  await chain.run('s', [])
  ok('adaptive order: the working one now answers first without trying the flaky one', seen.join() === 'Steady', seen.join())
  ok('adaptive order: performance is reported for the admin page', chain.performance().Flaky.fail >= 4 && chain.performance().Steady.ok >= 4)
  chain.reset()
  ok('reset: cool-downs can be cleared', chain.status().every((s) => s.available))
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
