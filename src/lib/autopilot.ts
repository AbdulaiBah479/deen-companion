// The autopilot: a scheduler calls /api/cron/watchdog every few minutes. Each run it
//   1. CHECKS the app and every outside service it leans on,
//   2. NOTICES changes (only after two bad looks in a row, so one blip does not wake anyone),
//   3. FIXES what it can by itself (looks up working AI model names, clears stuck cool-downs, tidies dead reminders),
//   4. ALERTS the owner (phone notification + optional chat webhook), once per problem and once when it recovers.
// The decision logic (nextStates) is pure and unit-tested; the checks are plain HTTP calls with short time limits.

import { adminDeviceCount, sendAlert } from './alerts'
import { aiCanary, configuredProviders, healModels } from './ai'
import { dataAvailable } from './data'
import { addIncident, flushCounters, readProviderStats, readStatuses, readTopErrors, writeStatuses, type ComponentState, type Status } from './ops'
import { MAX_DEVICES, SCHEDULER_STALE_MIN, lastRunAgeMin, pushConfigured } from './push'
import { redis, redisConfigured } from './redis'

export type Check = { id: string; label: string; critical: boolean; status: Status; ms?: number; detail: string }

// ── decisions (pure) ──
export type Transition = { id: string; label: string; kind: 'went-bad' | 'recovered'; status: Status; critical: boolean; detail: string }

const STRIKES_BEFORE_ALERT = 2
type Stored = ComponentState & { strikes?: number; alerted?: boolean }

// Compares what we saw before with what we see now. A problem is announced after two bad looks in a row (and only once);
// recovery is announced once, if the problem had been announced.
export function nextStates(prev: Record<string, Stored>, checks: Check[], now: number): { states: Record<string, Stored>; transitions: Transition[] } {
  const states: Record<string, Stored> = {}
  const transitions: Transition[] = []
  for (const c of checks) {
    const before = prev[c.id]
    const bad = c.status !== 'up'
    const strikes = bad ? (before?.strikes ?? 0) + 1 : 0
    let alerted = before?.alerted ?? false
    if (bad && strikes >= STRIKES_BEFORE_ALERT && !alerted) {
      alerted = true
      transitions.push({ id: c.id, label: c.label, kind: 'went-bad', status: c.status, critical: c.critical, detail: c.detail })
    } else if (!bad && alerted) {
      alerted = false
      transitions.push({ id: c.id, label: c.label, kind: 'recovered', status: 'up', critical: c.critical, detail: c.detail })
    }
    states[c.id] = { status: c.status, since: before && before.status === c.status ? before.since : now, checkedAt: now, detail: c.detail, ms: c.ms, strikes, alerted }
  }
  return { states, transitions }
}

// "Is the app healthy enough?" — false when a critical part has been bad for two looks (the scheduler job then fails, and GitHub emails the owner).
export function overallOk(states: Record<string, Stored>, checks: Check[]): boolean {
  return !checks.some((c) => c.critical && c.status === 'down' && (states[c.id]?.strikes ?? 0) >= STRIKES_BEFORE_ALERT)
}

// ── checks ──
async function timed(id: string, label: string, critical: boolean, fn: () => Promise<{ status: Status; detail: string }>): Promise<Check> {
  const t0 = Date.now()
  try {
    const r = await fn()
    return { id, label, critical, ...r, ms: Date.now() - t0 }
  } catch (e) {
    return { id, label, critical, status: 'down', detail: e instanceof Error ? e.message.slice(0, 120) : 'failed', ms: Date.now() - t0 }
  }
}

const fetchOk = async (url: string, init: RequestInit = {}, ms = 8000) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms), cache: 'no-store', headers: { 'User-Agent': 'DeenCompanion-watchdog/1.0', ...(init.headers ?? {}) } })
  return res
}

const slowIs = (ms: number, slow: number) => (ms > slow ? 'degraded' : 'up') as Status

export async function runChecks(): Promise<Check[]> {
  const checks: Promise<Check>[] = []
  const external = process.env.WATCHDOG_SKIP_EXTERNAL !== '1' // tests switch the real-internet probes off

  checks.push(timed('app', 'App and its data', true, async () => (dataAvailable() ? { status: 'up', detail: 'Quran and hadith data present' } : { status: 'down', detail: 'data folder missing' })))

  checks.push(
    timed('redis', 'Shared store (Redis)', false, async () => {
      if (!redisConfigured()) return { status: 'degraded', detail: 'not configured — limits and reminders are per-server only' }
      const t0 = Date.now()
      await redis([['PING']])
      const ms = Date.now() - t0
      return { status: slowIs(ms, 1500), detail: `${ms} ms` }
    })
  )

  checks.push(
    timed('ai', 'AI companion', true, async () => {
      const n = configuredProviders().length
      if (n === 0) return { status: 'degraded', detail: 'no AI keys set — answers come from sources only' }
      // Recent real answers prove it works without spending any free quota on a test question.
      const stats = await readProviderStats()
      const recent = Object.entries(stats).filter(([, s]) => (s.lastOk ?? 0) > Date.now() - 45 * 60_000)
      if (recent.length) return { status: 'up', detail: `${recent.map(([k]) => k).join(', ')} answered recently` }
      const c = await aiCanary()
      if (c.ok) return { status: slowIs(c.ms, 12_000), detail: `${c.provider} answered in ${c.ms} ms` }
      return { status: 'down', detail: 'no AI provider answered the test question' }
    })
  )

  if (external)
    checks.push(
    timed('hadith-cdn', 'Hadith source (jsDelivr)', false, async () => {
      const t0 = Date.now()
      const r = await fetchOk('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-nawawi/1.json')
      if (!r.ok) return { status: 'down', detail: `HTTP ${r.status}` }
      return { status: slowIs(Date.now() - t0, 4000), detail: 'reachable' }
    })
  )

  if (external)
    checks.push(
    timed('tafsir-api', 'Tafsir source (Quran.Foundation)', false, async () => {
      const t0 = Date.now()
      const r = await fetchOk('https://api.quran.com/api/v4/tafsirs/169/by_ayah/1:1')
      if (!r.ok) return { status: 'degraded', detail: `HTTP ${r.status} — verse explanations and tafsir pages will be empty` }
      return { status: slowIs(Date.now() - t0, 5000), detail: 'reachable' }
    })
  )

  if (external)
    checks.push(
    timed('books', 'Book sources (Gutenberg, Arabic Wikisource)', false, async () => {
      const t0 = Date.now()
      const [g, w] = await Promise.allSettled([
        fetchOk('https://www.gutenberg.org/cache/epub/58977/pg58977.txt', { method: 'HEAD' }, 10_000),
        fetchOk('https://ar.wikisource.org/w/api.php?action=query&meta=siteinfo&format=json', {}, 10_000),
      ])
      const up = [g, w].filter((x) => x.status === 'fulfilled' && x.value.ok).length
      if (up === 0) return { status: 'down', detail: 'neither source answered — books cannot load' }
      if (up === 1) return { status: 'degraded', detail: g.status === 'fulfilled' && g.value.ok ? 'Arabic Wikisource is not answering (English books work)' : 'Project Gutenberg is not answering (Arabic books work)' }
      return { status: slowIs(Date.now() - t0, 6000), detail: 'both reachable' }
    })
  )

  if (external)
    checks.push(
    timed('prayer-api', 'Prayer-times service (AlAdhan)', false, async () => {
      const t0 = Date.now()
      const r = await fetchOk('https://api.aladhan.com/v1/timingsByCity?city=London&country=UK&method=2')
      if (!r.ok) return { status: 'degraded', detail: `HTTP ${r.status} — the app still calculates times on the device` }
      return { status: slowIs(Date.now() - t0, 4000), detail: 'reachable' }
    })
  )

  if (external)
    checks.push(
    timed('audio', 'Recitation audio (EveryAyah)', false, async () => {
      const t0 = Date.now()
      const r = await fetchOk('https://everyayah.com/data/Alafasy_128kbps/001001.mp3', { method: 'HEAD' })
      if (!r.ok) return { status: 'down', detail: `HTTP ${r.status}` }
      return { status: slowIs(Date.now() - t0, 4000), detail: 'reachable' }
    })
  )

  if (external)
    checks.push(
    timed('maps', 'Mosque map services (OpenStreetMap)', false, async () => {
      const t0 = Date.now()
      const q = encodeURIComponent('[out:json][timeout:8];node(1);out;')
      const mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
      const tries = await Promise.allSettled([
        ...mirrors.map((m) => fetchOk(`${m}?data=${q}`, {}, 9000).then((r) => (r.ok ? m : Promise.reject(new Error(String(r.status)))))),
        fetchOk('https://nominatim.openstreetmap.org/search?q=mosque&format=json&limit=1', {}, 9000).then((r) => (r.ok ? 'nominatim' : Promise.reject(new Error(String(r.status))))),
      ])
      const up = tries.filter((t) => t.status === 'fulfilled').length
      if (up === 0) return { status: 'down', detail: 'no map service answered — mosque search will be empty' }
      return { status: up >= 2 && Date.now() - t0 < 6000 ? 'up' : 'degraded', detail: `${up} of ${tries.length} map services answered` }
    })
  )

  checks.push(
    timed('push', 'Prayer reminders', false, async () => {
      if (!pushConfigured()) return { status: 'degraded', detail: 'not configured (needs VAPID keys and Redis)' }
      const [n] = (await redis([['SCARD', 'push:ids']])) as [number]
      const admins = await adminDeviceCount()
      if (Number(n) >= MAX_DEVICES * 0.8) return { status: 'degraded', detail: `${n} reminder devices — nearly full (new sign-ups pause at ${MAX_DEVICES.toLocaleString()}); time to move the scheduler to a bigger plan` }
      const age = await lastRunAgeMin()
      if (Number(n) > 0 && (age === null || age > SCHEDULER_STALE_MIN)) {
        return { status: 'degraded', detail: `${n} device(s) are waiting for reminders but nothing has asked the app to send them ${age === null ? 'yet' : 'for ' + Math.round(age) + ' minutes'}. Add the GitHub secrets APP_URL and CRON_SECRET (or use a free cron service) so the scheduler can run.` }
      }
      return { status: 'up', detail: `${n} subscribed device(s); ${admins} admin alert device(s); scheduler last ran ${age === null ? 'never' : Math.round(age) + ' min ago'}` }
    })
  )

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    checks.push(
      timed('accounts', 'Accounts (Supabase)', true, async () => {
        const t0 = Date.now()
        const r = await fetchOk(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } })
        if (!r.ok) return { status: 'down', detail: `HTTP ${r.status} — sign-in will fail (a free project pauses after a week of no use)` }
        return { status: slowIs(Date.now() - t0, 3000), detail: 'reachable' }
      })
    )
  }

  return Promise.all(checks)
}

// ── the whole run ──
export type Report = { ok: boolean; at: string; checks: Check[]; alerts: string[]; fixes: string[] }

export async function runAutopilot(): Promise<Report> {
  const now = Date.now()
  const fixes: string[] = []
  const alerts: string[] = []
  let checks = await runChecks()

  // FIX: the AI is down or every provider is failing → ask the providers which models exist today, then look again.
  const ai = checks.find((c) => c.id === 'ai')
  if (ai && ai.status === 'down') {
    const healed = await healModels(true)
    if (Object.keys(healed.found).length) {
      fixes.push(`Looked up current AI models: ${Object.entries(healed.found).map(([k, v]) => `${k} → ${v.join(', ')}`).join('; ')}`)
      const again = await timed('ai', 'AI companion', true, async () => {
        const c = await aiCanary()
        return c.ok ? { status: 'up', detail: `${c.provider} answered after the model refresh` } : { status: 'down', detail: 'still no answer after the model refresh' }
      })
      checks = checks.map((c) => (c.id === 'ai' ? again : c))
    } else if (healed.notes.length) {
      fixes.push(`Model lookup found nothing usable: ${healed.notes.join('; ')}`)
    }
  }

  // NOTICE + ALERT
  const prev = (await readStatuses()) as Record<string, Stored>
  const { states, transitions } = nextStates(prev, checks, now)
  for (const t of transitions) {
    if (t.kind === 'went-bad') {
      const sent = await sendAlert(t.critical ? 'critical' : 'warn', `${t.label} is ${t.status}`, t.detail, { component: t.id })
      alerts.push(`${t.label} ${t.status} (${sent.push} phone, ${sent.webhook ? 'webhook' : 'no webhook'})`)
    } else {
      await sendAlert('info', `${t.label} is back`, t.detail, { component: t.id })
      alerts.push(`${t.label} recovered`)
    }
  }

  // NOTICE: a crash that many visitors hit
  try {
    for (const e of await readTopErrors(3)) {
      if (e.count < 15) continue
      const [first] = (await redis([['SET', `ops:alerted:err:${e.sig}`, '1', 'NX', 'EX', 6 * 3600]])) as [string | null]
      if (first === 'OK') {
        await sendAlert('warn', `A page error is hitting many visitors (${e.count}× today)`, `${e.page}: ${e.message}`, { component: 'client-errors' })
        alerts.push(`error spike on ${e.page}`)
      }
    }
  } catch {}

  // FIX: tidy once a day — forget reminder devices whose record has expired
  try {
    if (redisConfigured()) {
      const [claimed] = (await redis([['SET', `ops:housekeeping:${new Date().toISOString().slice(0, 10)}`, '1', 'NX', 'EX', 90_000]])) as [string | null]
      if (claimed === 'OK') {
        const [ids] = (await redis([['SMEMBERS', 'push:ids']])) as [string[]]
        let removed = 0
        for (let i = 0; i < (ids ?? []).length; i += 50) {
          const batch = ids.slice(i, i + 50)
          const exist = (await redis(batch.map((id) => ['EXISTS', `push:sub:${id}`]))) as number[]
          const dead = batch.filter((_, k) => !exist[k])
          if (dead.length) {
            await redis([['SREM', 'push:ids', ...dead]])
            removed += dead.length
          }
        }
        if (removed) fixes.push(`Removed ${removed} expired reminder device(s)`)
      }
    }
  } catch {}

  await writeStatuses(states).catch(() => {})
  await flushCounters()
  for (const f of fixes) await addIncident({ level: 'info', component: 'autopilot', message: f })
  return { ok: overallOk(states, checks), at: new Date(now).toISOString(), checks, alerts, fixes }
}
