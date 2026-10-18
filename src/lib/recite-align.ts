// Follow-along recitation checker (Tarteel-style).
//
// Given the verse(s) you are meant to recite and the running transcript from speech recognition, work out — word by word —
// which words were recited correctly, which were wrong, which were skipped, and where you are now.
//
// The transcript is re-aligned from scratch on every update, so when the recogniser revises an earlier word the result
// self-corrects. Alignment is a monotone edit-distance (like diff) over words, with:
//   • fuzzy word equality (speech-to-text mangles Quranic Arabic, so near-matches count as correct),
//   • tolerance for words the recogniser splits or joins ("بسم الله" vs "بسمالله").

import { arabicWords, normalizeArabic } from './arabic'

export type WordStatus = 'correct' | 'mistake' | 'skipped' | 'pending'

export type Alignment = {
  words: string[] // expected words (as displayed)
  status: WordStatus[]
  heard: (string | null)[] // what was heard for each expected word (for "you said…")
  cursor: number // index of the next word to recite
  extra: string[] // heard words that matched nothing (ignored)
  correct: number
  mistakes: number
  skipped: number
  accuracy: number // correct / words attempted so far (0–1)
  complete: boolean // reached the end of the expected text
}

// Levenshtein-based similarity between two normalised words, 0–1.
export function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const m = a.length
  const n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

// How close two words must be to count as the same word. Short words must match exactly-ish.
const matchThreshold = (a: string, b: string) => (Math.min(a.length, b.length) <= 3 ? 0.99 : 0.72)
const isMatch = (a: string, b: string) => similarity(a, b) >= matchThreshold(a, b)

const COST_MATCH = 0
const COST_SUBSTITUTE = 1 // wrong word
const COST_SKIP = 1 // expected word never heard
const COST_EXTRA = 1.2 // heard word that isn't in the text (dearer than a wrong word, so a wrong word is flagged at once)

type Cell = { cost: number; op: 'match' | 'sub' | 'skip' | 'extra' | 'merge-h' | 'merge-e' | 'start'; pi: number; pj: number }

// `matchText` is the same text in standard spelling (the dataset's "simple" text). Speech-to-text writes standard spelling
// (مالك), while the displayed Uthmani script uses a dagger alef (مَـٰلِكِ) — matching against the simple text avoids false mistakes.
// The Uthmani script writes pause marks (ۖ ۗ ۚ …) as separate tokens. They are not words: attach them to the word before them
// so that word counts line up with the plain text, and the mark is still shown next to its word.
export function displayWords(text: string): string[] {
  const out: string[] = []
  for (const tok of text.split(/\s+/).filter(Boolean)) {
    if (normalizeArabic(tok).length === 0 && out.length) out[out.length - 1] += ' ' + tok
    else out.push(tok)
  }
  return out
}

export function align(expectedText: string, transcript: string, matchText?: string): Alignment {
  const shown = displayWords(expectedText)
  const simple = matchText ? displayWords(matchText) : null
  const useSimple = !!simple && simple.length === shown.length
  const exp = shown.map((w, i) =>
    normalizeArabic(useSimple ? simple![i] : w.replace(/\u0670/g, 'ا')).replace(/\s+/g, '')
  ) // normalised, one entry per displayed word
  const heard = arabicWords(transcript)
  const n = exp.length
  const m = heard.length

  const empty: Alignment = {
    words: shown,
    status: new Array(n).fill('pending'),
    heard: new Array(n).fill(null),
    cursor: 0,
    extra: [],
    correct: 0,
    mistakes: 0,
    skipped: 0,
    accuracy: 0,
    complete: false,
  }
  if (!n || !m) return empty

  // D[i][j] = best cost aligning expected[0..i) with heard[0..j)
  const D: Cell[][] = Array.from({ length: n + 1 }, () => new Array<Cell>(m + 1))
  D[0][0] = { cost: 0, op: 'start', pi: 0, pj: 0 }
  for (let i = 1; i <= n; i++) D[i][0] = { cost: i * COST_SKIP, op: 'skip', pi: i - 1, pj: 0 }
  for (let j = 1; j <= m; j++) D[0][j] = { cost: j * COST_EXTRA, op: 'extra', pi: 0, pj: j - 1 }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = isMatch(exp[i - 1], heard[j - 1])
      let best: Cell = { cost: D[i - 1][j - 1].cost + (same ? COST_MATCH : COST_SUBSTITUTE), op: same ? 'match' : 'sub', pi: i - 1, pj: j - 1 }
      const skip = D[i - 1][j].cost + COST_SKIP
      if (skip < best.cost) best = { cost: skip, op: 'skip', pi: i - 1, pj: j }
      const extra = D[i][j - 1].cost + COST_EXTRA
      if (extra < best.cost) best = { cost: extra, op: 'extra', pi: i, pj: j - 1 }
      // one expected word was heard as two words ("بسم" + "الله" ≈ "بسمالله")
      if (j >= 2 && isMatch(exp[i - 1], heard[j - 2] + heard[j - 1])) {
        const c = D[i - 1][j - 2].cost
        if (c < best.cost) best = { cost: c, op: 'merge-h', pi: i - 1, pj: j - 2 }
      }
      // two expected words were heard as one
      if (i >= 2 && isMatch(exp[i - 2] + exp[i - 1], heard[j - 1])) {
        const c = D[i - 2][j - 1].cost
        if (c < best.cost) best = { cost: c, op: 'merge-e', pi: i - 2, pj: j - 1 }
      }
      D[i][j] = best
    }
  }

  // The recitation may stop part-way: choose how much of the expected text has been attempted.
  // Penalise leaving heard words unexplained but don't punish words not yet reached.
  let endI = 0
  let endCost = Infinity
  for (let i = 0; i <= n; i++) {
    const c = D[i][m].cost - i * 0.001 // tie-break toward consuming more of the text
    if (c < endCost) {
      endCost = c
      endI = i
    }
  }

  const status: WordStatus[] = new Array(n).fill('pending')
  const heardFor: (string | null)[] = new Array(n).fill(null)
  const extra: string[] = []
  let i = endI
  let j = m
  while (i > 0 || j > 0) {
    const cell = D[i][j]
    if (cell.op === 'match') {
      status[i - 1] = 'correct'
      heardFor[i - 1] = heard[j - 1]
    } else if (cell.op === 'sub') {
      status[i - 1] = 'mistake'
      heardFor[i - 1] = heard[j - 1]
    } else if (cell.op === 'skip') {
      status[i - 1] = 'skipped'
    } else if (cell.op === 'extra') {
      extra.unshift(heard[j - 1])
    } else if (cell.op === 'merge-h') {
      status[i - 1] = 'correct'
      heardFor[i - 1] = heard[j - 2] + ' ' + heard[j - 1]
    } else if (cell.op === 'merge-e') {
      status[i - 1] = 'correct'
      status[i - 2] = 'correct'
      heardFor[i - 1] = heardFor[i - 2] = heard[j - 1]
    }
    i = cell.pi
    j = cell.pj
  }

  // A trailing run of "skipped" words just means the speaker hasn't reached them — keep them pending, not skipped.
  let cursor = endI
  while (cursor > 0 && status[cursor - 1] === 'skipped') {
    status[cursor - 1] = 'pending'
    cursor--
  }

  const correct = status.filter((s) => s === 'correct').length
  const mistakes = status.filter((s) => s === 'mistake').length
  const skipped = status.filter((s) => s === 'skipped').length
  const attempted = correct + mistakes + skipped
  return {
    words: shown,
    status,
    heard: heardFor,
    cursor,
    extra,
    correct,
    mistakes,
    skipped,
    accuracy: attempted ? correct / attempted : 0,
    complete: cursor >= n && n > 0,
  }
}

// Plain-language feedback for a finished (or paused) recitation.
export function summarize(a: Alignment): { headline: string; detail: string[] } {
  const detail: string[] = []
  a.status.forEach((s, i) => {
    if (s === 'mistake') detail.push(`Word ${i + 1} “${a.words[i]}” — heard “${a.heard[i] ?? '?'}”`)
    else if (s === 'skipped') detail.push(`Word ${i + 1} “${a.words[i]}” — skipped`)
  })
  const pct = Math.round(a.accuracy * 100)
  const headline =
    a.correct + a.mistakes + a.skipped === 0
      ? 'Nothing heard yet'
      : a.mistakes + a.skipped === 0
        ? a.complete
          ? 'Perfect — every word matched. MashaAllah!'
          : `So far so good — ${a.correct} word${a.correct === 1 ? '' : 's'} correct`
        : `${pct}% of the words matched — review the ${a.mistakes + a.skipped} marked below`
  return { headline, detail }
}
