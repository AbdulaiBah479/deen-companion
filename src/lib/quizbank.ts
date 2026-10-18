// Question generator for the quiz: one pool of knowledge, picked by category — or a random mix of everything.
// Pure and seeded, so "today's quiz" is identical for everyone and the logic can be tested.
import { HERITAGE, HERITAGE_CATEGORIES, heritageIn, type Heritage, type HeritageCategory } from './heritage'
import { pick, shuffle } from './random'
import { STORIES, type Story } from './stories'

export type SurahLite = { id: number; name_simple: string; verses_count: number; revelation_place: string; translated_name: { name: string } }
export type NameLite = { number: number; transliteration: string; meaning: string }
export type QuizCategory = 'mix' | 'quran' | 'names' | 'prophets' | HeritageCategory
export type Question = { prompt: string; options: string[]; answer: string; explain?: string; href?: string; cat: QuizCategory }

export const QUIZ_CATEGORIES: { id: QuizCategory; title: string; icon: string; blurb: string }[] = [
  { id: 'mix', title: 'Surprise me', icon: '🎲', blurb: 'A random mix of everything' },
  { id: 'quran', title: 'The Quran', icon: '📖', blurb: 'Surahs, verses and revelation' },
  { id: 'names', title: 'Names of Allah', icon: '✨', blurb: 'Asma ul-Husna and their meanings' },
  { id: 'prophets', title: 'Prophets’ stories', icon: '🕊️', blurb: 'Which story is told where?' },
  ...HERITAGE_CATEGORIES.map((c) => ({ id: c.id as QuizCategory, title: c.title, icon: c.icon, blurb: c.blurb })),
]

export type QuizData = { surahs: SurahLite[]; names: NameLite[] }
type Rand = () => number
type Maker = () => Question | null

const shortTitle = (s: Story) => s.title.replace(/[؀-ۿݐ-ݿ]+/g, '').replace(/\s+/g, ' ').replace(/\s+\)/g, ')').trim()
const shortName = (h: Heritage) => h.name

function quranMakers(surahs: SurahLite[], rand: Rand): Maker[] {
  if (!surahs.length) return []
  const cat: QuizCategory = 'quran'
  return [
    () => {
      const s = pick(surahs, rand)
      const wrong = shuffle([...new Set(surahs.map((x) => x.verses_count))].filter((n) => n !== s.verses_count), rand).slice(0, 3)
      return { cat, prompt: `How many verses does Surah ${s.name_simple} have?`, options: shuffle([s.verses_count, ...wrong].map(String), rand), answer: String(s.verses_count), href: `/quran/${s.id}` }
    },
    () => {
      const s = pick(surahs, rand)
      const answer = s.revelation_place === 'makkah' ? 'Makkah' : 'Madinah'
      return { cat, prompt: `Where was Surah ${s.name_simple} revealed?`, options: ['Makkah', 'Madinah'], answer, href: `/quran/${s.id}` }
    },
    () => {
      const s = pick(surahs, rand)
      const wrong = shuffle(surahs.filter((x) => x.id !== s.id), rand).slice(0, 3)
      return { cat, prompt: `Which surah is number ${s.id} in the Quran?`, options: shuffle([s, ...wrong].map((x) => x.name_simple), rand), answer: s.name_simple, href: `/quran/${s.id}` }
    },
    () => {
      const s = pick(surahs, rand)
      const wrong = shuffle(surahs.filter((x) => x.id !== s.id), rand).slice(0, 3)
      return { cat, prompt: `The name of Surah ${s.name_simple} means:`, options: shuffle([s, ...wrong].map((x) => x.translated_name.name), rand), answer: s.translated_name.name, href: `/quran/${s.id}` }
    },
  ]
}

function nameMakers(names: NameLite[], rand: Rand): Maker[] {
  if (names.length < 4) return []
  return [
    () => {
      const n = pick(names, rand)
      const wrong = shuffle(names.filter((x) => x.number !== n.number), rand).slice(0, 3)
      return { cat: 'names', prompt: `What does the name “${n.transliteration}” mean?`, options: shuffle([n, ...wrong].map((x) => x.meaning), rand), answer: n.meaning, href: '/names' }
    },
    () => {
      const n = pick(names, rand)
      const wrong = shuffle(names.filter((x) => x.number !== n.number), rand).slice(0, 3)
      return { cat: 'names', prompt: `Which name of Allah means “${n.meaning}”?`, options: shuffle([n, ...wrong].map((x) => x.transliteration), rand), answer: n.transliteration, href: '/names' }
    },
  ]
}

function prophetMakers(surahs: SurahLite[], rand: Rand): Maker[] {
  const nameOf = (id: number) => surahs.find((s) => s.id === id)?.name_simple
  return [
    () => {
      const story = pick(STORIES, rand)
      const ch = pick(story.chapters, rand)
      const sn = nameOf(ch.surah)
      const where = sn ? `Surah ${sn} (${ch.surah}:${ch.from}${ch.to > ch.from ? '–' + ch.to : ''})` : `Quran ${ch.surah}:${ch.from}${ch.to > ch.from ? '–' + ch.to : ''}`
      const wrong = shuffle(STORIES.filter((s) => s.id !== story.id), rand).slice(0, 3)
      return {
        cat: 'prophets', prompt: `Which story is told in ${where}?`, options: shuffle([story, ...wrong].map(shortTitle), rand), answer: shortTitle(story),
        explain: `“${ch.title}” — ${story.summary}`, href: `/stories/${story.id}`,
      }
    },
    () => {
      const story = pick(STORIES, rand)
      const wrong = shuffle(STORIES.filter((s) => s.id !== story.id), rand).slice(0, 3)
      return { cat: 'prophets', prompt: `“${story.summary}” — which story is this?`, options: shuffle([story, ...wrong].map(shortTitle), rand), answer: shortTitle(story), href: `/stories/${story.id}` }
    },
  ]
}

function heritageMakers(cat: HeritageCategory | 'all', rand: Rand): Maker[] {
  const pool = cat === 'all' ? HERITAGE : heritageIn(cat)
  if (!pool.length) return []
  const sameCat = (h: Heritage) => (heritageIn(h.cat).length >= 4 ? heritageIn(h.cat) : HERITAGE)
  const distractors = (h: Heritage) => shuffle(sameCat(h).filter((x) => x.id !== h.id), rand).slice(0, 3)
  const who = (): Question => {
    const h = pick(pool, rand)
    const clue = pick(h.clues, rand)
    return { cat: h.cat, prompt: `Who ${clue}?`, options: shuffle([h, ...distractors(h)].map(shortName), rand), answer: shortName(h), explain: `${h.name} (${h.years}) — ${h.lesson}`, href: `/heritage/${h.id}` }
  }
  const lesson = (): Question => {
    const h = pick(pool, rand)
    return { cat: h.cat, prompt: `“${h.lesson}” — whose story teaches this?`, options: shuffle([h, ...distractors(h)].map(shortName), rand), answer: shortName(h), explain: `${h.name} (${h.years})`, href: `/heritage/${h.id}` }
  }
  return [who, who, who, lesson]
}

export function buildQuiz(cat: QuizCategory, data: QuizData, rand: Rand, total = 10): Question[] {
  const makersFor = (c: QuizCategory): Maker[] => {
    if (c === 'quran') return quranMakers(data.surahs, rand)
    if (c === 'names') return nameMakers(data.names, rand)
    if (c === 'prophets') return prophetMakers(data.surahs, rand)
    if (c === 'mix') return []
    return heritageMakers(c, rand)
  }
  // "Surprise me" draws each question from a randomly chosen category, so a quiz can jump from a surah to Salahuddin to al-Khwarizmi.
  const mixCats: QuizCategory[] = ['quran', 'names', 'prophets', ...HERITAGE_CATEGORIES.map((c) => c.id)]
  const cache = new Map<QuizCategory, Maker[]>()
  const next = (i: number): Question | null => {
    const c = cat === 'mix' ? mixCats[Math.floor(rand() * mixCats.length)] : cat
    if (!cache.has(c)) cache.set(c, makersFor(c))
    const makers = cache.get(c)!
    if (!makers.length) return null
    // inside a single category, rotate through the question types so they are varied
    const m = cat === 'mix' ? pick(makers, rand) : makers[i % makers.length]
    return m()
  }
  const out: Question[] = []
  const seen = new Set<string>()
  for (let guard = 0; out.length < total && guard < 400; guard++) {
    const q = next(out.length)
    if (!q || seen.has(q.prompt) || new Set(q.options).size !== q.options.length || !q.options.includes(q.answer) || q.options.length < 2) continue
    seen.add(q.prompt)
    out.push(q)
  }
  return out
}
