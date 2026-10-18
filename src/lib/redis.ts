// Minimal Upstash Redis (REST) client — no SDK. The same free Redis that shares rate limits across servers also stores
// prayer-reminder subscriptions. Every command goes in one HTTP request ("pipeline").

export const redisConfigured = () => !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

export async function redis(commands: (string | number)[][]): Promise<unknown[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Redis is not configured')
  const res = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands.map((c) => c.map(String))),
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Redis ' + res.status)
  const data = (await res.json()) as { result?: unknown; error?: string }[]
  const bad = data.find((d) => d.error)
  if (bad) throw new Error('Redis: ' + bad.error)
  return data.map((d) => d.result)
}
