// Sleep timer for the audio player: stop after a chosen time, easing the volume down at the end instead of cutting off.
export const SLEEP_OPTIONS = [5, 10, 15, 30, 45, 60] // minutes
export const FADE_MS = 4000

// Milliseconds in one "minute" of the timer. Always 60 000; automated tests may shrink it (window.__DEEN_SLEEP_MS) to run in seconds.
export function msPerMinute(): number {
  const v = (globalThis as { __DEEN_SLEEP_MS?: number }).__DEEN_SLEEP_MS
  return typeof v === 'number' && v > 0 ? v : 60_000
}

export const remainingMs = (endAt: number, now: number) => Math.max(0, endAt - now)

// 1 until the last FADE_MS, then ramps down to 0.
export const fadeFactor = (remaining: number) => (remaining >= FADE_MS ? 1 : Math.max(0, remaining / FADE_MS))

export function formatRemaining(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
