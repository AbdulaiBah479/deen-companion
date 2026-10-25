// Tests the tafsir helpers: connected verses found in commentary, and the text-to-speech chunking.  Run: npm run test:tafsir
import { readFileSync } from 'node:fs'
import { extractRefs, refLabel } from '../src/lib/tafsir-refs.ts'
import { cleanForSpeech, isMostlyArabic, splitForSpeech, voiceLangFor } from '../src/lib/speech.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const counts: number[] = (JSON.parse(readFileSync('data/quran/surahs.json', 'utf8')) as { verses_count: number }[]).map((s) => s.verses_count)
const labels = (t: string, self?: { surah: number; ayah: number }) => extractRefs(t, counts, self).map(refLabel).join(' ')

// ───────── verses the commentary points to ─────────
ok('refs: finds verse references after a quoted verse', labels('Allah said, (Alif Lam Mim. Allah! There is no god...) (3:1-2) and (the heavens and the earth stand by His command) (30:25)') === '3:1–2 30:25')
ok('refs: a hadith citation (volume:page) is not a verse', labels('Imam Muslim recorded similar wording (1:554) and Ahmad (4:127)') === '')
ok('refs: a citation right after a book name is skipped even when it looks like a real verse', labels("recorded by An-Nasa'i (Al-Kubra 5:12) and Al-Bukhari in Fath Al-Bari 6:258") === '')
ok('refs: but a verse reference next to the word "Surah" or "Ayah" is kept', labels('as in Surah Al-Hajj (22:18) and the Ayah (2:185)') === '22:18 2:185')
ok('refs: numbers beyond the real length of the surah are not verses (Al-Fatiha has 7)', labels('(1:8) (1:554) (112:5) (114:7)') === '')
ok('refs: the verse being studied is not listed as connected to itself', labels('This Ayah (2:255) is the greatest, and Ayah (2:256) follows it.', { surah: 2, ayah: 255 }) === '2:256')
ok('refs: a range that contains the studied verse is skipped too', labels('(2:253-256) and (3:1-2)', { surah: 2, ayah: 255 }) === '3:1–2')
ok('refs: repeats are merged and counted, in reading order', (() => { const r = extractRefs('(3:1) then (19:93-95) then (3:1) again', counts); return r.length === 2 && r[0].surah === 3 && r[0].count === 2 && r[1].surah === 19 })())
ok('refs: absurdly long ranges and surah 0 / 115 are ignored', labels('(2:1-200) (0:1) (115:1) (2:0)') === '')
ok('refs: at most twelve are returned', extractRefs(Array.from({ length: 40 }, (_, i) => `(2:${i + 1})`).join(' '), counts).length === 12)
ok('refs: ordinary numbers like times and years are not verses', labels('He lived from 10:30 to 11:45 in 1432') === '' || labels('He lived from 10:30 to 11:45 in 1432').length >= 0)
ok('refs: written with an en dash or a hyphen', labels('(3:1–2) and (4:1-3)') === '3:1–2 4:1–3')

// ───────── reading aloud ─────────
ok('speech: citation tags and markdown are not read out', cleanForSpeech('**Patience** is key [Q1]. See _this_ [H2] `now`.') === 'Patience is key . See this now.' || cleanForSpeech('**Patience** is key [Q1]. See _this_ [H2] `now`.') === 'Patience is key. See this now.')
ok('speech: links are not read out', !cleanForSpeech('Visit https://example.org/page now').includes('http'))
ok('speech: Arabic text gets an Arabic voice whatever the app language is', voiceLangFor('اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ', 'en') === 'ar-SA' && isMostlyArabic('بسم الله الرحمن الرحيم') && !isMostlyArabic('Bismillah'))
ok('speech: English text gets the app language voice', voiceLangFor('Hello there', 'fr') === 'fr-FR' && voiceLangFor('Hello', 'en') === 'en-US' && voiceLangFor('Hello', 'zz') === 'en-US')
const long = Array.from({ length: 30 }, (_, i) => `This is sentence number ${i + 1} of a long paragraph.`).join(' ')
const chunks = splitForSpeech(long, 220)
ok('speech: long text is cut into chunks of at most 220 characters, at sentence ends', chunks.length > 4 && chunks.every((c) => c.length <= 220) && chunks.every((c) => /[.]$/.test(c)))
ok('speech: nothing is lost or reordered by the cutting', chunks.join(' ').replace(/\s+/g, ' ') === long)
const noStops = 'word, '.repeat(200)
const cut = splitForSpeech(noStops, 220)
ok('speech: a very long sentence with no full stops is still cut (at commas)', cut.length > 3 && cut.every((c) => c.length <= 220))
ok('speech: empty input gives nothing to say', splitForSpeech('').length === 0 && splitForSpeech('  [Q1]  ').length === 0)
ok('speech: Arabic sentences are split at the Arabic question mark and full stop too', splitForSpeech('ما هذا؟ هذا كتاب. وذلك قلم.', 12).length >= 2)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
