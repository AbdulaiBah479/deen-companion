// Quran reading goals: a "khatam" (completion) plan and daily reading log. Pure functions, easy to test.
//
// The reading log maps a date to the Mushaf pages (1–604) read that day. A plan says "finish within N days from a start date".

export const TOTAL_PAGES = 604

export type KhatamPlan = { start: string; days: number }
export type ReadLog = Record<string, number[]> // YYYY-MM-DD -> page numbers read that day

const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
export const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const shiftKey = (key: string, days: number) => {
  const d = parse(key)
  d.setDate(d.getDate() + days)
  return keyOf(d)
}
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)

export const pagesPerDay = (days: number) => Math.ceil(TOTAL_PAGES / Math.max(1, days))

// Common plans, e.g. "finish in Ramadan" = 30 days -> 21 pages a day.
export const PRESETS = [
  { label: '30 days (Ramadan pace)', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
]

export function addPages(log: ReadLog, dateKey: string, pages: number[]): ReadLog {
  const valid = pages.filter((p) => Number.isInteger(p) && p >= 1 && p <= TOTAL_PAGES)
  if (!valid.length) return log
  const merged = [...new Set([...(log[dateKey] ?? []), ...valid])].sort((a, b) => a - b)
  return { ...log, [dateKey]: merged }
}

// "5-8, 12" -> [5,6,7,8,12]. Invalid or reversed ranges are ignored; capped to the Quran's length.
export function parsePageSpec(spec: string): number[] {
  const out: number[] = []
  for (const part of spec.split(',')) {
    const m = /^\s*(\d{1,3})\s*(?:[-–]\s*(\d{1,3}))?\s*$/.exec(part)
    if (!m) continue
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (b < a) continue
    for (let p = a; p <= Math.min(b, TOTAL_PAGES); p++) if (p >= 1) out.push(p)
  }
  return [...new Set(out)]
}

// Unique pages read on or after the plan's start date.
export function pagesReadSince(log: ReadLog, start: string): Set<number> {
  const s = new Set<number>()
  for (const [date, pages] of Object.entries(log)) if (date >= start) for (const p of pages) s.add(p)
  return s
}

export type PlanStatus = {
  dayNumber: number // 1-based day of the plan (clamped to the plan length; 0 = not started yet)
  perDay: number
  read: number // unique pages read since start
  expected: number // where you should be by the end of today
  ahead: number // read - expected (negative = behind)
  todayRead: number
  todayLeft: number // pages still needed today to stay on schedule
  daysLeft: number
  finishDate: string | null // estimate at your actual average pace
  onTrack: boolean
  complete: boolean
}

export function planStatus(plan: KhatamPlan, log: ReadLog, today: string): PlanStatus {
  const perDay = pagesPerDay(plan.days)
  const elapsed = daysBetween(plan.start, today) + 1 // 1 on the start day
  const dayNumber = Math.max(0, Math.min(elapsed, plan.days))
  const read = pagesReadSince(log, plan.start).size
  const expected = Math.min(TOTAL_PAGES, dayNumber * perDay)
  const todayRead = (log[today] ?? []).length
  const complete = read >= TOTAL_PAGES
  const daysLeft = Math.max(0, plan.days - dayNumber)

  // Estimate completion from the real pace so far.
  let finishDate: string | null = null
  if (!complete && elapsed > 0 && read > 0) {
    const pace = read / Math.max(1, elapsed) // pages per day so far
    finishDate = shiftKey(today, Math.ceil((TOTAL_PAGES - read) / pace))
  } else if (complete) finishDate = today

  return {
    dayNumber,
    perDay,
    read,
    expected,
    ahead: read - expected,
    todayRead,
    todayLeft: complete ? 0 : Math.max(0, Math.min(perDay - todayRead, TOTAL_PAGES - read)),
    daysLeft,
    finishDate,
    onTrack: read >= expected,
    complete,
  }
}

// Consecutive days (ending today, or yesterday if you haven't read yet today) with at least `goal` pages read.
export function readingStreak(log: ReadLog, today: string, goal = 1): number {
  let day = (log[today]?.length ?? 0) >= goal ? today : shiftKey(today, -1)
  let n = 0
  while ((log[day]?.length ?? 0) >= goal) {
    n++
    day = shiftKey(day, -1)
  }
  return n
}

// The juz (1–30) a page belongs to — the Madani mushaf has 20 pages per juz, with juz 1 starting on page 1 and juz 30 on page 582.
export function juzOfPage(page: number): number {
  if (page >= 582) return 30
  if (page <= 1) return 1
  return Math.min(30, Math.floor((page - 2) / 20) + 1)
}
