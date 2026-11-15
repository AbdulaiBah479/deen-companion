// Checks the words of the prayers and rituals: structure, that every reference resolves, and that the Quran passages are exactly the
// app's Quran data.  The Arabic of each pinned hadith is checked word for word by `npm run check:recitations` (needs the internet).
import { QURAN_PASSAGES } from '../src/lib/recite-quran.ts'
import { QURAN_TRANSLIT, RECITATIONS, recitationById } from '../src/lib/recitations.ts'
import { RITUALS, RITUAL_WORDS } from '../src/lib/rituals.ts'
import { SECTIONS, SECTION_WORDS, STEP_WORDS } from '../src/lib/basics.ts'
import { getVerses } from '../src/lib/data.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

const ids = RECITATIONS.map((r) => r.id)
ok('recitation ids are unique', new Set(ids).size === ids.length)
ok('every recitation has Arabic with vowel marks, a transliteration, a meaning and a source', RECITATIONS.every((r) => /[ء-ي]/.test(r.ar) && /[ً-ْ]/.test(r.ar) && r.translit.length > 3 && r.en.length > 8 && r.source.length > 5), RECITATIONS.filter((r) => !(/[ً-ْ]/.test(r.ar))).map((r) => r.id).join())
ok('the Arabic is plain Arabic text (no stray Latin letters or digits)', RECITATIONS.every((r) => !/[A-Za-z0-9]/.test(r.ar)))
ok('the transliteration has no Arabic letters in it', RECITATIONS.every((r) => !/[؀-ۿ]/.test(r.translit)))
ok('the central prayer words are all there', ['takbir', 'ruku', 'sujud', 'tashahhud', 'salawat', 'salam', 'istikhara-dua', 'janazah-dua', 'talbiyah', 'adhan', 'adhan-dua', 'travel-dua', 'wudu-end'].every((i) => recitationById(i)))
ok('verified pins point at Bukhari or Muslim hadith numbers', RECITATIONS.every((r) => !r.pin || (['bukhari', 'muslim'].includes(r.pin.book) && Number.isInteger(r.pin.number) && r.pin.number > 0)))
ok('at least 20 recitations are verified word for word against the hadith', RECITATIONS.filter((r) => r.pin).length >= 20, String(RECITATIONS.filter((r) => r.pin).length))

// Quran passages are exactly the app's data
let same = true
let why = ''
for (const [id, p] of Object.entries(QURAN_PASSAGES)) {
  const live = getVerses(p.surah, 'en', p.from, p.to)
  if (live.length !== p.verses.length || live.some((v, i) => v.text_uthmani !== p.verses[i].ar || v.translations[0].text !== p.verses[i].en)) {
    same = false
    why += id + ' '
  }
}
ok('every Quran passage is identical to the Quran data', same, why)
ok('the passages include al-Fatihah (7), al-Ikhlas (4), an-Nas (6) and Ayat al-Kursi', QURAN_PASSAGES.fatiha.verses.length === 7 && QURAN_PASSAGES.ikhlas.verses.length === 4 && QURAN_PASSAGES.nas.verses.length === 6 && QURAN_PASSAGES.kursi.verses.length === 1 && QURAN_PASSAGES.kursi.surah === 2)
ok('each transliterated surah has one line per verse', Object.entries(QURAN_TRANSLIT).every(([k, v]) => QURAN_PASSAGES[k]?.verses.length === v.length))

// Every reference resolves
const known = (id: string) => (id.startsWith('quran:') ? !!QURAN_PASSAGES[id.slice(6)] : !!recitationById(id))
const used: string[] = [...Object.values(RITUAL_WORDS).flat().map((w) => w.id), ...Object.values(STEP_WORDS).flatMap((m) => Object.values(m).flat()), ...Object.values(SECTION_WORDS).flat()]
ok('every id used by a ritual or a basics step exists', used.every(known), used.filter((i) => !known(i)).join())
ok('every ritual with words is a real ritual', Object.keys(RITUAL_WORDS).every((id) => RITUALS.some((r) => r.id === id)))
ok('the words are attached to a real section and step', Object.entries(STEP_WORDS).every(([sid, m]) => { const s = SECTIONS.find((x) => x.id === sid); return !!s?.steps && Object.keys(m).every((i) => Number(i) < s.steps!.length) }) && Object.keys(SECTION_WORDS).every((sid) => SECTIONS.some((s) => s.id === sid)))
ok('the prayer steps carry the words: opening, recitation, bow, rise, prostration, sitting, tashahhud, salam', [1, 2, 3, 4, 5, 6, 8, 9].every((i) => (STEP_WORDS.pray[i] ?? []).length > 0))
ok('the new rituals exist: adhan, remembrance after prayer, Hajj and Umrah words', ['adhan', 'adhkar-salah', 'hajj-words'].every((id) => RITUALS.some((r) => r.id === id)))
ok('every ritual that has words shows at least one', Object.values(RITUAL_WORDS).every((l) => l.length > 0))
ok('no ritual lists the same words twice in a row', Object.values(RITUAL_WORDS).every((l) => l.every((w, i) => i === 0 || w.id !== l[i - 1].id)))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
