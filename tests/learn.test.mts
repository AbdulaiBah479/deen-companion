// Tests the Learn section: progress rules AND that every Quran/hadith reference in the lessons is real.
// Run: npm run test:learn
import { readFileSync } from 'node:fs'
import { BASICS_LESSONS, LETTERS, TAJWEED_LESSONS, buildLetterLessons, buildWordLessons, letterForms, type Lesson } from '../src/lib/learn-content.ts'
import { EMPTY_LEARN, PASS_PERCENT, completeLesson, dayBefore, levelOf, liveStreak, nextStreak } from '../src/lib/learn.ts'
import { normalizeArabic } from '../src/lib/arabic.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const read = (p: string) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'))
const arabic: [string, string, string][] = read('quran/arabic.json')
const english: string[] = read('quran/tr-en.json')
const bukhari: [number, string][] = read('hadith/bukhari.json')
const words = read('learn/words.json') as { total: number; rows: { ar: string; tr: string; en: string; n: number; audio?: string; ex: string }[] }

// ── progress rules ──
ok('dayBefore handles month/year boundaries', dayBefore('2026-03-01') === '2026-02-28' && dayBefore('2026-01-01') === '2025-12-31' && dayBefore('2024-03-01') === '2024-02-29')
ok('levels: 0 xp = level 1, 100 = level 2, 250 = level 3 (50/100)', levelOf(0).level === 1 && levelOf(100).level === 2 && levelOf(250).level === 3 && levelOf(250).into === 50)
ok('streak continues on consecutive days, restarts after a gap', nextStreak({ streak: 4, lastDay: '2026-10-15' }, '2026-10-16') === 5 && nextStreak({ streak: 4, lastDay: '2026-10-13' }, '2026-10-16') === 1)
ok('second lesson the same day does not inflate the streak', nextStreak({ streak: 4, lastDay: '2026-10-16' }, '2026-10-16') === 4)
ok('displayed streak resets if yesterday was missed', liveStreak({ streak: 7, lastDay: '2026-10-10' }, '2026-10-16') === 0 && liveStreak({ streak: 7, lastDay: '2026-10-15' }, '2026-10-16') === 7 && liveStreak({ streak: 0, lastDay: '' }, '2026-10-16') === 0)

const c = completeLesson(EMPTY_LEARN, 'a', 100, '2026-10-16')
ok('first pass at 100% = 20 xp, streak 1', c.gained === 20 && c.state.xp === 20 && c.state.streak === 1 && c.firstPass)
ok('failing (<70%) gives no xp and no streak', (() => { const f = completeLesson(EMPTY_LEARN, 'a', PASS_PERCENT - 1, '2026-10-16'); return f.gained === 0 && f.state.streak === 0 && !f.passed })())
const again = completeLesson(c.state, 'a', 100, '2026-10-16')
ok('replaying with the same score earns nothing (no farming)', again.gained === 0 && again.state.xp === 20)
const low = completeLesson(EMPTY_LEARN, 'b', 70, '2026-10-16')
const better = completeLesson(low.state, 'b', 100, '2026-10-16')
ok('improving a passing score earns +3', low.gained === 17 && better.gained === 3 && better.state.done.b === 100)
const failThenPass = completeLesson(completeLesson(EMPTY_LEARN, 'c', 40, '2026-10-16').state, 'c', 80, '2026-10-16')
ok('passing after an earlier fail counts as a first pass', failThenPass.firstPass && failThenPass.gained === 18)
ok('best score is never lowered', completeLesson(c.state, 'a', 10, '2026-10-17').state.done.a === 100)
const d2 = completeLesson(c.state, 'z', 90, '2026-10-17')
ok('a lesson on the next day extends the streak and best', d2.state.streak === 2 && d2.state.best === 2)

// ── content integrity: letters ──
ok('28 letters', LETTERS.length === 28)
ok('letter names are unique (so quiz options are unambiguous)', new Set(LETTERS.map((l) => l.name)).size === 28 && new Set(LETTERS.map((l) => l.ch)).size === 28)
ok('non-joining letters are exactly ا د ذ ر ز و', LETTERS.filter((l) => !l.joins).map((l) => l.ch).join('') === 'ادذرزو')
const baa = letterForms(LETTERS[1])
ok('letter forms use joiners (baa)', baa.initial.endsWith('‍') && baa.medial.startsWith('‍') && baa.medial.endsWith('‍') && baa.final.startsWith('‍'))
const letterLessons = buildLetterLessons()
ok('7 letter lessons covering all 28 letters', letterLessons.length === 7 && letterLessons.every((l) => l.slides.length === 4))

// ── content integrity: every quiz is well-formed ──
const wordLessons = buildWordLessons(words.rows, words.total)
const all: Lesson[] = [...letterLessons, ...wordLessons, ...TAJWEED_LESSONS, ...BASICS_LESSONS]
const badQ: string[] = []
for (const l of all) {
  if (!l.quiz.length || !l.slides.length) badQ.push(`${l.id}: empty`)
  for (const q of l.quiz) {
    if (!q.options.includes(q.answer)) badQ.push(`${l.id}: answer not in options — ${q.prompt}`)
    if (new Set(q.options).size !== q.options.length) badQ.push(`${l.id}: duplicate options — ${q.prompt}`)
    if (q.options.length < 2) badQ.push(`${l.id}: too few options`)
  }
}
ok(`all ${all.length} lessons have non-empty, well-formed quizzes`, badQ.length === 0, badQ.slice(0, 3).join(' | '))
ok('lesson ids are unique', new Set(all.map((l) => l.id)).size === all.length)
ok('quiz option order is reproducible (deterministic)', JSON.stringify(buildLetterLessons()[0].quiz) === JSON.stringify(letterLessons[0].quiz))
ok('word lessons: 10 per lesson, 40 lessons', wordLessons.length >= 38 && wordLessons[0].slides.length === 10)
ok('word quiz: meaning options never repeat the same meaning', wordLessons.every((l) => l.quiz.every((q) => new Set(q.options).size === 4)))

// ── content integrity: every Quran example points at a real verse containing that text ──
const byKey = new Map(arabic.map((r) => [r[0], normalizeArabic(r[1])]))
const examples = [...TAJWEED_LESSONS, ...BASICS_LESSONS].flatMap((l) => l.slides.filter((s) => s.example).map((s) => ({ lesson: l.id, ...s.example! })))
const badEx: string[] = []
for (const e of examples) {
  const verse = byKey.get(e.ref)
  const needle = normalizeArabic(e.ar)
  if (!verse) badEx.push(`${e.lesson}: no such verse ${e.ref}`)
  else if (!verse.includes(needle)) badEx.push(`${e.lesson}: "${e.ar}" is not in ${e.ref}`)
}
ok(`all ${examples.length} Quran examples really occur at their stated verse`, badEx.length === 0, badEx.join(' | '))

// ── content integrity: factual claims tied to references ──
const text = (ref: string) => english[arabic.findIndex((r) => r[0] === ref)] ?? ''
ok('2:285 mentions Allah, angels, books, messengers', /angels/.test(text('2:285')) && /books/.test(text('2:285')) && /messengers/i.test(text('2:285')))
ok('54:49 is about predestination/decree', /predestination|measure|decree/i.test(text('54:49')), text('54:49').slice(0, 70))
ok('4:103 is about prayer at fixed times', /prayer/i.test(text('4:103')) && /time/i.test(text('4:103')))
ok('5:6 is the wudu verse (face, arms, feet)', /face/.test(text('5:6')) && /feet|ankles/.test(text('5:6')))
const b8 = bukhari.find((h) => h[0] === 8)?.[1] ?? ''
ok('Bukhari 8 is the "Islam is based on five" hadith', /five/i.test(b8) && /(Hajj|pilgrimage)/i.test(b8) && /(Zakat|Zakah)/i.test(b8), b8.slice(0, 80))

// ── the word course: honest numbers ──
ok('word total matches the Quran (about 77,430 words)', Math.abs(words.total - 77430) < 50, String(words.total))
ok('top 100 forms cover roughly a third of all words', (() => { const c100 = words.rows.slice(0, 100).reduce((s, r) => s + r.n, 0) / words.total; return c100 > 0.3 && c100 < 0.45 })())
ok('the lesson summary states the real cumulative coverage', /cover \d+(\.\d)?% of the Quran/.test(wordLessons[0].summary), wordLessons[0].summary.slice(-50))

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
