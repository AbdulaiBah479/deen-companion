// Tests the AI resilience layer: provider cool-downs, answer cache, sources-only fallback.  Run: npm run test:resilience
import { ProviderChain, ProviderError, classifyFailure, type Provider } from '../src/lib/ai-chain.ts'
import { AnswerCache, questionKey } from '../src/lib/answer-cache.ts'
import { extractiveAnswer } from '../src/lib/extractive.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

const GOOD = 'A perfectly good answer from the model.'
function provider(name: string, behaviour: () => Promise<string> | string) {
  const p = { name, calls: 0, run: async () => { p.calls++; return await behaviour() } }
  return p as Provider & { calls: number }
}
let clock = 1_000_000
const now = () => clock
const advance = (ms: number) => { clock += ms }

// ---- classification ----
ok('HTTP 429 -> rate-limit with ~1 min cool-down', classifyFailure(new ProviderError('x', 429), 1).kind === 'rate-limit' && classifyFailure(new ProviderError('x', 429), 1).cooldownMs === 60_000)
ok('rate-limit cool-down escalates on repeats (1,2,4 min, capped 15)', [1, 2, 3, 9].map((n) => classifyFailure(new ProviderError('x', 429), n).cooldownMs / 60_000).join() === '1,2,4,15')
ok('Retry-After is honoured', classifyFailure(new ProviderError('x', 429, 7000), 1).cooldownMs === 7000)
ok('Retry-After is capped at 30 min', classifyFailure(new ProviderError('x', 429, 99 * 3600_000), 1).cooldownMs === 30 * 60_000)
ok('"quota exceeded" message -> rate-limit', classifyFailure(new Error('RESOURCE_EXHAUSTED: Quota exceeded for metric'), 1).kind === 'rate-limit')
ok('401/403 -> auth, 30 min', classifyFailure(new ProviderError('bad key', 401), 1).kind === 'auth' && classifyFailure(new ProviderError('x', 403), 1).cooldownMs === 30 * 60_000)
ok('network/5xx -> transient 20s, doubling, capped 5 min', [1, 2, 3, 20].map((n) => classifyFailure(new Error('ECONNRESET'), n).cooldownMs / 1000).join() === '20,40,80,300')

// ---- chain ----
{
  const a = provider('A', () => GOOD), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now })
  const r = await chain.run('sys', [])
  ok('first healthy provider answers', r?.provider === 'A' && a.calls === 1 && b.calls === 0)
}
{
  const a = provider('A', () => { throw new ProviderError('slow down', 429) }), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now })
  const r1 = await chain.run('s', [])
  ok('429 on A -> falls through to B', r1?.provider === 'B' && a.calls === 1)
  const r2 = await chain.run('s', [])
  ok('A is skipped while cooling down (not called again)', r2?.provider === 'B' && a.calls === 1)
  ok('status shows A resting', chain.status()[0].available === false && chain.status()[0].kind === 'rate-limit' && chain.status()[0].retryInMs > 0)
  advance(61_000)
  const r3 = await chain.run('s', [])
  ok('A is retried after its cool-down expires', a.calls === 2 && r3?.provider === 'B')
  advance(2 * 60_000 + 1000)
  ok('second failure doubles the rest (2 min)', chain.available().some((p) => p.name === 'A'))
}
{
  let healthy = false
  const a = provider('A', () => { if (!healthy) throw new ProviderError('x', 429); return GOOD }), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now })
  await chain.run('s', [])
  advance(61_000); healthy = true
  const r = await chain.run('s', [])
  ok('provider that recovers is used again and its record is cleared', r?.provider === 'A' && chain.status()[0].available && chain.status()[0].kind === undefined)
}
{
  const a = provider('A', () => { throw new ProviderError('rate', 429, 5000) }), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now })
  await chain.run('s', [])
  advance(4000); await chain.run('s', [])
  ok('Retry-After 5s: still resting at 4s', a.calls === 1)
  advance(1500); await chain.run('s', [])
  ok('Retry-After 5s: retried after 5.5s', a.calls === 2)
}
{
  const a = provider('A', () => { throw new ProviderError('invalid API key', 401) }), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now })
  await chain.run('s', []); advance(29 * 60_000); await chain.run('s', [])
  ok('bad API key rests for 30 min', a.calls === 1)
}
{
  const a = provider('A', () => { throw new Error('boom') }), b = provider('B', () => { throw new ProviderError('x', 500) })
  const chain = new ProviderChain([a, b], { now })
  const r = await chain.run('s', [])
  ok('all providers failing -> null', r === null && a.calls === 1 && b.calls === 1)
  const r2 = await chain.run('s', [])
  ok('...and the next request fails fast without calling anyone', r2 === null && a.calls === 1 && b.calls === 1)
}
{
  const a = provider('A', () => new Promise<string>(() => {})), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now, timeoutMs: 40 })
  const t0 = Date.now()
  const r = await chain.run('s', [])
  ok('a hanging provider times out and the next answers', r?.provider === 'B' && Date.now() - t0 < 1000)
}
{
  const a = provider('A', () => 'ok'), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now })
  const r = await chain.run('s', [])
  ok('too-short/empty answers count as failures', r?.provider === 'B')
}
{
  // slow first provider: the backup starts after hedgeMs and wins, without waiting for the slow one's time-out
  const a = provider('A', () => new Promise<string>((r) => setTimeout(() => r(GOOD), 400))), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now, hedgeMs: 30, timeoutMs: 2000 })
  const t0 = Date.now()
  const r = await chain.run('s', [])
  ok('a slow provider is hedged: the backup answers first', r?.provider === 'B' && Date.now() - t0 < 300, String(Date.now() - t0))
}
{
  // fast first provider: the backup is never called
  const a = provider('A', () => GOOD), b = provider('B', () => GOOD)
  const chain = new ProviderChain([a, b], { now, hedgeMs: 30 })
  const r = await chain.run('s', [])
  await new Promise((r) => setTimeout(r, 80))
  ok('a fast provider answers alone (no wasted calls)', r?.provider === 'A' && b.calls === 0)
}
{
  // everyone fails: null, and nobody is called twice
  const a = provider('A', () => { throw new ProviderError('boom', 500) }), b = provider('B', () => { throw new ProviderError('boom', 500) })
  const chain = new ProviderChain([a, b], { now, hedgeMs: 30 })
  const r = await chain.run('s', [])
  ok('all providers failing returns null once', r === null && a.calls === 1 && b.calls === 1)
}
{
  const chain = new ProviderChain([], { now })
  ok('no providers configured -> null (caller uses sources-only answer)', (await chain.run('s', [])) === null)
}

// ---- answer cache ----
{
  let t = 0
  const c = new AnswerCache<string>(3, 1000, () => t)
  c.set('a', '1'); c.set('b', '2'); c.set('c', '3')
  ok('cache stores and returns', c.get('a') === '1' && c.size === 3)
  c.set('d', '4')
  ok('LRU eviction beyond max (b evicted, a was refreshed)', c.get('b') === undefined && c.get('a') === '1' && c.size === 3)
  t = 1500
  ok('entries expire after the TTL', c.get('a') === undefined)
  ok('questionKey ignores case/punctuation/extra spaces', questionKey({ message: '  What IS Patience?? ', lang: 'en', kids: false }) === questionKey({ message: 'what is patience', lang: 'en', kids: false }))
  ok('questionKey separates language, kids mode and passage', new Set([
    questionKey({ message: 'hi', lang: 'en', kids: false }), questionKey({ message: 'hi', lang: 'ur', kids: false }),
    questionKey({ message: 'hi', lang: 'en', kids: true }), questionKey({ message: 'hi', lang: 'en', kids: false, passage: '2:255' }),
  ]).size === 4)
  ok('questionKey keeps non-Latin text (Arabic/Urdu questions)', questionKey({ message: 'صبر کیا ہے؟', lang: 'ur', kids: false }).includes('صبر'))
}

// ---- sources-only answer ----
{
  const src = [
    { id: 'Q1', kind: 'quran' as const, ref: '4:36', text: 'Worship Allah and do good to the neighbor' },
    { id: 'H1', kind: 'hadith' as const, ref: 'Sahih Muslim 173', text: 'x'.repeat(500) },
  ]
  const a = extractiveAnswer(src, 'unavailable')
  ok('sources-only answer lists Quran and hadith with their ids', /\[Q1\] Quran 4:36/.test(a) && /\[H1\] Sahih Muslim 173/.test(a))
  ok('long hadith are truncated', !a.includes('x'.repeat(400)) && a.includes('…'))
  ok('it says plainly that it is not an AI explanation', /without interpretation/.test(a) && /busy/.test(a))
  ok('unconfigured wording differs', /No AI model is connected/.test(extractiveAnswer(src, 'unconfigured')))
  const none = extractiveAnswer([], 'unavailable')
  ok('no sources -> helpful message, not an empty answer', none.length > 80 && /rephras/i.test(none))
}

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
