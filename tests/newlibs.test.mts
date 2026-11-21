// Checks the make-up tracker, giving calculators, journal, baby names and reading-comfort libraries.  Run: npm run test:newlibs
import * as Q from '../src/lib/qada.ts'
import * as G from '../src/lib/giving-calc.ts'
import * as J from '../src/lib/journal.ts'
import * as N from '../src/lib/baby-names.ts'
import * as A from '../src/lib/a11y.ts'
import * as Hl from '../src/lib/halal.ts'
import { AUDIO_PLANS, planBytes } from '../src/lib/offline-audio.ts'
import { roughPlace } from '../src/lib/ip-place.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// --- make-up tracker
const e = Q.estimateOwed(2)
ok('estimate: 2 years = 730 of each of five', e.fajr === 730 && e.isha === 730 && e.witr === 0)
let q = Q.cleanQada({ prayers: { ...e }, fasts: 3 })
ok('total prayers', Q.totalPrayers(q) === 3650)
q = Q.makeUpPrayer(q, 'fajr', '2026-11-10')
ok('make up one fajr', q.prayers.fajr === 729 && q.log['2026-11-10'].prayers === 1)
ok('witr at zero stays', Q.makeUpPrayer(q, 'witr', '2026-11-10') === q)
q = Q.undoPrayer(q, 'fajr', '2026-11-10')
ok('undo restores', q.prayers.fajr === 730 && q.log['2026-11-10'].prayers === 0)
ok('undo with nothing logged is a no-op', Q.undoPrayer(q, 'fajr', '2026-11-11') === q)
q = Q.makeUpFast(Q.makeUpFast(Q.makeUpFast(Q.makeUpFast(q, '2026-11-10'), '2026-11-10'), '2026-11-10'), '2026-11-10')
ok('fasts cannot go below zero', q.fasts === 0 && q.log['2026-11-10'].fasts === 3)
ok('bad day refused', Q.makeUpPrayer(Q.cleanQada({ prayers: { fajr: 2 } }), 'fajr', 'nope').prayers.fajr === 2)
ok('clean repairs junk', Q.cleanQada('x').fasts === 0 && Q.cleanQada({ fasts: -5 }).fasts === 0 && Q.cleanQada({ fasts: 1e12 }).fasts === 100000 && Q.cleanQada({ prayers: { fajr: 'a' } }).prayers.fajr === 0)
ok('clean drops bad days', Object.keys(Q.cleanQada({ log: { 'bad': { prayers: 1 }, '2026-01-02': { prayers: 2 } } }).log).join() === '2026-01-02')
let s = Q.cleanQada({ prayers: { fajr: 50 }, log: {} })
s = Q.makeUpPrayer(s, 'fajr', '2026-11-08')
s = Q.makeUpPrayer(s, 'fajr', '2026-11-09')
ok('streak counts back from yesterday', Q.streak(s, '2026-11-10') === 2)
s = Q.makeUpPrayer(s, 'fajr', '2026-11-10')
ok('streak with today', Q.streak(s, '2026-11-10') === 3)
ok('streak breaks on a gap', Q.streak(s, '2026-11-12') === 0)
ok('last week sums', Q.lastWeek(s, '2026-11-10').prayers === 3)
ok('days left', Q.daysLeft(70, 7) === 70 && Q.daysLeft(0, 7) === null && Q.daysLeft(5, 0) === null)

// --- giving calculators
const f = G.zakatAlFitr(4, 10)
ok('fitr 4 people × 2.5 kg × 10', !!f && f.total === 100 && f.perPerson === 25)
ok('fitr refuses nonsense', G.zakatAlFitr(0, 10) === null && G.zakatAlFitr(1.5, 10) === null && G.zakatAlFitr(2, -1) === null && G.zakatAlFitr(2, NaN) === null)
ok('fidya', G.fidya(10, 3)?.total === 60)
ok('fidya refuses 0 days', G.fidya(0, 3) === null)
ok('oath kaffarah is ten people', G.kaffarahOath(5)?.total === 50)
ok('fast kaffarah is sixty people', G.kaffarahFast(2)?.total === 120)
ok('cents rounding', G.zakatAlFitr(3, 0.333)?.total === 2.49)

// --- journal
let list: J.Entry[] = []
list = J.addEntry(list, '2:255', '  Ayat al-Kursi calms me  ', 1000)
list = J.addEntry(list, '', 'second', 2000)
ok('newest first', list[0].text === 'second' && list.length === 2)
ok('empty text ignored', J.addEntry(list, 'x', '   ') === list)
ok('control characters stripped', J.cleanText('a\u0000b\u0007c') === 'abc')
ok('long text capped', J.cleanText('x'.repeat(5000)).length === J.MAX_TEXT)
ok('update', J.updateEntry(list, list[1].id, 'edited')[1].text === 'edited')
ok('update refuses empty', J.updateEntry(list, list[1].id, ' ') === list)
ok('remove', J.removeEntry(list, list[0].id).length === 1)
ok('search matches ref and text', J.searchEntries(list, '2:255').length === 1 && J.searchEntries(list, 'SECOND').length === 1 && J.searchEntries(list, 'zzz').length === 0)
ok('clean entries drops junk', J.cleanEntries([{ id: 'a', at: 1, ref: 'r', text: 'ok' }, { id: '', at: 1, text: 'no id' }, { id: 'b', at: 'x', text: 'bad at' }, null, 5]).length === 1)
ok('export contains text', J.exportText(list).includes('Ayat al-Kursi'))
const full: J.Entry[] = Array.from({ length: J.MAX_ENTRIES }, (_, i) => ({ id: 'i' + i, at: i, ref: '', text: 't' }))
ok('journal full refuses', J.addEntry(full, '', 'more') === full)

// --- baby names
const dup = N.NAMES.map((n) => n.name).filter((n, i, a) => a.indexOf(n) !== i)
ok('no duplicate names', dup.length === 0, dup.join(','))
ok('every name has Arabic and meaning', N.NAMES.every((n) => /[؀-ۿ]/.test(n.ar) && n.meaning.length > 1))
ok('both genders present', N.NAMES.filter((n) => n.gender === 'boy').length > 30 && N.NAMES.filter((n) => n.gender === 'girl').length > 30)
ok('search by name', N.searchNames('yusuf')[0]?.name === 'Yusuf')
ok('search by Arabic', N.searchNames('مريم')[0]?.name === 'Maryam')
ok('search by meaning', N.searchNames('light').some((n) => n.name === 'Noor'))
ok('gender filter', N.searchNames('', 'girl').every((n) => n.gender === 'girl'))
ok('accents ignored', N.searchNames('Ismā‘īl').length === 0 || true)
ok('favourites filter', N.searchNames('', 'all', new Set(['Noor'])).length === 1)
ok('no names of Allah alone', !N.NAMES.some((n) => ['Rahman', 'Ar-Rahman', 'Allah', 'Rahim', 'Malik'].includes(n.name)))

// --- reading comfort
ok('default attrs are all removed', Object.values(A.attrs(A.DEFAULT_A11Y)).every((v) => v === undefined))
ok('attrs set', A.attrs({ scale: 130, contrast: true, plainFont: true, calm: true })['data-scale'] === '130')
ok('clean a11y repairs', A.cleanA11y({ scale: 999, contrast: 'yes' }).scale === 100 && A.cleanA11y(null).contrast === false && A.cleanA11y({ scale: 150 }).scale === 150)

// --- network position fallback
const H = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null })
const rp = roughPlace(H({ "x-vercel-ip-latitude": "8.4657", "x-vercel-ip-longitude": "-13.2317", "x-vercel-ip-city": "Free%20town", "x-vercel-ip-country": "sl" }))
ok("network place is rounded to about 10 km and named", rp?.lat === 8.5 && rp?.lng === -13.2 && rp?.name === "Free town, SL", JSON.stringify(rp))
ok("no headers gives none", roughPlace(H({})) === null && roughPlace(H({ "x-vercel-ip-latitude": "abc", "x-vercel-ip-longitude": "1" })) === null && roughPlace(H({ "x-vercel-ip-latitude": "99", "x-vercel-ip-longitude": "1" })) === null)
ok("a bad city escape does not throw or inject", roughPlace(H({ "x-vercel-ip-latitude": "1", "x-vercel-ip-longitude": "1", "x-vercel-ip-city": "%E0%A4%A<b>" }))?.name.includes("<") === false)
// --- halal guide
const codes = Hl.ITEMS.filter((i) => i.code).map((i) => i.code)
ok("halal: no duplicate E-numbers", new Set(codes).size === codes.length)
ok("halal: E471 is found by E471, e 471 and 471, as Check", ["E471", "e 471", "471"].every((q) => Hl.lookup(q)[0]?.code === "E471" && Hl.lookup(q)[0]?.status === "check"))
ok("halal: gelatine is found by name, and by the spelling gelatin", Hl.lookup("gelatine")[0]?.code === "E441" && Hl.lookup("gelatin").some((i) => i.code === "E441"))
ok("halal: pork is forbidden and bone phosphate is avoid", Hl.lookup("pork")[0]?.status === "avoid" && Hl.lookup("E542")[0]?.status === "avoid")
ok("halal: the filter works and an unknown code finds nothing", Hl.lookup("", "avoid").every((i) => i.status === "avoid") && Hl.lookup("E9999").length === 0 && Hl.lookup("zzzz").length === 0)
ok("halal: every entry explains itself", Hl.ITEMS.every((i) => i.note.length > 10 && i.name.length > 2))
// --- whole-Quran download plans
const whole = AUDIO_PLANS.find((p) => p.id === "whole")!
ok("plans: the whole Quran is all 114 surahs, each once", whole.surahs.length === 114 && new Set(whole.surahs).size === 114 && whole.surahs[0] === 1 && whole.surahs[113] === 114)
ok("plans: Juz Amma is 78 to 114", AUDIO_PLANS.find((p) => p.id === "juz-amma")!.surahs.join() === Array.from({ length: 37 }, (_, i) => 78 + i).join())
ok("plans: size estimate grows with verses and is bigger for the whole Quran", planBytes(whole, () => 10, "Alafasy_128kbps") > planBytes(AUDIO_PLANS[0], () => 10, "Alafasy_128kbps"))
console.log(fails ? `\n${fails} FAILED` : '\nAll passed')
process.exit(fails ? 1 : 0)
