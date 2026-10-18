// Verifies that every Quran/hadith reference in the guides is real and says what the guide claims.  Run: npm run test:guides
import { readFileSync } from 'node:fs'
import { GUIDES, SEERAH, TALBIYAH } from '../src/lib/guides-content.ts'
import { normalizeArabic } from '../src/lib/arabic.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const read = (p: string) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'))
const arabic: [string, string, string][] = read('quran/arabic.json')
const english: string[] = read('quran/tr-en.json')
const books = { bukhari: read('hadith/bukhari.json') as [number, string][], muslim: read('hadith/muslim.json') as [number, string][] }
const en = (ref: string) => english[arabic.findIndex((r) => r[0] === ref)] ?? ''
// standard-spelling text (index 2): the Uthmani script writes hamza/madda differently from everyday spelling
const ar = (ref: string) => normalizeArabic(arabic.find((r) => r[0] === ref)?.[2] ?? '')

// What each cited verse must be about (a keyword that has to appear in the English translation).
const EXPECT: Record<string, RegExp> = {
  '2:196': /ḥajj|hajj/i, '2:201': /world|hereafter/i, '2:125': /(Abraham|Ibrāhīm).*prayer|prayer.*(Abraham|place)/i,
  '2:158': /Ṣafā|Safa/i, '3:97': /ḥajj|pilgrimage/i, '22:27': /ḥajj|pilgrimage/i, '2:198': /ʿArafāt|Arafat|Mashʿar/i,
  '2:203': /numbered days/i, '105:1': /elephant/i, '96:1': /Recite/i, '17:1': /by night/i, '3:123': /Badr/i,
  '48:1': /conquest/i, '5:3': /perfected/i, '33:9': /armies|forces/i,
}

const allRefs = new Set<string>()
for (const g of GUIDES) for (const s of g.steps) for (const q of s.quran ?? []) allRefs.add(q.ref)
for (const e of SEERAH) for (const q of e.quran ?? []) allRefs.add(q.ref)
ok(`all ${allRefs.size} cited verses exist`, [...allRefs].every((r) => en(r) !== ''), [...allRefs].filter((r) => !en(r)).join())
const wrong = [...allRefs].filter((r) => EXPECT[r] && !EXPECT[r].test(en(r)))
ok('each cited verse actually says what it is cited for', wrong.length === 0, wrong.map((r) => `${r}: ${en(r).slice(0, 60)}`).join(' | '))
ok('every cited verse has a stated expectation (nothing cited unchecked)', [...allRefs].every((r) => EXPECT[r]), [...allRefs].filter((r) => !EXPECT[r]).join())

// Hadith references use this app's numbering
const hadithRefs = GUIDES.flatMap((g) => g.steps.flatMap((s) => s.hadith ?? []))
ok('hadith references exist in the bundled collection', hadithRefs.every((h) => books[h.book].some((x) => x[0] === h.number)))
const jabir = books.muslim.find((x) => x[0] === 2951)?.[1] ?? ''
ok("Muslim 2951 is Jabir's account of the Prophet's Hajj", /Jabir/.test(jabir) && /(Hajj|pilgrim|Arafa|Ihram|Mina|Safa|Marwa)/i.test(jabir), jabir.slice(0, 60))

// The Talbiyah and the tawaf dua are quoted verbatim
ok('tawaf dua is the wording of Quran 2:201', ar('2:201').includes(normalizeArabic(GUIDES[0].steps[1].dua!.ar)), normalizeArabic(GUIDES[0].steps[1].dua!.ar))
ok('Talbiyah has the three essential phrases', /لبيك اللهم لبيك/.test(normalizeArabic(TALBIYAH.ar)) && /لا شريك لك/.test(normalizeArabic(TALBIYAH.ar)) && /الحمد والنعمه لك والملك/.test(normalizeArabic(TALBIYAH.ar)))

// Structure
ok('Umrah has the four acts (ihram, tawaf, sa\'i, halq/taqsir)', GUIDES[0].steps.length === 5 && /Ihram/.test(GUIDES[0].steps[0].title) && /Tawaf/.test(GUIDES[0].steps[1].title) && /Sa‘i/.test(GUIDES[0].steps[3].title) && /Halq/.test(GUIDES[0].steps[4].title))
ok('Hajj covers the 8th, 9th, 10th, Tashreeq days and farewell tawaf', ['8 Dhu', '9 Dhu', '10 Dhu', '11, 12', 'Wada'].every((k) => GUIDES[1].steps.some((s) => s.title.includes(k))))
ok('Seerah events are in chronological order', (() => { const y = SEERAH.map((e) => parseInt(e.year.replace(/\D*(\d{3,4}).*/, '$1'))); return y.every((v, i) => i === 0 || v >= y[i - 1]) })(), SEERAH.map((e) => e.year).join(' < '))
ok('Seerah AH years match known gaps: Hijrah 622=1AH, Badr 624=2AH, Hudaybiyyah 628=6AH, Makkah 630=8AH', (() => { const get = (t: string) => SEERAH.find((e) => e.title.includes(t))!; return get('Hijrah').ah === '1 AH' && get('Badr').ah === '2 AH' && get('Hudaybiyyah').ah === '6 AH' && get('Conquest').ah === '8 AH' && get('Farewell').ah === '10 AH' })())
ok('approximate dates are marked as approximate', SEERAH.filter((e) => /^c\./.test(e.year)).every((e) => e.approx))

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
