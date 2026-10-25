// Checks the sermon library against the app's real data: every verse and hadith a topic names must exist and say what the topic needs.
// Run: npm run test:khutbah
import { TOPICS, parseRef, topicById } from '../src/lib/khutbah.ts'
import { HEADINGS, keepKnownMarkers, outlineDraft, parseDraft, sermonText, wordsFor } from '../src/lib/khutbah-text.ts'
import { customEvidence, resolveHadith, resolveVerse, topicEvidence } from '../src/lib/khutbah-build.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

ok('topics: at least 30, with unique ids', TOPICS.length >= 30 && new Set(TOPICS.map((t) => t.id)).size === TOPICS.length)
ok('topics: both evergreen and occasion topics exist', TOPICS.some((t) => t.kind === 'occasion') && TOPICS.some((t) => t.kind === 'evergreen'))
ok('topics: each has a title, a blurb, verses and at least three points', TOPICS.every((t) => t.title && t.blurb && t.quran.length >= 2 && t.points.length >= 3))
ok('refs: parseRef accepts single verses and ranges, refuses nonsense', !!parseRef('3:102') && parseRef('2:155-157')?.to === 157 && !parseRef('0:1') && !parseRef('115:1') && !parseRef('2:5-1') && !parseRef('abc'))

const badVerses: string[] = []
for (const t of TOPICS) for (const r of t.quran) if (!resolveVerse(r, 'en')) badVerses.push(`${t.id}:${r}`)
ok('quran: every verse a topic names exists in the data', badVerses.length === 0, badVerses.join(' '))

const badHadith: string[] = []
for (const t of TOPICS) for (const h of t.hadith) if (!resolveHadith(h.q, h.must)) badHadith.push(`${t.id}:"${h.q.slice(0, 40)}"`)
ok('hadith: every hadith a topic names is found in Bukhari/Muslim and contains its key word', badHadith.length === 0, badHadith.join('  |  '))

const ev = topicEvidence(topicById('sincerity')!, 'en')
ok('evidence: the sincerity topic brings verses (Q1…) and the intentions hadith (H1)', ev.some((e) => e.id === 'Q1' && e.arabic) && ev.some((e) => e.id === 'H1' && /intention/i.test(e.text)))
ok('evidence: numbering is in order and never repeats', new Set(ev.map((e) => e.id)).size === ev.length)
const fr = resolveVerse('112:1', 'fr')
ok('evidence: verses come in the language asked for', !!fr && /Dieu|Allah/i.test(fr.text))
const custom = customEvidence('patience in hardship', 'en')
ok('evidence: a topic someone types brings verses and hadith from the data', custom.length >= 3 && custom.every((e) => e.text.length > 10))
ok('evidence: nonsense input does not crash', Array.isArray(customEvidence('zzqxv jjkqw', 'en')))

// ───────── writing: reading a draft back, safe markers, the outline fallback ─────────
const para = (n: string) => n + ' is explained here in enough words to count as a real paragraph of the talk. [Q1] [Q9]'
const good = HEADINGS.map((h) => h + '\n' + para(h)).join('\n\n')
ok('draft: a draft with the five headings is read into five sections', parseDraft(good)?.length === 5 && parseDraft(good)?.[2].heading === 'Second point')
ok('draft: headings may carry markdown marks and still be found', parseDraft(good.replace('First point\n', '## **First point**\n'))?.length === 5)
ok('draft: a missing heading means the draft is refused', parseDraft(good.replace('Third point\n', 'Something else\n')) === null)
ok('draft: an empty section means the draft is refused', parseDraft(good.replace(para('Introduction'), 'Hi')) === null)
ok('draft: text that is not a sermon is refused', parseDraft('I am sorry, I cannot help with that.') === null)
const kept = keepKnownMarkers('One [Q1] two [Q9] three [H1].', ev)
ok('markers: ids that are not in the evidence are removed, real ones stay', kept.includes('[Q1]') && kept.includes('[H1]') && !kept.includes('[Q9]'), kept)
ok('length: about 130 spoken words a minute', wordsFor(10) === 1300 && wordsFor(5) === 650)
const out = outlineDraft(topicById('patience')!, topicEvidence(topicById('patience')!, 'en'))
ok('outline: five sections, with a verse and a hadith inside the points', out.length === 5 && out[1].body.includes('Allah says') && /\[Q\d\]/.test(out[1].body) && out.some((s) => /\[H\d\]/.test(s.body)))
ok('outline: still five sections with no evidence at all', outlineDraft(topicById('rain')!, []).length === 5)
ok('text: the downloadable text lists each part under its label', sermonText('T', [{ label: 'Intro', text: 'abc' }, { label: 'Verse', arabic: 'ARABIC', text: 'def' }]) === 'T\n\nINTRO\nabc\n\nVERSE\nARABIC\ndef\n')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
