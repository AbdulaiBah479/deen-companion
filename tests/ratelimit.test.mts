// Tests the rate limiter: in-memory window, shared Redis window, and the fallback when Redis is down.  Run: npm run test:ratelimit
import http from 'node:http'
import { _resetRedisBackoff, rateLimit, rateLimitLocal, rateLimitRedis } from '../src/lib/ratelimit.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ───────── in-memory ─────────
const t0 = 1_000_000
const seq = [1, 2, 3, 4].map((i) => rateLimitLocal('a', 3, 60_000, t0 + i))
ok('local: allows up to the limit, then refuses', seq.map((s) => s.ok).join() === 'true,true,true,false')
ok('local: tells the caller how long to wait', seq[3].retryAfter >= 59 && seq[3].retryAfter <= 60, String(seq[3].retryAfter))
ok('local: the window slides (allowed again after it passes)', rateLimitLocal('a', 3, 60_000, t0 + 61_000).ok)
ok('local: visitors are counted separately', rateLimitLocal('b', 3, 60_000, t0).ok)

// ───────── fake Redis (Upstash REST) ─────────
const counts = new Map<string, { n: number; exp: number }>()
let down = false
let auth = ''
const srv = http.createServer((req, res) => {
  let b = ''
  req.on('data', (d) => (b += d))
  req.on('end', () => {
    auth = String(req.headers.authorization)
    if (down) {
      res.writeHead(503)
      return res.end('{}')
    }
    const out = JSON.parse(b).map(([cmd, key, ms, flag]: string[]) => {
      if (cmd === 'INCR') {
        const e = counts.get(key) ?? { n: 0, exp: 0 }
        e.n++
        counts.set(key, e)
        return { result: e.n }
      }
      const e = counts.get(key)!
      if (flag === 'NX' && e.exp) return { result: 0 }
      e.exp = Date.now() + Number(ms)
      return { result: 1 }
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(out))
  })
})
await new Promise<void>((r) => srv.listen(0, r))
const port = (srv.address() as { port: number }).port

delete process.env.UPSTASH_REDIS_REST_URL
delete process.env.UPSTASH_REDIS_REST_TOKEN
ok('redis: not configured → returns null (caller uses memory)', (await rateLimitRedis('x', 2, 60_000)) === null)

process.env.UPSTASH_REDIS_REST_URL = `http://localhost:${port}`
process.env.UPSTASH_REDIS_REST_TOKEN = 'secret-token'
const now = 5 * 60_000 + 10_000
const r1 = await rateLimitRedis('ip1', 2, 60_000, now)
const r2 = await rateLimitRedis('ip1', 2, 60_000, now + 1000)
const r3 = await rateLimitRedis('ip1', 2, 60_000, now + 2000)
ok('redis: allows up to the limit, then refuses', r1?.ok === true && r2?.ok === true && r3?.ok === false)
ok('redis: retry-after is the time left in the window', (r3?.retryAfter ?? 0) >= 46 && (r3?.retryAfter ?? 0) <= 50, String(r3?.retryAfter))
ok('redis: the key is sent as a Bearer token', auth === 'Bearer secret-token')
ok('redis: a new window starts a new count', (await rateLimitRedis('ip1', 2, 60_000, now + 60_000))?.ok === true)
ok('redis: visitors are counted separately', (await rateLimitRedis('ip2', 2, 60_000, now))?.ok === true)

// ───────── Redis outage ─────────
down = true
const viaFallback = await rateLimit('outage-user', 2, 60_000)
ok('outage: requests still work (falls back to memory)', viaFallback.ok === true)
const before = counts.size
await rateLimit('outage-user', 2, 60_000)
const third = await rateLimit('outage-user', 2, 60_000)
ok('outage: memory fallback still enforces the limit', third.ok === false)
ok('outage: Redis is not hammered while it is down', counts.size === before)
down = false
_resetRedisBackoff()
ok('recovery: uses Redis again once it is back', (await rateLimitRedis('fresh', 5, 60_000))?.ok === true)

process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:1' // nothing listens here
_resetRedisBackoff()
const t = Date.now()
const dead = await rateLimit('dead', 5, 60_000)
ok('unreachable Redis: answers quickly (short timeout) and allows the request', dead.ok && Date.now() - t < 3000, String(Date.now() - t) + ' ms')

srv.close()
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
