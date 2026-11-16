// "Listen plan": choose a surah, the verses from–to, how many times each verse is heard, and how many times the whole part is repeated.
// The audio player (audio.tsx, rules in playback.ts) does the playing; this file keeps the choices valid and the saved plans clean.
import type { Pause } from './playback'

export type ListenPlan = {
  id: string
  surah: number
  from: number
  to: number
  each: number // times each verse is heard (0 = until stopped)
  loops: number // times the whole part is played (0 = until stopped)
  pause: Pause
}

export const EACH_CHOICES = [1, 2, 3, 5, 7, 10, 0] as const
export const LOOP_CHOICES = [1, 2, 3, 5, 10, 20, 0] as const
export const MAX_PLANS = 30
const PAUSES: Pause[] = ['none', 'short', 'echo']

const int = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.floor(n))) : dflt
}

// Keeps a plan inside the surah: 1 <= from <= to <= verses.
export function fixPlan(p: Partial<ListenPlan>, verses: number): Omit<ListenPlan, 'id'> {
  const v = Math.max(1, Math.floor(verses))
  const from = int(p.from, 1, v, 1)
  const to = int(p.to, from, v, v)
  return {
    surah: int(p.surah, 1, 114, 1),
    from,
    to,
    each: (EACH_CHOICES as readonly number[]).includes(p.each as number) ? (p.each as number) : 1,
    loops: (LOOP_CHOICES as readonly number[]).includes(p.loops as number) ? (p.loops as number) : 1,
    pause: PAUSES.includes(p.pause as Pause) ? (p.pause as Pause) : 'none',
  }
}

// How many verse recitations the plan will play in all, or null when it never ends.
export function totalPlays(p: Pick<ListenPlan, 'from' | 'to' | 'each' | 'loops'>): number | null {
  if (p.each === 0 || p.loops === 0) return null
  return (p.to - p.from + 1) * p.each * p.loops
}

// A rough running time, from an average verse length in seconds (default 9.5, the same figure the offline-audio size uses).
export function estimateMinutes(p: Pick<ListenPlan, 'from' | 'to' | 'each' | 'loops'>, secondsPerVerse = 9.5): number | null {
  const n = totalPlays(p)
  return n === null ? null : Math.max(1, Math.round((n * secondsPerVerse) / 60))
}

export const planLabel = (p: Pick<ListenPlan, 'surah' | 'from' | 'to' | 'each' | 'loops'>) =>
  `${p.surah}:${p.from}${p.to > p.from ? '–' + p.to : ''} · each verse ${p.each === 0 ? '∞' : p.each + '×'} · whole ${p.loops === 0 ? '∞' : p.loops + '×'}`

// Saved plans come back from storage (or from another device): repair them, never trust them.
export function cleanPlans(raw: unknown): ListenPlan[] {
  if (!Array.isArray(raw)) return []
  const out: ListenPlan[] = []
  for (const r of raw.slice(0, MAX_PLANS)) {
    const o = r as Partial<ListenPlan> | null
    if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !o.id) continue
    const f = fixPlan(o, 286)
    out.push({ id: o.id.slice(0, 40), ...f })
  }
  return out
}

export function addPlan(list: ListenPlan[], p: Omit<ListenPlan, 'id'>, now = Date.now()): ListenPlan[] {
  const dup = list.find((x) => x.surah === p.surah && x.from === p.from && x.to === p.to && x.each === p.each && x.loops === p.loops && x.pause === p.pause)
  if (dup) return list
  if (list.length >= MAX_PLANS) return list
  return [{ id: `${now.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`, ...p }, ...list]
}
export const removePlan = (list: ListenPlan[], id: string) => list.filter((x) => x.id !== id)

// Parts people often choose, ready to tap. Each is checked against the Quran data by tests.
export const PRESETS: { title: string; surah: number; from: number; to: number; each: number; loops: number; note: string }[] = [
  { title: 'Ayat al-Kursi', surah: 2, from: 255, to: 255, each: 1, loops: 3, note: 'Before sleep and after prayer' },
  { title: 'The last two verses of al-Baqarah', surah: 2, from: 285, to: 286, each: 1, loops: 1, note: 'The Prophet ﷺ said they suffice for the night' },
  { title: 'Al-Ikhlas ×3', surah: 112, from: 1, to: 4, each: 1, loops: 3, note: 'Equal to a third of the Quran in reward, as reported' },
  { title: 'Al-Kahf, the first ten verses', surah: 18, from: 1, to: 10, each: 1, loops: 1, note: 'Protection from the Dajjal' },
  { title: 'Al-Mulk', surah: 67, from: 1, to: 30, each: 1, loops: 1, note: 'Recited before sleep' },
  { title: 'Learn al-Fatihah', surah: 1, from: 1, to: 7, each: 5, loops: 3, note: 'Each verse five times, then the whole surah, three times' },
]
