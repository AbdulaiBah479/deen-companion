// Arabic text normalisation for matching recited/transcribed text against the Quran.
// Removes diacritics and tatweel, unifies letter variants, and drops everything that isn't an Arabic letter.

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g

export function normalizeArabic(input: string): string {
  return input
    .replace(DIACRITICS, '')
    .replace(/ـ/g, '') // tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/[^ء-ي\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const arabicWords = (s: string) => normalizeArabic(s).split(' ').filter(Boolean)

// Word-level comparison of a recitation against the expected verse, via longest common subsequence.
// Returns which expected words were matched, for showing "you missed these words" feedback.
export function compareRecitation(expected: string, heard: string) {
  const exp = arabicWords(expected)
  const got = arabicWords(heard)
  const n = exp.length
  const m = got.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = exp[i] === got[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const matched = new Array(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (exp[i] === got[j]) {
      matched[i] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  const hits = matched.filter(Boolean).length
  return { words: exp, matched, score: n ? hits / n : 0 }
}
