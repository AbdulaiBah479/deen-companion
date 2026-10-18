// Tests the "Great Muslims" content and the category quiz generator.  Run: npm run test:heritage
import { HERITAGE, HERITAGE_CATEGORIES, heritageIn } from '../src/lib/heritage.ts'
import { QUIZ_CATEGORIES, buildQuiz, type NameLite, type QuizCategory, type SurahLite } from '../src/lib/quizbank.ts'
import { isSafeTitle } from '../src/lib/library.ts'
import { mulberry32 } from '../src/lib/random.ts'
import { STORIES } from '../src/lib/stories.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ───────── content integrity ─────────
ok('40+ figures', HERITAGE.length >= 40, String(HERITAGE.length))
ok('ids unique and URL-safe', new Set(HERITAGE.map((h) => h.id)).size === HERITAGE.length && HERITAGE.every((h) => /^[a-z0-9-]+$/.test(h.id)))
ok('every group has at least 5 people', HERITAGE_CATEGORIES.every((c) => heritageIn(c.id).length >= 5), HERITAGE_CATEGORIES.map((c) => c.id + ':' + heritageIn(c.id).length).join(' '))
ok('every entry is complete (story, 3 facts, lesson, 3 clues, years, region)', HERITAGE.every((h) => h.story.length > 250 && h.facts.length === 3 && h.lesson.length > 15 && h.clues.length === 3 && h.years && h.region && h.icon))
ok('stories are short enough to read in a minute (≤ 120 words)', HERITAGE.every((h) => h.story.split(/\s+/).length <= 120), HERITAGE.filter((h) => h.story.split(/\s+/).length > 120).map((h) => h.id).join())
ok('Wikipedia titles are accepted by the Library API filter', HERITAGE.every((h) => isSafeTitle(h.wiki)), HERITAGE.filter((h) => !isSafeTitle(h.wiki)).map((h) => h.wiki).join('|'))

// A clue must never give the answer away.
const tokens = (name: string) => name.toLowerCase().split(/[^a-zà-ž’']+/i).filter((t) => t.length >= 5 && !['sultan', 'imam', 'emir', 'great', 'magnificent', 'conqueror'].includes(t))
const leaks = HERITAGE.flatMap((h) => h.clues.filter((c) => tokens(h.name).some((t) => new RegExp('(^|[^a-zà-ž])' + t + '([^a-zà-ž]|$)', 'i').test(c))).map((c) => `${h.id}: ${c}`))
ok('no clue contains the person’s own name', leaks.length === 0, leaks.join(' || '))

// Birth year matches the displayed years (within 30 years — many dates are approximate).
const badYears = HERITAGE.filter((h) => {
  if (/^died/.test(h.years)) return false
  const first = Number(h.years.match(/\d{3,4}/)?.[0])
  return !(Math.abs(first - h.start) <= 30)
}).map((h) => h.id)
ok('timeline year agrees with the displayed years', badYears.length === 0, badYears.join())
ok('everyone lived before the 20th century except modern defenders (no future dates)', HERITAGE.every((h) => h.start < 1900))

// ───────── quiz generator ─────────
const surahs: SurahLite[] = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name_simple: 'Surah' + (i + 1), verses_count: 5 + i * 3, revelation_place: i % 2 ? 'makkah' : 'madinah', translated_name: { name: 'Meaning ' + (i + 1) } }))
const names: NameLite[] = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, transliteration: 'Name' + (i + 1), meaning: 'Means ' + (i + 1) }))
const data = { surahs, names }

for (const c of QUIZ_CATEGORIES) {
  const qs = buildQuiz(c.id, data, mulberry32(42), 10)
  const good = qs.length === 10 && qs.every((q) => q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length >= 2 && q.options.length <= 4 && q.prompt.length > 10) && new Set(qs.map((q) => q.prompt)).size === 10
  ok(`quiz "${c.id}": 10 valid, distinct questions`, good, String(qs.length))
}

const same = (id: QuizCategory) => JSON.stringify(buildQuiz(id, data, mulberry32(7), 10)) === JSON.stringify(buildQuiz(id, data, mulberry32(7), 10))
ok('quiz: same seed → same quiz (so the daily quiz is shared)', QUIZ_CATEGORIES.every((c) => same(c.id)))
ok('quiz: different seeds → different quizzes', JSON.stringify(buildQuiz('scientists', data, mulberry32(1), 10)) !== JSON.stringify(buildQuiz('scientists', data, mulberry32(2), 10)))

const sci = new Set(heritageIn('scientists').map((h) => h.name))
const sciQs = buildQuiz('scientists', data, mulberry32(5), 10)
ok('quiz "scientists": every answer option is a scientist (no outsiders as distractors)', sciQs.every((q) => q.options.every((o) => sci.has(o))))
ok('quiz "scientists": every answer links to that person’s story', sciQs.every((q) => /^\/heritage\/[a-z0-9-]+$/.test(q.href ?? '')))
ok('quiz "scientists": prompts are “Who …?” or lessons', sciQs.every((q) => q.prompt.startsWith('Who ') || q.prompt.startsWith('“')))
ok('quiz "women" (smallest group) still gives 4 options', buildQuiz('women', data, mulberry32(3), 10).every((q) => q.options.length === 4))

const prophetQs = buildQuiz('prophets', data, mulberry32(9), 10)
const titles = new Set(STORIES.map((s) => s.title.replace(/[؀-ۿݐ-ݿ]+/g, '').replace(/\s+/g, ' ').replace(/\s+\)/g, ')').trim()))
ok('quiz "prophets": options are real story titles', prophetQs.every((q) => q.options.every((o) => titles.has(o))))

const mixQs = buildQuiz('mix', data, mulberry32(11), 60)
const kinds = new Set(mixQs.map((q) => q.cat))
ok('quiz "mix": draws from many categories', kinds.size >= 6, [...kinds].join())
ok('quiz without Quran data still works for history categories', buildQuiz('rulers', { surahs: [], names: [] }, mulberry32(1), 10).length === 10)
ok('quiz "names" with no names loaded returns nothing instead of crashing', buildQuiz('names', { surahs, names: [] }, mulberry32(1), 10).length === 0)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
