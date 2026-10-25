// Operations memory: counters, component status, incidents and error samples, kept in the same free Upstash Redis.
// Everything here is best-effort — if Redis is missing or slow, the app carries on and only the admin view is poorer.
// Privacy: only counts and technical facts are stored. No IP addresses, no user names, no questions asked of the AI.

import { redis, redisConfigured } from './redis'

export type Level = 'info' | 'warn' | 'critical'
export type Status = 'up' | 'degraded' | 'down'
export type ComponentState = { status: Status; since: number; checkedAt: number; detail: string; ms?: number }
export type Incident = { at: number; level: Level; component: string; message: string }

const DAY = 86_400
export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10)

// ── counters, flushed in batches so a busy site does not spend its free Redis quota on bookkeeping ──
const buffer = new Map<string, number>()
let lastFlush = 0
const FLUSH_EVERY_MS = 30_000

export function track(name: string, n = 1): void {
  buffer.set(name, (buffer.get(name) ?? 0) + n)
  if (Date.now() - lastFlush > FLUSH_EVERY_MS) void flushCounters()
}

export async function flushCounters(): Promise<void> {
  lastFlush = Date.now()
  if (!buffer.size || !redisConfigured()) {
    buffer.clear()
    return
  }
  const day = dayKey()
  const entries = [...buffer.entries()]
  buffer.clear()
  try {
    await redis([...entries.map(([k, v]) => ['HINCRBY', `ops:c:${day}`, k, v]), ['EXPIRE', `ops:c:${day}`, 9 * DAY]])
  } catch {
    // lost counts are fine
  }
}

export async function readCounters(days = 7): Promise<{ day: string; counts: Record<string, number> }[]> {
  if (!redisConfigured()) return []
  const keys = Array.from({ length: days }, (_, i) => dayKey(new Date(Date.now() - i * DAY * 1000)))
  try {
    const rows = (await redis(keys.map((d) => ['HGETALL', `ops:c:${d}`]))) as (string[] | null)[]
    return keys.map((day, i) => {
      const counts: Record<string, number> = {}
      const flat = rows[i] ?? []
      for (let j = 0; j + 1 < flat.length; j += 2) counts[flat[j]] = Number(flat[j + 1])
      return { day, counts }
    })
  } catch {
    return []
  }
}

// ── component status (what the watchdog last saw) ──
export async function readStatuses(): Promise<Record<string, ComponentState>> {
  if (!redisConfigured()) return {}
  try {
    const [flat] = (await redis([['HGETALL', 'ops:status']])) as [string[] | null]
    const out: Record<string, ComponentState> = {}
    for (let i = 0; flat && i + 1 < flat.length; i += 2) out[flat[i]] = JSON.parse(flat[i + 1])
    return out
  } catch {
    return {}
  }
}

export async function writeStatuses(next: Record<string, ComponentState>): Promise<void> {
  if (!redisConfigured() || !Object.keys(next).length) return
  await redis([['HSET', 'ops:status', ...Object.entries(next).flatMap(([k, v]) => [k, JSON.stringify(v)])]])
}

// ── incidents ──
export async function addIncident(i: Omit<Incident, 'at'>): Promise<void> {
  console.warn(`[ops] ${i.level} ${i.component}: ${i.message}`)
  if (!redisConfigured()) return
  try {
    await redis([['LPUSH', 'ops:incidents', JSON.stringify({ at: Date.now(), ...i })], ['LTRIM', 'ops:incidents', 0, 199]])
  } catch {}
}

export async function readIncidents(n = 30): Promise<Incident[]> {
  if (!redisConfigured()) return []
  try {
    const [rows] = (await redis([['LRANGE', 'ops:incidents', 0, n - 1]])) as [string[] | null]
    return (rows ?? []).map((r) => JSON.parse(r))
  } catch {
    return []
  }
}

// ── crash reports from browsers, grouped by signature ──
export type ErrorSample = { kind: string; page: string; message: string; source?: string; last: number }
// Anyone can send an error report, so the store is capped: at most this many different errors a day. A flood of made-up
// errors cannot fill the free Redis; the ones already counted keep counting.
export const MAX_ERROR_SIGNATURES_PER_DAY = 300

export async function recordClientError(sig: string, sample: Omit<ErrorSample, 'last'>): Promise<void> {
  if (!redisConfigured()) return
  const day = dayKey()
  try {
    const [size, known] = (await redis([['HLEN', `ops:err:${day}`], ['HEXISTS', `ops:err:${day}`, sig]])) as [number, number]
    if (!known && Number(size) >= MAX_ERROR_SIGNATURES_PER_DAY) return
    await redis([
      ['HINCRBY', `ops:err:${day}`, sig, 1],
      ['EXPIRE', `ops:err:${day}`, 9 * DAY],
      ['HSET', `ops:errsample:${day}`, sig, JSON.stringify({ ...sample, last: Date.now() })],
      ['EXPIRE', `ops:errsample:${day}`, 9 * DAY],
    ])
  } catch {}
}

export async function readTopErrors(n = 10): Promise<(ErrorSample & { sig: string; count: number })[]> {
  if (!redisConfigured()) return []
  try {
    const [flat] = (await redis([['HGETALL', `ops:err:${dayKey()}`]])) as [string[] | null]
    const pairs: [string, number][] = []
    for (let i = 0; flat && i + 1 < flat.length; i += 2) pairs.push([flat[i], Number(flat[i + 1])])
    pairs.sort((a, b) => b[1] - a[1])
    const top = pairs.slice(0, n)
    if (!top.length) return []
    const samples = (await redis(top.map(([sig]) => ['HGET', `ops:errsample:${dayKey()}`, sig]))) as (string | null)[]
    return top.map(([sig, count], i) => ({ sig, count, ...(samples[i] ? JSON.parse(samples[i]!) : { kind: '?', page: '?', message: '?', last: 0 }) }))
  } catch {
    return []
  }
}

// ── how each AI provider has been doing (written by the chain, read by the admin view and the watchdog) ──
export type ProviderStat = { ok: number; fail: number; ewmaMs: number; lastOk?: number; lastFail?: number; lastError?: string }
export async function recordProviderStat(name: string, ok: boolean, ms: number, error?: string): Promise<void> {
  if (!redisConfigured()) return
  try {
    const [cur] = (await redis([['HGET', 'ops:prov', name]])) as [string | null]
    const s: ProviderStat = cur ? JSON.parse(cur) : { ok: 0, fail: 0, ewmaMs: ms }
    if (ok) {
      s.ok++
      s.lastOk = Date.now()
      s.ewmaMs = Math.round(s.ewmaMs * 0.8 + ms * 0.2)
    } else {
      s.fail++
      s.lastFail = Date.now()
      s.lastError = (error ?? '').slice(0, 160)
    }
    // keep the numbers recent: halve them once they get large
    if (s.ok + s.fail > 400) {
      s.ok = Math.round(s.ok / 2)
      s.fail = Math.round(s.fail / 2)
    }
    await redis([['HSET', 'ops:prov', name, JSON.stringify(s)]])
  } catch {}
}

export async function readProviderStats(): Promise<Record<string, ProviderStat>> {
  if (!redisConfigured()) return {}
  try {
    const [flat] = (await redis([['HGETALL', 'ops:prov']])) as [string[] | null]
    const out: Record<string, ProviderStat> = {}
    for (let i = 0; flat && i + 1 < flat.length; i += 2) out[flat[i]] = JSON.parse(flat[i + 1])
    return out
  } catch {
    return {}
  }
}

// ── models the watchdog found to be working (so a retired model name heals itself) ──
export async function readDiscoveredModels(): Promise<Record<string, string[]>> {
  if (!redisConfigured()) return {}
  try {
    const [flat] = (await redis([['HGETALL', 'ops:models']])) as [string[] | null]
    const out: Record<string, string[]> = {}
    for (let i = 0; flat && i + 1 < flat.length; i += 2) out[flat[i]] = JSON.parse(flat[i + 1])
    return out
  } catch {
    return {}
  }
}
export async function writeDiscoveredModels(m: Record<string, string[]>): Promise<void> {
  if (!redisConfigured() || !Object.keys(m).length) return
  await redis([['HSET', 'ops:models', ...Object.entries(m).flatMap(([k, v]) => [k, JSON.stringify(v)])], ['EXPIRE', 'ops:models', 14 * DAY]])
}
