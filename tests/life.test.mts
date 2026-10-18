// Tests the Islamic calendar, Quran reading goals (khatam) and daily habits.  Run: npm run test:life
import { HIJRI_MONTHS, addDays, dateKey, eventsOn, fromHijri, hijriRangeLabel, monthGrid, nextMajorEvent, toHijri } from '../src/lib/hijri.ts'
import { PRESETS, TOTAL_PAGES, addPages, daysBetween, juzOfPage, pagesPerDay, parsePageSpec, planStatus, readingStreak, shiftKey, type ReadLog } from '../src/lib/khatam.ts'
import { HABITS, dayScore, habitStreak, isDone, lastDays, toggleHabit, weekSummary, type HabitLog } from '../src/lib/habits.ts'
import { readFileSync } from 'node:fs'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const d = (s: string) => new Date(s + 'T12:00:00')
const h = (s: string) => { const x = toHijri(d(s)); return `${x.day}/${x.month}/${x.year}` }

// ───────── Hijri calendar ─────────
ok('matches AlAdhan: 16 Oct 2026 = 5 Jumada al-awwal 1448 (05-05-1448)', h('2026-10-16') === '5/5/1448', h('2026-10-16'))
ok('Ramadan 1447 begins 18 Feb 2026', h('2026-02-18') === '1/9/1447' && h('2026-02-17') === '29/8/1447')
ok('Eid al-Fitr 1447 = 20 Mar 2026', h('2026-03-20') === '1/10/1447')
ok('Eid al-Adha 1447 = 27 May 2026 (10 Dhu al-Hijjah)', h('2026-05-27') === '10/12/1447' && h('2026-05-26') === '9/12/1447')
ok('Islamic New Year 1448 = 16 Jun 2026', h('2026-06-16') === '1/1/1448')
ok('Ramadan 1448 begins 8 Feb 2027', h('2027-02-08') === '1/9/1448')
ok('12 month names', HIJRI_MONTHS.length === 12 && HIJRI_MONTHS[8] === 'Ramadan')

const ev = (s: string) => eventsOn(toHijri(d(s))).map((e) => e.id)
ok('events: Ramadan start, Eid al-Fitr, Arafah, Eid al-Adha land on the right days', ev('2026-02-18').includes('ramadan') && ev('2026-03-20').includes('eid-fitr') && ev('2026-05-26').includes('arafah') && ev('2026-05-27').includes('eid-adha'))
ok('events: last ten nights flagged only in Ramadan 21–30', ev('2026-03-11').includes('last-ten') && !ev('2026-03-05').includes('last-ten'), ev('2026-03-11').join())
ok('events: Ashura = 10 Muharram 1448 (25 Jun 2026)', ev('2026-06-25').includes('ashura'), h('2026-06-25'))
ok('events: white days 13–15 each month, but not 13 Dhu al-Hijjah (Tashreeq)', ev('2026-10-24').includes('white-days') && !eventsOn({ day: 13, month: 12, year: 1447 }).some((e) => e.id === 'white-days') && eventsOn({ day: 13, month: 12, year: 1447 }).some((e) => e.id === 'tashreeq'))
ok('events: Eid days say fasting is not permitted', eventsOn({ day: 1, month: 10, year: 1447 })[0].note!.includes('not permitted') && eventsOn({ day: 10, month: 12, year: 1447 })[0].note!.includes('not permitted'))
ok('events: ordinary day has none', eventsOn({ day: 5, month: 3, year: 1448 }).length === 0)

const grid = monthGrid(2026, 9, d('2026-10-16')) // October 2026
const real = grid.filter(Boolean)
ok('month grid: 31 days, padded to whole weeks', real.length === 31 && grid.length % 7 === 0, `${real.length} days, ${grid.length} cells`)
ok('month grid: Oct 1 2026 is a Thursday -> 4 leading blanks (Sunday start)', grid.slice(0, 4).every((c) => c === null) && grid[4] !== null)
ok('month grid: exactly one "today" and it is the 16th', real.filter((c) => c!.isToday).length === 1 && real.find((c) => c!.isToday)!.date.getDate() === 16)
ok('month grid: Hijri day increments by 1 each day within a Hijri month', real.slice(1).every((c, i) => c!.hijri.day === real[i]!.hijri.day + 1 || c!.hijri.day === 1))
ok('month label spans two Hijri months (1 Oct = 20 Rabi al-thani; 12 Oct = 1 Jumada al-awwal)', hijriRangeLabel(grid) === "Rabi' al-thani – Jumada al-awwal 1448", hijriRangeLabel(grid))
const next = nextMajorEvent(d('2026-10-16'))!
ok('next major event after 16 Oct 2026 is Ramadan on 8 Feb 2027 (115 days)', next.event.id === 'ramadan' && dateKey(next.date) === '2027-02-08' && next.daysAway === 115, `${next.event.id} ${dateKey(next.date)} ${next.daysAway}`)
ok('next major event on the day itself counts (0 days away)', nextMajorEvent(d('2026-03-20'))!.daysAway === 0)
ok('fromHijri round-trips (1 Ramadan 1447 -> 18 Feb 2026)', dateKey(fromHijri({ day: 1, month: 9, year: 1447 })!) === '2026-02-18')
ok('fromHijri round-trips over 30 sample dates', (() => { for (let i = 0; i < 30; i++) { const g = addDays(d('2025-01-01'), i * 37); const x = toHijri(g); const back = fromHijri(x); if (!back || dateKey(back) !== dateKey(g)) return false } return true })())
ok('fromHijri: 30 Shawwal 1447 (a 29-day month) does not exist', fromHijri({ day: 30, month: 10, year: 1447 }) === null)
ok('addDays crosses DST/month boundaries safely', dateKey(addDays(d('2026-03-28'), 5)) === '2026-04-02' && dateKey(addDays(d('2026-10-31'), 1)) === '2026-11-01')

// ───────── Khatam plan ─────────
ok('pages per day: 30 days -> 21, 60 -> 11, 365 -> 2', pagesPerDay(30) === 21 && pagesPerDay(60) === 11 && pagesPerDay(365) === 2)
ok('pages per day always finishes within the plan (perDay*days >= 604)', PRESETS.every((p) => pagesPerDay(p.days) * p.days >= TOTAL_PAGES))
ok('parsePageSpec: ranges, lists, junk and limits', JSON.stringify(parsePageSpec('5-8, 12')) === '[5,6,7,8,12]' && parsePageSpec('abc').length === 0 && parsePageSpec('9-3').length === 0 && parsePageSpec('600-700').at(-1) === 604 && parsePageSpec('0').length === 0 && parsePageSpec('3,3,3').length === 1)
let log: ReadLog = {}
log = addPages(log, '2026-10-01', [1, 2, 3])
log = addPages(log, '2026-10-01', [3, 4, 999, -1, 2.5])
ok('addPages: de-duplicates, drops invalid pages, keeps sorted', JSON.stringify(log['2026-10-01']) === '[1,2,3,4]')
ok('addPages: nothing valid -> log unchanged', addPages(log, '2026-10-02', [0, 700]) === log)
ok('daysBetween across a month end', daysBetween('2026-10-30', '2026-11-02') === 3 && shiftKey('2026-12-31', 1) === '2027-01-01')

const plan = { start: '2026-10-01', days: 30 }
let s = planStatus(plan, {}, '2026-10-01')
ok('plan day 1, nothing read: need 21 pages today, behind by 21', s.dayNumber === 1 && s.perDay === 21 && s.todayLeft === 21 && s.expected === 21 && s.ahead === -21 && !s.onTrack)
log = {}
for (let i = 0; i < 5; i++) log = addPages(log, shiftKey('2026-10-01', i), Array.from({ length: 21 }, (_, k) => i * 21 + k + 1))
s = planStatus(plan, log, '2026-10-05')
ok('on schedule after 5 days at 21 pages/day: 105 read, on track, ahead 0', s.read === 105 && s.expected === 105 && s.ahead === 0 && s.onTrack && s.todayLeft === 0, JSON.stringify({ r: s.read, e: s.expected, a: s.ahead }))
ok('finish estimate at this pace is 30 days from the start', s.finishDate === '2026-10-30' || s.finishDate === '2026-10-29' || s.finishDate === '2026-10-31', String(s.finishDate))
s = planStatus(plan, log, '2026-10-12')
ok('a week of not reading puts you behind and the estimate slips', !s.onTrack && s.ahead < 0 && s.finishDate! > '2026-10-30', `${s.ahead} behind, finish ${s.finishDate}`)
ok('re-reading the same pages does not count twice', (() => { const l = addPages(addPages({}, '2026-10-01', [1, 2, 3]), '2026-10-02', [1, 2, 3]); return planStatus(plan, l, '2026-10-02').read === 3 })())
ok('pages read BEFORE the plan started are not counted', planStatus(plan, addPages({}, '2026-09-20', [1, 2, 3, 4, 5]), '2026-10-01').read === 0)
let all: ReadLog = {}
all = addPages(all, '2026-10-03', Array.from({ length: 604 }, (_, i) => i + 1))
s = planStatus(plan, all, '2026-10-03')
ok('finishing all 604 pages = complete, nothing left today', s.complete && s.todayLeft === 0 && s.read === 604)
s = planStatus(plan, {}, '2026-09-28')
ok('before the start date: day 0, not started', s.dayNumber === 0)
s = planStatus(plan, {}, '2027-03-01')
ok('long after the plan ends: day clamps to the plan length, expectation is the whole Quran', s.dayNumber === 30 && s.expected === 604 && s.daysLeft === 0)
ok('reading streak counts consecutive days with the goal met', readingStreak(log, '2026-10-05', 21) === 5 && readingStreak(log, '2026-10-06', 21) === 5, String(readingStreak(log, '2026-10-06', 21)))
ok('reading streak resets after a missed day', readingStreak(log, '2026-10-08', 21) === 0)
ok('juz of page: 1->1, 22->2, 582->30, 604->30, 21->1', juzOfPage(1) === 1 && juzOfPage(22) === 2 && juzOfPage(582) === 30 && juzOfPage(604) === 30 && juzOfPage(21) === 1)

// Cross-check juzOfPage against the real data for all 604 pages
const meta: [number, number, number][] = JSON.parse(readFileSync(new URL('../data/quran/meta.json', import.meta.url), 'utf8'))
const juzByPage = new Map<number, number>()
for (const [page, juz] of meta) if (!juzByPage.has(page)) juzByPage.set(page, juz)
let mismatches = 0
for (let p = 1; p <= 604; p++) if (juzOfPage(p) !== juzByPage.get(p)) mismatches++
ok(`juzOfPage agrees with the real Quran data on pages (${604 - mismatches}/604)`, mismatches <= 30, `${mismatches} differ (a juz can start mid-page)`)

// ───────── Habits ─────────
const resolve = (done5: string[], pages: Record<string, number> = {}) => (date: string) => ({ prayersDone: done5.includes(date) ? 5 : 0, pagesRead: pages[date] ?? 0 })
const day = '2026-10-16'
let hl: HabitLog = {}
ok('9 habits, 2 automatic', HABITS.length === 9 && HABITS.filter((x) => x.auto).length === 2)
ok('nothing ticked: score 0', dayScore(day, hl, resolve([])).done === 0)
hl = toggleHabit(hl, day, 'morning')
ok('ticking a manual habit counts it', isDone(HABITS.find((x) => x.id === 'morning')!, day, hl, { prayersDone: 0, pagesRead: 0 }) && dayScore(day, hl, resolve([])).done === 1)
hl = toggleHabit(hl, day, 'morning')
ok('ticking twice un-ticks', dayScore(day, hl, resolve([])).done === 0)
ok('automatic: all five prayers makes "prayers" done; four does not', dayScore(day, {}, resolve([day])).done === 1 && isDone(HABITS[0], day, {}, { prayersDone: 4, pagesRead: 0 }) === false)
ok('automatic: any Quran page read makes "quran" done', dayScore(day, {}, resolve([], { [day]: 3 })).done === 1)
ok('automatic habits ignore manual ticks (cannot be faked)', (() => { const l = toggleHabit({}, day, 'prayers'); return dayScore(day, l, resolve([])).done === 0 })())
ok('toggleHabit does not mutate the original log', (() => { const a: HabitLog = {}; const b = toggleHabit(a, day, 'fast'); return Object.keys(a).length === 0 && b[day]?.fast === true })())
ok('lastDays: 7 days oldest first, ending today, across a month boundary', JSON.stringify(lastDays('2026-11-02', 7)) === '["2026-10-27","2026-10-28","2026-10-29","2026-10-30","2026-10-31","2026-11-01","2026-11-02"]')
const prayerDays = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']
const prayersHabit = HABITS[0]
ok('streak: 4 perfect-prayer days ending yesterday = 4 (today not done yet)', habitStreak(prayersHabit, day, {}, resolve(prayerDays)) === 4)
ok('streak: including today = 5', habitStreak(prayersHabit, day, {}, resolve([...prayerDays, day])) === 5)
ok('streak: a gap resets it', habitStreak(prayersHabit, day, {}, resolve(['2026-10-12', '2026-10-13', '2026-10-15'])) === 1)
ok('streak: none = 0', habitStreak(prayersHabit, day, {}, resolve([])) === 0)
let wl: HabitLog = {}
for (const dd of ['2026-10-14', '2026-10-15', day]) for (const id of ['morning', 'evening', 'duha', 'night', 'fast', 'charity', 'kindness'] as const) wl = toggleHabit(wl, dd, id)
const wk = weekSummary(day, wl, resolve(['2026-10-14', '2026-10-15', day], { '2026-10-14': 2, '2026-10-15': 5, [day]: 1 }))
ok('week summary: three perfect days (all 9 done), average = 27/63', wk.perfectDays === 3 && wk.days.length === 7 && Math.abs(wk.average - 27 / 63) < 1e-9, `${wk.perfectDays} perfect, avg ${wk.average.toFixed(3)}`)

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
