// Daily deeds tracker (a "Pillars"-style habit checklist). Pure functions.
//
// Some deeds are tracked automatically from other parts of the app (the five prayers, Quran reading); the rest are ticked by hand.

export type HabitId =
  | 'prayers' | 'quran' | 'morning' | 'evening' | 'duha' | 'night' | 'fast' | 'charity' | 'kindness'

export type Habit = { id: HabitId; label: string; icon: string; auto?: boolean; hint?: string }

export const HABITS: Habit[] = [
  { id: 'prayers', label: 'Five daily prayers', icon: '🕌', auto: true, hint: 'From your prayer tracker' },
  { id: 'quran', label: 'Read Quran', icon: '📖', auto: true, hint: 'From your reading log' },
  { id: 'morning', label: 'Morning adhkar', icon: '🌅' },
  { id: 'evening', label: 'Evening adhkar', icon: '🌇' },
  { id: 'duha', label: 'Duha prayer', icon: '☀️' },
  { id: 'night', label: 'Night prayer (Qiyam/Witr)', icon: '🌙' },
  { id: 'fast', label: 'Fasting', icon: '🍽️' },
  { id: 'charity', label: 'Gave charity', icon: '💚' },
  { id: 'kindness', label: 'Did a good deed', icon: '🤝' },
]

export type HabitLog = Record<string, Partial<Record<HabitId, boolean>>> // date -> manual ticks

// What the app already knows about a day, from other trackers.
export type DayContext = {
  prayersDone: number // 0–5
  pagesRead: number
}

export type Resolver = (date: string) => DayContext

export function isDone(habit: Habit, date: string, log: HabitLog, ctx: DayContext): boolean {
  if (habit.id === 'prayers') return ctx.prayersDone >= 5
  if (habit.id === 'quran') return ctx.pagesRead >= 1
  return !!log[date]?.[habit.id]
}

export function toggleHabit(log: HabitLog, date: string, id: HabitId): HabitLog {
  const day = { ...(log[date] ?? {}) }
  day[id] = !day[id]
  return { ...log, [date]: day }
}

export function dayScore(date: string, log: HabitLog, resolve: Resolver) {
  const ctx = resolve(date)
  const done = HABITS.filter((h) => isDone(h, date, log, ctx)).length
  return { done, total: HABITS.length, ratio: done / HABITS.length }
}

const shift = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days, 12)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Last `n` days ending today, oldest first.
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shift(today, i - (n - 1)))
}

// Consecutive days (ending today, or yesterday if today isn't done yet) on which this one habit was done.
export function habitStreak(habit: Habit, today: string, log: HabitLog, resolve: Resolver): number {
  const done = (d: string) => isDone(habit, d, log, resolve(d))
  let day = done(today) ? today : shift(today, -1)
  let n = 0
  while (done(day) && n < 3650) {
    n++
    day = shift(day, -1)
  }
  return n
}

export function weekSummary(today: string, log: HabitLog, resolve: Resolver) {
  const days = lastDays(today, 7).map((date) => ({ date, ...dayScore(date, log, resolve) }))
  const doneTotal = days.reduce((s, d) => s + d.done, 0)
  return { days, average: doneTotal / (7 * HABITS.length), perfectDays: days.filter((d) => d.done === d.total).length }
}
