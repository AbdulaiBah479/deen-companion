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
  private perf = new Map<string, { ok: number; fail: number; ewmaMs: number }>()
  private onResult?: (name: string, ok: boolean, ms: number, error?: string) => void
  private providers: Provider[]
  private timeoutMs: number
  private hedgeMs: number
  private now: () => number

  constructor(providers: Provider[], opts: { timeoutMs?: number; hedgeMs?: number; now?: () => number; onResult?: (name: string, ok: boolean, ms: number, error?: string) => void } = {}) {
    this.onResult = opts.onResult
    this.providers = providers
    this.timeoutMs = opts.timeoutMs ?? 20_000
    this.hedgeMs = opts.hedgeMs ?? 3_500
    this.now = opts.now ?? Date.now
  }

  // Replace the provider list (e.g. env changed) but keep what we've learned about each one.
  setProviders(providers: Provider[]) {
    this.providers = providers
  }

  // Providers that are not resting, in the configured order — except that one which keeps failing or is very slow is moved
  // behind the others (adapting to what is actually working today). With no history the configured order is kept.
  available(): Provider[] {
    const t = this.now()
    const open = this.providers.filter((p) => (this.health.get(p.name)?.until ?? 0) <= t)
    const penalty = (p: Provider) => {
      const s = this.perf.get(p.name)
      if (!s || s.ok + s.fail < 4) return 0
      const failRate = s.fail / (s.ok + s.fail)
      return (failRate > 0.5 ? 100 : failRate > 0.25 ? 30 : 0) + (s.ewmaMs > 9000 ? 20 : s.ewmaMs > 5000 ? 8 : 0)
    }
    return open.map((p, i) => ({ p, k: i + penalty(p) })).sort((a, b) => a.k - b.k).map((x) => x.p)
  }

  // What the chain has learned about each provider this session (for the admin view).
  performance() {
    return Object.fromEntries([...this.perf.entries()].map(([k, v]) => [k, { ...v }]))
  }

  // Forget cool-downs (an admin action, or after the models were refreshed).
  reset() {
    this.health.clear()
  }

  private note(name: string, ok: boolean, ms: number, error?: string) {
    const s = this.perf.get(name) ?? { ok: 0, fail: 0, ewmaMs: ms }
    if (ok) {
      s.ok++
      s.ewmaMs = Math.round(s.ewmaMs * 0.8 + ms * 0.2)
    } else s.fail++
    if (s.ok + s.fail > 60) {
      s.ok = Math.round(s.ok / 2)
      s.fail = Math.round(s.fail / 2)
    }
    this.perf.set(name, s)
    try {
      this.onResult?.(name, ok, ms, error)
    } catch {}
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
        const started = Date.now()
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
            this.note(p.name, true, Date.now() - started)
            finish({ answer: answer.trim(), provider: p.name })
          })
          .catch((err) => {
            this.note(p.name, false, Date.now() - started, err instanceof Error ? err.message : String(err))
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
