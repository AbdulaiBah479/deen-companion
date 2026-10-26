// Tests the Family Circle rules.  Run: npm run test:circle
import { CODE_ALPHABET, KEEP_DAYS, addDay, cleanName, codeFrom, dateAllowed, isCode, isDateKey, isDevice, normalizeCode, streakOf, viewOf, weekCount, weekIndex, weeklyQuestion, weeklyVerse } from '../src/lib/circle.ts'
import { parseRef } from '../src/lib/khutbah.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const D = (n: number) => new Date(Date.UTC(2026, 9, 26) - n * 86400_000).toISOString().slice(0, 10) // 0 = 2026-10-26
const today = D(0)

ok('code: six readable characters, never 0/O/1/I/L', codeFrom([0, 1, 2, 3, 250, 255]).length === 6 && !/[01OIL]/.test(CODE_ALPHABET) && isCode(codeFrom(Array.from({ length: 6 }, (_, i) => i * 40))))
ok('code: typed codes are tidied (case, spaces, dashes)', normalizeCode(' ab-c d23 ') === 'ABCD23' && isCode(normalizeCode('k7m-2px')))
ok('code: wrong lengths, forbidden letters and non-strings are refused', !isCode('ABC') && !isCode('ABCDEFG') && !isCode('ABCDE0') && !isCode(null) && !isCode(123456))
ok('device: only a random-looking id of sensible length is accepted', isDevice('abcdEFGH12345678') && !isDevice('short') && !isDevice('has spaces in it 123456') && !isDevice('x'.repeat(65)) && !isDevice(undefined))

ok('name: normal names pass, tags and marks are removed', cleanName('  Aisha  ') === 'Aisha' && cleanName('<b>Omar</b>') === 'Omar')
ok('name: names in Arabic work', cleanName('عائشة') === 'عائشة')
ok('name: links, empty text, digits only and control characters are refused', cleanName('visit www.example.com') === '' && cleanName('http://x.y') === '' && cleanName('') === '' && cleanName('12345') === '' && cleanName(null) === '' && cleanName('\u0000\u0001') === '')
ok('name: long names are cut at 20 characters', cleanName('A'.repeat(50)).length === 20)

ok('date: a real date key passes, nonsense does not', isDateKey('2026-10-26') && !isDateKey('2026-13-40') && !isDateKey('yesterday') && !isDateKey(20261026))
ok('date: a check-in may be for the server’s day or one day either side, no further', dateAllowed(D(0), today) && dateAllowed(D(1), today) && dateAllowed(D(-1), today) && !dateAllowed(D(2), today) && !dateAllowed(D(-2), today) && !dateAllowed('nonsense', today))

ok('streak: no days, no streak', streakOf([], today) === 0)
ok('streak: counts consecutive days ending today', streakOf([D(0), D(1), D(2)], today) === 3)
ok('streak: today not done yet keeps yesterday’s streak alive', streakOf([D(1), D(2), D(3)], today) === 3)
ok('streak: a missed day ends it', streakOf([D(0), D(1), D(3), D(4)], today) === 2 && streakOf([D(2), D(3)], today) === 0)
ok('week: counts only the last seven days, each day once', weekCount([D(0), D(0), D(3), D(6), D(7), D(30)], today) === 3)
ok('days: adding is idempotent, sorted, and keeps only the last 60', addDay([D(1)], D(1)).length === 1 && addDay([D(2)], D(0)).join() === [D(2), D(0)].join() && addDay(Array.from({ length: 80 }, (_, i) => D(100 - i)), D(0)).length === KEEP_DAYS)

const verse = weeklyVerse(today)
ok('verse: the verse of the week is a real single verse, the same all week, and changes next week', !!parseRef(verse) && weeklyVerse(D(0)) === weeklyVerse(D(0)) && weekIndex(D(-7)) === weekIndex(today) + 1 && typeof weeklyQuestion(today) === 'string')
const seen = new Set(Array.from({ length: 40 }, (_, w) => weeklyVerse(D(-7 * w))))
ok('verse: many different verses over the weeks', seen.size >= 20, String(seen.size))

const members = { a: { name: 'Zaid', joined: '2026-10-01', days: [D(0), D(1)] }, b: { name: 'Maryam', joined: '2026-10-02', days: [D(0), D(1), D(2), D(3)] }, c: { name: 'Ali', joined: '2026-10-03', days: [] } }
const view = viewOf(members, 'a', today)
ok('view: members are ordered by streak, “me” is marked, and no ids are shown', view[0].name === 'Maryam' && view[0].streak === 4 && view.find((m) => m.me)?.name === 'Zaid' && view[2].name === 'Ali' && !JSON.stringify(view).includes('"a"'))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
