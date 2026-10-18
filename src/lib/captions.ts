// TikTok-style karaoke captions: which word should be highlighted at a given point of the recitation?
//
// We have no per-word timestamps for verse recitations, so the position is estimated by spreading the audio's duration over
// the words in proportion to their length (longer words take longer to say). This is an approximation, not a transcript.

import { normalizeArabic } from './arabic'

// Weight of a word: its letters (diacritics ignored) plus a small constant for the gap between words.
export const wordWeight = (w: string) => Math.max(1, normalizeArabic(w).replace(/\s/g, '').length) + 1.5

// progress: 0–1 through the audio. Returns the index of the word being said, or -1 before the recitation starts.
export function wordIndexAt(progress: number, words: string[]): number {
  if (!words.length || !Number.isFinite(progress) || progress <= 0) return -1
  if (progress >= 1) return words.length - 1
  const weights = words.map(wordWeight)
  const total = weights.reduce((a, b) => a + b, 0)
  let acc = 0
  for (let i = 0; i < words.length; i++) {
    acc += weights[i]
    if (progress * total < acc) return i
  }
  return words.length - 1
}
