// Tests the search/matching engines against the real bundled data.  Run: npm run test:search
import { readFileSync } from 'node:fs'
import { VerseMatcher } from '../src/lib/match.ts'
import { BM25 } from '../src/lib/bm25.ts'
import { compareRecitation, normalizeArabic } from '../src/lib/arabic.ts'

const read = (p: string) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'))
const arabic: [string, string, string][] = read('quran/arabic.json')
const en: string[] = read('quran/tr-en.json')
const bukhari: [number, string][] = read('hadith/bukhari.json')
const muslim: [number, string][] = read('hadith/muslim.json')

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ---- Arabic normalisation ----
ok('normalize strips tashkeel + unifies alef', normalizeArabic('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ') === 'بسم الله الرحمن')
ok('normalize is idempotent', normalizeArabic(normalizeArabic('إِنَّا أَعْطَيْنَاكَ')) === normalizeArabic('إِنَّا أَعْطَيْنَاكَ'))

// ---- Verse matcher ----
console.time('build matcher')
const matcher = new VerseMatcher(arabic.map((r) => [r[0], r[2]]))
console.timeEnd('build matcher')
const top = (q: string) => matcher.find(q, 3)
const byKey = (k: string) => arabic.find((r) => r[0] === k)!

ok('exact: Al-Ikhlas 112:1', top(byKey('112:1')[1])[0]?.key === '112:1', top(byKey('112:1')[1])[0]?.key)
ok('exact: Al-Fatihah 1:2', top(byKey('1:2')[1])[0]?.key === '1:2', top(byKey('1:2')[1])[0]?.key)
ok('exact: Ayat al-Kursi 2:255', top(byKey('2:255')[1])[0]?.key === '2:255', top(byKey('2:255')[1])[0]?.key)
ok('exact: An-Nas 114:1', top(byKey('114:1')[1])[0]?.key === '114:1', top(byKey('114:1')[1])[0]?.key)

const words = (k: string) => byKey(k)[2].split(' ')
const part = words('2:255').slice(0, 7).join(' ')
ok('partial: first 7 words of Ayat al-Kursi -> 2:255 in top 5 (phrase also opens 3:2)', matcher.find(part, 5).some((r) => r.key === '2:255'), matcher.find(part, 5).map((r) => r.key).join())
const part8 = words('2:255').slice(0, 10).join(' ')
ok('partial: first 10 words -> 2:255 is #1', top(part8)[0]?.key === '2:255', top(part8)[0]?.key)

const dropped = words('2:255').filter((_, i) => i !== 3 && i !== 7).join(' ')
ok('noisy: two words dropped -> still 2:255', top(dropped)[0]?.key === '2:255', top(dropped)[0]?.key)

const misheard = byKey('2:2')[2].replace(/ص/g, 'س').replace(/ت/g, 'ط')
ok('noisy: letter confusions in a full verse -> 2:2', top(misheard)[0]?.key === '2:2', top(misheard)[0]?.key)

const spans = `${byKey('112:3')[2]} ${byKey('112:4')[2]}`
ok('span: two consecutive verses -> 112:3-4', top(spans)[0]?.key === '112:3-4', top(spans)[0]?.key)

ok('no diacritics in query still matches (1:6)', top(normalizeArabic(byKey('1:6')[1]))[0]?.key === '1:6')
ok('garbage Latin text -> no results', top('hello world this is english').length === 0)
ok('very short query -> no results', top('الله').length === 0)

// Sweep: every verse of 15 sample surahs should be found when recited exactly. A verse whose text appears
// verbatim elsewhere (e.g. refrains in Ar-Rahman) counts as found if the identical copy is returned.
const simple = new Map(arabic.map((r) => [r[0], normalizeArabic(r[2])]))
let hit = 0, total = 0
const miss: string[] = []
for (const s of [1, 36, 55, 67, 78, 93, 94, 99, 103, 105, 107, 109, 110, 112, 113]) {
  for (const row of arabic.filter((r) => r[0].startsWith(s + ':'))) {
    if (row[2].split(' ').length < 3) continue
    total++
    const got = matcher.find(row[2], 1)[0]
    const v = Number(row[0].split(':')[1])
    const inRange = got && got.surah === s && got.from <= v && got.to >= v
    const identical = got && got.from === got.to && simple.get(got.key) === simple.get(row[0])
    if (inRange || identical) hit++
    else miss.push(row[0])
  }
}
ok(`sweep: exact verses found (${hit}/${total})`, hit === total, miss.slice(0, 5).join(','))

// Speed
const t0 = performance.now()
for (let i = 0; i < 50; i++) matcher.find(words('18:10').join(' '), 5)
const per = (performance.now() - t0) / 50
ok(`speed: ${per.toFixed(1)} ms per lookup`, per < 150)

// ---- Recitation comparison ----
const v = byKey('112:1')[1]
const perfect = compareRecitation(v, v)
ok('recitation: perfect score = 1', perfect.score === 1)
const missed = compareRecitation(v, v.split(' ').slice(0, 2).join(' '))
ok('recitation: missing words lower the score', missed.score > 0 && missed.score < 1, missed.score.toFixed(2))
ok('recitation: nothing heard = 0', compareRecitation(v, '').score === 0)

// ---- BM25 over translations ----
const quran = new BM25(en)
const q1 = quran.search('patience in hardship', 5).map((r) => arabic[r.index][0])
ok('quran search "patience" returns results', q1.length === 5, q1.join(','))
const q2 = quran.search('fasting in the month of Ramadan', 3).map((r) => arabic[r.index][0])
ok('quran search "fasting Ramadan" finds 2:183-187 region', q2.some((k) => /^2:18[3-7]$/.test(k)), q2.join(','))
const q3 = quran.search('Allah is One eternal refuge', 3).map((r) => arabic[r.index][0])
ok('quran search finds Al-Ikhlas', q3.some((k) => k.startsWith('112:')), q3.join(','))
ok('quran search nonsense -> nothing', quran.search('zzzxqv qqqwww', 3).length === 0)

const hadith = new BM25([...bukhari, ...muslim].map((h) => h[1]))
const hs = hadith.search('intention actions are judged', 3).map((r) => [...bukhari, ...muslim][r.index])
ok('hadith search finds "actions are judged by intentions"', hs.some((h) => /intention/i.test(h[1])), hs.map((h) => h[0]).join(','))
const hs2 = hadith.search('kindness to neighbours', 3)
ok('hadith search "neighbour" returns results', hs2.length > 0)

// ---- Relevance gating + spelling (used by the grounded AI) ----
const strict = (idx: BM25, q: string) => { const r = idx.search(q, 5, 0.6); return r.length ? r : idx.search(q, 5, 0.4) }
ok('off-topic "best pizza topping" matches no verses', strict(quran, 'best pizza topping').length === 0, String(strict(quran, 'best pizza topping').length))
ok('off-topic "best pizza topping" matches no hadith', strict(hadith, 'best pizza topping').length === 0)
const nb = strict(quran, 'kindness to neighbours').map((r) => arabic[r.index][0])
ok('British spelling "neighbours" finds 4:36 (do good to the neighbor)', nb.includes('4:36'), nb.join())
const nbUs = strict(quran, 'neighbor').map((r) => arabic[r.index][0])
ok('American spelling gives the same verse', nbUs.includes('4:36'), nbUs.join())
const par = strict(quran, 'kindness to parents').map((r) => arabic[r.index][0])
ok('"kindness to parents" finds a parents verse (17:23/31:14/46:15/2:83)', par.some((k) => ['17:23', '31:14', '46:15', '2:83', '4:36', '29:8', '31:15', '17:24'].includes(k)), par.join())

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
