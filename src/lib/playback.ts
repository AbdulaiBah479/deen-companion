// The rules of recitation practice, kept separate from the audio element so they can be tested:
//   • repeat each verse N times (or until you stop it),
//   • a pause after each verse — a short one, or "your turn" as long as the verse itself so you can repeat after the reciter,
//   • play only a range of verses (e.g. the three Quls), and loop that range a number of times.

export type Pause = 'none' | 'short' | 'echo'
export type Range = { surah: number; from: number; to: number; loops: number } // loops: 0 = until stopped
export type Plan = { repeatEach: number; pause: Pause; continuous: boolean; range: Range | null } // repeatEach: 0 = until stopped
export type Pos = { surah: number; ayah: number; plays: number; loopsDone: number } // plays: times this verse has now been heard
export type Step = { kind: 'replay' } | { kind: 'next'; surah: number; ayah: number } | { kind: 'restart'; surah: number; ayah: number } | { kind: 'stop' }

export const REPEAT_CHOICES = [1, 2, 3, 5, 10, 0] as const // 0 shown as ∞
export const PAUSE_CHOICES: { id: Pause; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'short', label: '2 seconds' },
  { id: 'echo', label: 'Your turn' },
]

// What to do when a verse has just finished playing. `versesIn` = how many verses the current surah has.
export function afterVerse(plan: Plan, pos: Pos, versesIn: number): Step {
  if (plan.repeatEach === 0 || pos.plays < plan.repeatEach) return { kind: 'replay' }
  const r = plan.range
  if (r) {
    if (pos.ayah < r.to) return { kind: 'next', surah: pos.surah, ayah: pos.ayah + 1 }
    const done = pos.loopsDone + 1
    if (r.loops === 0 || done < r.loops) return { kind: 'restart', surah: r.surah, ayah: r.from }
    return { kind: 'stop' }
  }
  if (pos.ayah < versesIn) return { kind: 'next', surah: pos.surah, ayah: pos.ayah + 1 }
  if (plan.continuous && pos.surah < 114) return { kind: 'next', surah: pos.surah + 1, ayah: 1 }
  return { kind: 'stop' }
}

// How long to wait before the next play. "Your turn" waits about as long as the verse took, so you can say it too.
export function gapMs(pause: Pause, verseSeconds: number): number {
  if (pause === 'none') return 0
  if (pause === 'short') return 2000
  const s = Number.isFinite(verseSeconds) && verseSeconds > 0 ? verseSeconds : 4
  return Math.round(Math.min(20, Math.max(1.5, s * 1.1)) * 1000)
}

export const repeatLabel = (n: number) => (n === 0 ? '∞' : `${n}×`)
export const rangeLabel = (r: Range) => `${r.surah}:${r.from}${r.to > r.from ? '–' + r.to : ''}${r.loops === 1 ? '' : r.loops === 0 ? ' ∞' : ` ×${r.loops}`}`
