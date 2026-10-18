// Tests the follow-along recitation checker against real verses.  Run: npm run test:recite
import { readFileSync } from 'node:fs'
import { align, similarity, summarize } from '../src/lib/recite-align.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const arabic: [string, string, string][] = JSON.parse(readFileSync(new URL('../data/quran/arabic.json', import.meta.url), 'utf8'))
const verse = (key: string) => arabic.find((r) => r[0] === key)!
const expected = (...keys: string[]) => keys.map((k) => verse(k)[1]).join(' ') // Uthmani, as displayed
const plain = (...keys: string[]) => keys.map((k) => verse(k)[2]).join(' ') // same words, standard spelling
const spoken = (...keys: string[]) => keys.map((k) => verse(k)[2]).join(' ') // plain letters, as speech-to-text writes them
const status = (a: ReturnType<typeof align>) => a.status.map((s) => ({ correct: '✓', mistake: '✗', skipped: '·', pending: '…' })[s]).join('')

// ── similarity ──
ok('similarity: identical = 1, empty = 0', similarity('الله', 'الله') === 1 && similarity('', 'الله') === 0)
ok('similarity: one letter off is high but not 1', similarity('الرحمن', 'الرحمان') > 0.8 && similarity('الرحمن', 'الرحمان') < 1)

// ── a perfect recitation ──
const fatiha = expected('1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7')
let a = align(fatiha, spoken('1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7'), plain('1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7'))
ok('perfect Al-Fatihah: every word correct, complete, 100%', a.correct === a.words.length && a.complete && a.accuracy === 1 && a.mistakes === 0 && a.skipped === 0, status(a))
ok('perfect: headline celebrates', /Perfect/.test(summarize(a).headline))

// ── partial recitation: the rest stays pending, not "skipped" ──
const ikhlas1 = expected('112:1')
a = align(ikhlas1, 'قل هو الله')
ok('partial: first words correct, rest pending (live follow-along)', status(a) === '✓✓✓…', status(a))
ok('partial: cursor sits at the next word to say', a.cursor === 3 && !a.complete)
ok('partial: nothing is marked skipped just because it is not reached yet', a.skipped === 0)

// ── skipped word ──
const words112_1 = verse('112:1')[2].split(' ') // قل هو الله احد
a = align(ikhlas1, [words112_1[0], words112_1[2], words112_1[3]].join(' '))
ok('skipped word in the middle is detected', status(a) === '✓·✓✓', status(a))
ok('skipped: summary names the word', summarize(a).detail.some((d) => /skipped/.test(d)))

// ── wrong word ──
a = align(ikhlas1, 'قل هم الله احد')
ok('wrong word marked as a mistake, with what was heard', status(a) === '✓✗✓✓' && a.heard[1] === 'هم', status(a))
ok('mistake: accuracy reflects it', Math.abs(a.accuracy - 0.75) < 0.01, String(a.accuracy))

// ── noise the recogniser adds ──
a = align(ikhlas1, 'قل هو اه الله احد')
ok('an extra filler word is ignored and recorded as extra', status(a) === '✓✓✓✓' && a.extra.includes('اه'), status(a) + ' extra=' + a.extra.join())

// ── speech-to-text spelling drift still counts as correct ──
a = align(expected('1:3'), 'الرحمان الرحيم')
ok('near-spelling (الرحمان for الرحمن) accepted', status(a) === '✓✓', status(a))
a = align(expected('1:1'), 'بسمالله الرحمن الرحيم')
ok('two words heard as one ("بسمالله") accepted', a.status.every((s) => s === 'correct'), status(a))
a = align(expected('1:3'), 'ال رحمن ال رحيم')
ok('one word heard as two ("ال رحمن") accepted', a.status.every((s) => s === 'correct'), status(a))
ok('short words need to be exact (من ≠ مع)', align('مِن', 'مع').status[0] === 'mistake')

// ── the spelling-convention gap, tested both ways ──
a = align(fatiha, spoken('1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7'))
ok('even WITHOUT the plain-spelling text, a dagger alef is understood (مَـٰلِكِ ≈ مالك)', a.correct >= a.words.length - 1 && a.accuracy > 0.95, status(a))
ok('uthmani vs plain spelling really differ for some words (so the fix matters)', verse('1:4')[1].normalize('NFC') !== verse('1:4')[2])
a = align(fatiha, spoken('1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7'), plain('1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7'))
ok('with the plain-spelling text: all 29 words exact', a.correct === 29, status(a))
a = align('مِن', 'مع')
ok('a wrong LAST word is flagged immediately (not hidden as noise)', a.status[0] === 'mistake')

// ── edge cases ──
a = align(ikhlas1, '')
ok('nothing heard yet: all pending, no crash', a.status.every((s) => s === 'pending') && a.accuracy === 0 && summarize(a).headline === 'Nothing heard yet')
a = align('', 'قل هو الله')
ok('no expected text: no crash', a.words.length === 0 && !a.complete)
a = align(ikhlas1, 'hello this is english')
ok('non-Arabic speech: nothing matches, no crash', a.correct === 0)
a = align(ikhlas1, 'xyz '.repeat(200))
ok('very long garbage input finishes (no blow-up)', a.correct === 0)

// ── live updates: the same text re-aligned as the transcript grows and is revised ──
const t0 = align(ikhlas1, 'قل هو')
const t1 = align(ikhlas1, 'قل هو الله')
const t2 = align(ikhlas1, 'قل هو الله احد')
ok('live: progress only moves forward as the transcript grows', t0.cursor === 2 && t1.cursor === 3 && t2.cursor === 4 && t2.complete)
const wrongThenFixed = [align(ikhlas1, 'قل هم'), align(ikhlas1, 'قل هو')]
ok('live: when the recogniser revises a word, the mark self-corrects', wrongThenFixed[0].status[1] === 'mistake' && wrongThenFixed[1].status[1] === 'correct')

// ── a long verse (Ayat al-Kursi): correctness and speed ──
const kursi = expected('2:255')
const kursiWords = verse('2:255')[2].split(' ')
const t = performance.now()
a = align(kursi, kursiWords.join(' '), verse('2:255')[2])
const ms = performance.now() - t
ok(`Ayat al-Kursi (${a.words.length} words): perfect read`, a.correct === a.words.length && a.complete, status(a).slice(0, 30))
ok(`alignment is fast enough for live use (${ms.toFixed(1)} ms)`, ms < 100)
const damaged = [...kursiWords]
damaged.splice(10, 2) // drop two words
damaged[20] = 'كتاب' // replace one with a different Arabic word
a = align(kursi, damaged.join(' '), verse('2:255')[2])
ok('Ayat al-Kursi with 2 skipped + 1 wrong word: exactly those flagged', a.skipped === 2 && a.mistakes === 1 && a.correct === a.words.length - 3, `skipped ${a.skipped}, mistakes ${a.mistakes}`)

// ── continuous recitation across verses ──
a = align(expected('112:1', '112:2', '112:3', '112:4'), spoken('112:1', '112:2', '112:3', '112:4'), plain('112:1', '112:2', '112:3', '112:4'))
ok('four verses in a row, all correct', a.complete && a.accuracy === 1, status(a))
a = align(expected('112:1', '112:2', '112:3', '112:4'), spoken('112:1', '112:2'), plain('112:1', '112:2', '112:3', '112:4'))
ok('recited the first two of four verses: rest pending', a.cursor === verse('112:1')[2].split(' ').length + verse('112:2')[2].split(' ').length && a.skipped === 0)

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
