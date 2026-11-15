// Make-up (qada) tracker: how many prayers and fasts you still owe, and your progress in catching up. Kept on the device.
// The app does not decide what you owe: you enter it (or estimate it), and it counts down as you make them up.
// Scholars agree a missed prayer should be made up as soon as possible with repentance; some hold that prayers missed on purpose
// cannot be made up and need sincere repentance only. This is a counter, not a ruling: ask a scholar about your case.

export const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'] as const
export type PrayerKey = (typeof PRAYER_KEYS)[number]
export type DayLog = { prayers: number; fasts: number }
export type Qada = {
  prayers: Record<PrayerKey, number>
  fasts: number
  log: Record<string, DayLog> // by calendar day, "2026-11-10"
}
export const EMPTY_QADA: Qada = { prayers: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 }, fasts: 0, log: {} }

const MAX_OWED = 100_000
const num = (v: unknown, max = MAX_OWED) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0)
export const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))

// A saved value from an old version or a damaged store is repaired, never trusted.
export function cleanQada(raw: unknown): Qada {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Qada>
  const prayers = { ...EMPTY_QADA.prayers }
  for (const k of PRAYER_KEYS) prayers[k] = num((r.prayers as Record<string, unknown> | undefined)?.[k])
  const log: Record<string, DayLog> = {}
  for (const [d, v] of Object.entries((r.log as Record<string, DayLog>) ?? {}).slice(-400)) {
    if (isDay(d)) log[d] = { prayers: num(v?.prayers, 1000), fasts: num(v?.fasts, 100) }
  }
  return { prayers, fasts: num(r.fasts), log }
}

// "I have not prayed for N years": N × 365 days of each of the five prayers (Witr is left for you to enter if you owe it).
export function estimateOwed(years: number, months = 0, days = 0): Record<PrayerKey, number> {
  const total = num(Math.floor(years) * 365 + Math.floor(months) * 30 + Math.floor(days), 36_500)
  return { fajr: total, dhuhr: total, asr: total, maghrib: total, isha: total, witr: 0 }
}

export const totalPrayers = (q: Qada) => PRAYER_KEYS.reduce((s, k) => s + q.prayers[k], 0)

// One make-up done today. Returns the same tracker when nothing is owed (so a stray tap cannot go below zero).
export function makeUpPrayer(q: Qada, key: PrayerKey, day: string, n = 1): Qada {
  const take = Math.min(n, q.prayers[key])
  if (take <= 0 || !isDay(day)) return q
  const d = q.log[day] ?? { prayers: 0, fasts: 0 }
  return { ...q, prayers: { ...q.prayers, [key]: q.prayers[key] - take }, log: { ...q.log, [day]: { ...d, prayers: d.prayers + take } } }
}
export function makeUpFast(q: Qada, day: string, n = 1): Qada {
  const take = Math.min(n, q.fasts)
  if (take <= 0 || !isDay(day)) return q
  const d = q.log[day] ?? { prayers: 0, fasts: 0 }
  return { ...q, fasts: q.fasts - take, log: { ...q.log, [day]: { ...d, fasts: d.fasts + take } } }
}
// Undo the last tap (a mistake): puts one back and takes it off today's log.
export function undoPrayer(q: Qada, key: PrayerKey, day: string): Qada {
  const d = q.log[day]
  if (!d || d.prayers <= 0) return q
  return { ...q, prayers: { ...q.prayers, [key]: Math.min(MAX_OWED, q.prayers[key] + 1) }, log: { ...q.log, [day]: { ...d, prayers: d.prayers - 1 } } }
}
export function undoFast(q: Qada, day: string): Qada {
  const d = q.log[day]
  if (!d || d.fasts <= 0) return q
  return { ...q, fasts: Math.min(MAX_OWED, q.fasts + 1), log: { ...q.log, [day]: { ...d, fasts: d.fasts - 1 } } }
}

const dayNo = (s: string) => Math.floor(Date.parse(s + 'T00:00:00Z') / 86_400_000)
const key = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

// Days in a row, up to today (or yesterday if today has no make-up yet), on which at least one prayer or fast was made up.
export function streak(q: Qada, today: string): number {
  const active = (d: string) => (q.log[d]?.prayers ?? 0) + (q.log[d]?.fasts ?? 0) > 0
  let n = dayNo(today)
  if (!active(key(n))) n -= 1
  let c = 0
  while (active(key(n))) {
    c++
    n -= 1
  }
  return c
}

// Made up over the last 7 days, and the average per active day: used to estimate how long is left.
export function lastWeek(q: Qada, today: string): { prayers: number; fasts: number } {
  const t = dayNo(today)
  let prayers = 0
  let fasts = 0
  for (let i = 0; i < 7; i++) {
    const d = q.log[key(t - i)]
    if (d) {
      prayers += d.prayers
      fasts += d.fasts
    }
  }
  return { prayers, fasts }
}

// Days left at the current pace (null when there is no pace yet or nothing is owed).
export function daysLeft(remaining: number, madeUpLast7: number): number | null {
  if (remaining <= 0 || madeUpLast7 <= 0) return null
  return Math.ceil(remaining / (madeUpLast7 / 7))
}
