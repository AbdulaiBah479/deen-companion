// Rate limiter. Protects your free API quotas from being used up by one visitor.
//
// By default it counts in server memory, which is fine for a single server. On Vercel (many short-lived instances) the counts
// would not be shared, so set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (free tier at upstash.com) and the same
// limits are enforced across all instances. If Redis is unreachable it quietly falls back to the in-memory counter — a Redis
// outage must never take the app down.

const hits = new Map<string, number[]>()

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'local'
}

export type Limit = { ok: boolean; retryAfter: number }

// In-memory sliding window.
export function rateLimitLocal(key: string, limit: number, windowMs: number, now = Date.now()): Limit {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) }
  }
  recent.push(now)
  hits.set(key, recent)
  // Opportunistic cleanup so the map can't grow without bound.
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  return { ok: true, retryAfter: 0 }
}

let redisDownUntil = 0

// Shared fixed window in Upstash Redis (REST API, no SDK needed): INCR a per-window counter and give it an expiry.
export async function rateLimitRedis(key: string, limit: number, windowMs: number, now = Date.now()): Promise<Limit | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token || now < redisDownUntil) return null
  const windowId = Math.floor(now / windowMs)
  const k = `rl:${key}:${windowId}`
  try {
    const res = await fetch(url.replace(/\/$/, '') + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', k],
        ['PEXPIRE', k, String(windowMs), 'NX'],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as { result?: number; error?: string }[]
    const count = Number(data?.[0]?.result)
    if (!Number.isFinite(count)) throw new Error('bad reply')
    const retryAfter = Math.max(1, Math.ceil(((windowId + 1) * windowMs - now) / 1000))
    return count > limit ? { ok: false, retryAfter } : { ok: true, retryAfter: 0 }
  } catch {
    redisDownUntil = now + 30_000 // don't wait on a dead Redis for every request; try again in 30 s
    return null
  }
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<Limit> {
  return (await rateLimitRedis(key, limit, windowMs)) ?? rateLimitLocal(key, limit, windowMs)
}

export const _resetRedisBackoff = () => {
  redisDownUntil = 0
}
