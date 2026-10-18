// Tests that the ayah and hadith of the day really change every day.  Run: npm run test:daily  (needs ./data)
import { dataAvailable, hadithOfDay, verseOfDay } from '../src/lib/data.ts'
import { dailyIndex, dayNumber } from '../src/lib/daily.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
if (!dataAvailable()) {
  console.log('SKIP: run `npm run data` first')
  process.exit(0)
}

const dates: string[] = []
for (let i = 0; i < 366; i++) dates.push(new Date(Date.UTC(2028, 0, 1 + i)).toISOString().slice(0, 10)) // 2028 is a leap year
const hadiths = dates.map((d) => hadithOfDay(d)!)
const verses = dates.map((d) => verseOfDay(d, 'en')!)

ok('hadith: one for every day of a leap year', hadiths.every(Boolean))
ok('hadith: same date -> same hadith', hadithOfDay('2026-10-16')!.number === hadithOfDay('2026-10-16')!.number)
const hu = new Set(hadiths.map((h) => h.number))
ok('hadith: every day of the year is different', hu.size === 366, String(hu.size))
ok('hadith: never the same two days running', hadiths.every((h, i) => i === 0 || h.number !== hadiths[i - 1].number))
ok('hadith: all from Sahih al-Bukhari, readable length', hadiths.every((h) => h.bookId === 'bukhari' && h.text.length >= 90 && h.text.length <= 380))
ok('hadith: this year differs from next year on the same date', hadithOfDay('2026-10-16')!.number !== hadithOfDay('2027-10-16')!.number || hadithOfDay('2026-10-17')!.number !== hadithOfDay('2027-10-17')!.number)

const vu = new Set(verses.map((v) => v.verse_key))
ok('ayah: one for every day, with text and translation', verses.every((v) => v && v.text_simple && v.translations[0].text))
ok('ayah: every day of the year is different', vu.size === 366, String(vu.size))
ok('ayah: never the same two days running', verses.every((v, i) => i === 0 || v.verse_key !== verses[i - 1].verse_key))
ok('ayah: same date -> same verse', JSON.stringify(verseOfDay('2026-10-16', 'en')) === JSON.stringify(verseOfDay('2026-10-16', 'en')))
// the picker itself: any pool size, full cycle with no repeats
for (const n of [2, 3, 10, 365, 366, 1000, 4500, 7919, 7927 * 2, 6236]) {
  const seen = new Set<number>()
  for (let i = 0; i < n; i++) seen.add(dailyIndex(new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), n))
  ok('picker: pool of ' + n + ' is fully cycled with no repeat', seen.size === n, String(seen.size))
}
ok('picker: stays in range for every date in 2020–2060', (() => { for (let y = 2020; y <= 2060; y++) for (const md of ['-01-01', '-02-29', '-12-31']) { const i = dailyIndex(y + md, 4500); if (!(i >= 0 && i < 4500)) return false } return true })())
ok('picker: dayNumber is exact across DST and leap years', dayNumber('2028-03-01') - dayNumber('2028-02-28') === 2 && dayNumber('2026-10-25') - dayNumber('2026-10-24') === 1)
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
