// Daily Reels streak. Pure functions.
//
// A reel counts as "watched" once it has been on screen for a few seconds (the feed decides when). A day "counts" toward the
// streak once you have watched at least DAILY_GOAL different reels. The streak is the run of consecutive counting days that ends
// today — or yesterday, if today's goal isn't met yet (so you don't lose it before the day is over).

export const DAILY_GOAL = 5

export type ReelActivity = Record<string, string[]> // YYYY-MM-DD -> ids of the reels watched that day

const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const shiftDay = (key: string, n: number) => {
  const d = parse(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

// Records that a reel was watched. Watching the same reel twice in a day counts once.
export function recordView(log: ReelActivity, date: string, id: string): ReelActivity {
  const seen = log[date] ?? []
  if (seen.includes(id)) return log
  return { ...log, [date]: [...seen, id] }
}

// Keep the log small: only the last `keep` days matter for streaks.
export function prune(log: ReelActivity, today: string, keep = 400): ReelActivity {
  const cutoff = shiftDay(today, -keep)
  const out: ReelActivity = {}
  for (const [d, ids] of Object.entries(log)) if (d >= cutoff) out[d] = ids
  return out
}

export type StreakInfo = {
  current: number
  best: number
  todayCount: number
  goal: number
  goalMet: boolean
  remaining: number
}

export function streakInfo(log: ReelActivity, today: string, goal = DAILY_GOAL): StreakInfo {
  const met = (d: string) => (log[d]?.length ?? 0) >= goal
  const todayCount = log[today]?.length ?? 0

  let day = met(today) ? today : shiftDay(today, -1)
  let current = 0
  while (met(day) && current < 5000) {
    current++
    day = shiftDay(day, -1)
  }

  // Longest run anywhere in the log.
  const days = Object.keys(log).filter(met).sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of days) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }

  return { current, best: Math.max(best, current), todayCount, goal, goalMet: met(today), remaining: Math.max(0, goal - todayCount) }
}

const MILESTONES: Record<number, string> = {
  1: 'Streak started — come back tomorrow to keep it!',
  3: '3 days in a row — MashaAllah!',
  7: 'A full week! May Allah keep you steady.',
  14: 'Two weeks of daily reminders — barakAllahu feek.',
  30: '30 days! A whole month of daily remembrance.',
  100: '100 days — may Allah accept it from you.',
}
export const milestoneMessage = (streak: number): string | null => MILESTONES[streak] ?? null
