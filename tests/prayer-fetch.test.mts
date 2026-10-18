// Tests the hedged request used for the (occasionally slow) AlAdhan API.  Run: npm run test:fetch
import { aladhan } from '../src/lib/prayer.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const realFetch = globalThis.fetch
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const reply = (data: unknown) => ({ json: async () => data }) as unknown as Response

// Each call to fetch is given a behaviour; calls are counted.
function mock(behaviours: ((n: number) => Promise<Response>)[]) {
  let calls = 0
  globalThis.fetch = (async () => {
    const n = calls++
    return behaviours[Math.min(n, behaviours.length - 1)](n)
  }) as typeof fetch
  return () => calls
}

// 1. Fast server: one request only, no duplicate sent after the hedge delay.
let calls = mock([async () => reply({ ok: 1 })])
let t0 = Date.now()
let r = await aladhan('/x', 0, 150)
const fastMs = Date.now() - t0
await sleep(300) // longer than the hedge delay: the second request must not appear
ok('fast answer: returned immediately', r.ok === 1 && fastMs < 120, `${fastMs} ms`)
ok('fast answer: no duplicate request is ever sent', calls() === 1, `${calls()} call(s)`)

// 2. Slow first request (hangs), fast second: result arrives at ~hedge time, not after the slow one.
calls = mock([() => sleep(3000).then(() => reply({ from: 'slow' })), async () => reply({ from: 'hedge' })])
t0 = Date.now()
r = await aladhan('/x', 0, 150)
ok('slow first request: the hedged second one wins', r.from === 'hedge', r.from)
ok('slow first request: answered at ~hedge delay, not after the slow one', Date.now() - t0 >= 140 && Date.now() - t0 < 600, `${Date.now() - t0} ms`)
ok('slow first request: exactly two requests were made', calls() === 2)

// 3. First fails fast, second succeeds.
calls = mock([async () => { throw new Error('network down') }, async () => reply({ from: 'second' })])
r = await aladhan('/x', 0, 100)
ok('first request errors: the hedge rescues it', r.from === 'second')

// 4. Both fail -> rejects (the caller turns this into a friendly message).
calls = mock([async () => { throw new Error('a') }, async () => { throw new Error('b') }])
let threw = false
try {
  await aladhan('/x', 0, 80)
} catch {
  threw = true
}
ok('both fail: rejects so the caller can show an error', threw)

// 5. Slow first that eventually succeeds still works when the hedge also hangs.
calls = mock([() => sleep(400).then(() => reply({ from: 'first-eventually' })), () => sleep(5000).then(() => reply({ from: 'hedge-slower' }))])
r = await aladhan('/x', 0, 100)
ok('whichever succeeds first wins (slow first beats slower hedge)', r.from === 'first-eventually', r.from)

globalThis.fetch = realFetch
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
