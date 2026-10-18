// Learning progress: XP, levels, daily streaks. Pure functions so the rules are easy to test.

export type LearnState = {
  xp: number
  streak: number // consecutive days with at least one completed lesson
  best: number // longest streak
  lastDay: string // YYYY-MM-DD of the last completed lesson
  done: Record<string, number> // lessonId -> best score (percent)
}

export const EMPTY_LEARN: LearnState = { xp: 0, streak: 0, best: 0, lastDay: '', done: {} }
export const PASS_PERCENT = 70
export const XP_PER_LEVEL = 100

export function levelOf(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  return { level, into: xp % XP_PER_LEVEL, needed: XP_PER_LEVEL }
}

export function dayBefore(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d - 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function nextStreak(prev: Pick<LearnState, 'streak' | 'lastDay'>, today: string): number {
  if (prev.lastDay === today) return Math.max(1, prev.streak)
  if (prev.lastDay === dayBefore(today)) return prev.streak + 1
  return 1
}

// The streak as it should be *displayed* today (a streak is broken if you missed yesterday).
export function liveStreak(s: Pick<LearnState, 'streak' | 'lastDay'>, today: string): number {
  if (!s.lastDay) return 0
  return s.lastDay === today || s.lastDay === dayBefore(today) ? s.streak : 0
}

export type Completion = { state: LearnState; gained: number; passed: boolean; improved: boolean; firstPass: boolean }

// Record a finished lesson. XP: first pass = 10 + score/10; beating your best = +3; anything else = 0 (no farming).
export function completeLesson(prev: LearnState, lessonId: string, scorePct: number, today: string): Completion {
  const score = Math.max(0, Math.min(100, Math.round(scorePct)))
  const passed = score >= PASS_PERCENT
  const before = prev.done[lessonId]
  const firstPass = passed && (before === undefined || before < PASS_PERCENT)
  const improved = before !== undefined && score > before
  let gained = 0
  if (firstPass) gained = 10 + Math.round(score / 10)
  else if (passed && improved) gained = 3

  const done = { ...prev.done, [lessonId]: Math.max(before ?? 0, score) }
  // Any finished attempt that passes keeps the streak alive.
  const streak = passed ? nextStreak(prev, today) : prev.streak
  const lastDay = passed ? today : prev.lastDay
  return {
    state: { xp: prev.xp + gained, streak, best: Math.max(prev.best, streak), lastDay, done },
    gained,
    passed,
    improved,
    firstPass,
  }
}

export const isDone = (s: LearnState, lessonId: string) => (s.done[lessonId] ?? 0) >= PASS_PERCENT
export const pathProgress = (s: LearnState, lessonIds: string[]) => lessonIds.filter((id) => isDone(s, id)).length
