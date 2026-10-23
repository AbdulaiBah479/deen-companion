// Provider fallback chain with per-provider cool-downs ("circuit breaker").
//
// Free AI tiers run out (rate limits, daily quotas). Instead of hammering a provider that is out of quota, we
// remember that it failed and skip it until its cool-down expires, going straight to the next provider.
// Pure logic with an injectable clock so it can be unit-tested.

export type ChatTurn = { role: 'user' | 'assistant'; content: string }
export type Provider = { name: string; run: (system: string, history: ChatTurn[]) => Promise<string> }

export class ProviderError extends Error {
  status?: number
  retryAfterMs?: number
  constructor(message: string, status?: number, retryAfterMs?: number) {
    super(message)
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

const MIN = 60_000

export type Failure = { cooldownMs: number; kind: 'rate-limit' | 'auth' | 'transient' }

// Decide how long to rest a provider after an error.
export function classifyFailure(err: unknown, consecutiveFails: number): Failure {
  const status = typeof (err as ProviderError)?.status === 'number' ? (err as ProviderError).status : undefined
  const retryAfter = (err as ProviderError)?.retryAfterMs
  const message = err instanceof Error ? err.message : String(err)
  const escalate = (base: number, cap: number) => Math.min(cap, base * 2 ** Math.max(0, consecutiveFails - 1))

  if (status === 429 || /quota|rate.?limit|resource_exhausted|too many requests|429/i.test(message)) {
    return { kind: 'rate-limit', cooldownMs: retryAfter ? Math.min(retryAfter, 30 * MIN) : escalate(MIN, 15 * MIN) }
  }
  if (status === 401 || status === 403 || status === 404 || /api.?key|unauthori[sz]ed|permission|not found|invalid/i.test(message)) {
    return { kind: 'auth', cooldownMs: 30 * MIN }
  }
  return { kind: 'transient', cooldownMs: escalate(20_000, 5 * MIN) }
}

type Health = { until: number; fails: number; lastKind?: Failure['kind'] }

export class ProviderChain {
  private health = new Map<string, Health>()
  private providers: Provider[]
  private timeoutMs: number
  private hedgeMs: number
  private now: () => number

  constructor(providers: Provider[], opts: { timeoutMs?: number; hedgeMs?: number; now?: () => number } = {}) {
    this.providers = providers
    this.timeoutMs = opts.timeoutMs ?? 20_000
    this.hedgeMs = opts.hedgeMs ?? 3_500
    this.now = opts.now ?? Date.now
  }

  // Replace the provider list (e.g. env changed) but keep what we've learned about each one.
  setProviders(providers: Provider[]) {
    this.providers = providers
  }

  available(): Provider[] {
    const t = this.now()
    return this.providers.filter((p) => (this.health.get(p.name)?.until ?? 0) <= t)
  }

  status() {
    const t = this.now()
    return this.providers.map((p) => {
      const h = this.health.get(p.name)
      return { name: p.name, available: !h || h.until <= t, retryInMs: h && h.until > t ? h.until - t : 0, kind: h?.lastKind }
    })
  }

  // Tries providers in order, but if one is slow (hedgeMs) the next one starts at the same time and the first
  // good answer wins, so one sluggish provider no longer makes everybody wait for its time-out.
  async run(system: string, history: ChatTurn[]): Promise<{ answer: string; provider: string } | null> {
    const queue = this.available()
    if (!queue.length) return null
    return new Promise((resolve) => {
      let next = 0
      let running = 0
      let done = false
      let hedge: ReturnType<typeof setTimeout> | undefined
      const finish = (v: { answer: string; provider: string } | null) => {
        if (done) return
        done = true
        if (hedge) clearTimeout(hedge)
        resolve(v)
      }
      const launch = () => {
        if (done || next >= queue.length) return false
        const p = queue[next++]
        running++
        if (hedge) clearTimeout(hedge)
        hedge = setTimeout(launch, this.hedgeMs)
        let timer: ReturnType<typeof setTimeout> | undefined
        Promise.race([
          p.run(system, history),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('timed out')), this.timeoutMs)
          }),
        ])
          .then((answer) => {
            if (!answer || answer.trim().length <= 20) throw new Error('empty answer')
            this.health.delete(p.name) // healthy again
            finish({ answer: answer.trim(), provider: p.name })
          })
          .catch((err) => {
            const prev = this.health.get(p.name)
            const fails = (prev?.fails ?? 0) + 1
            const f = classifyFailure(err, fails)
            this.health.set(p.name, { until: this.now() + f.cooldownMs, fails, lastKind: f.kind })
          })
          .finally(() => {
            if (timer) clearTimeout(timer)
            running--
            if (done) return
            if (!launch() && running === 0) finish(null)
          })
        return true
      }
      launch()
    })
  }
}
