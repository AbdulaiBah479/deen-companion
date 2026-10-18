// Server-side generator for the Reels feed: short, full-screen cards made only from verified sources
// (Quran, hadith, 99 Names, frequent Quran words). Deterministic for a given seed so paging is stable.

import 'server-only'
import { mulberry32 } from './random'
import { getShortHadith, getWords, getVerse, searchHadithText, searchQuranText, verseAtIndex, wordsAvailable } from './data'

export type ReelItem =
  | { id: string; type: 'ayah'; ref: string; surah: number; ayah: number; surahName: string; arabic: string; text: string; href: string }
  | { id: string; type: 'hadith'; ref: string; text: string; href: string }
  | { id: string; type: 'name'; arabic: string; transliteration: string; text: string; href: string }
  | { id: string; type: 'word'; arabic: string; transliteration: string; text: string; count: number; audio?: string; href: string }

export const REEL_TOPICS = [
  { id: 'foryou', label: 'For you' },
  { id: 'patience', label: 'Patience' },
  { id: 'gratitude', label: 'Gratitude' },
  { id: 'mercy', label: 'Mercy' },
  { id: 'hope', label: 'Hope' },
  { id: 'forgiveness', label: 'Forgiveness' },
  { id: 'family', label: 'Family' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'charity', label: 'Charity' },
  { id: 'prayer', label: 'Prayer' },
  { id: 'death', label: 'Reminders' },
] as const
export const isTopic = (t: string) => REEL_TOPICS.some((x) => x.id === t)

// What to search for when a topic is chosen.
const TOPIC_QUERY: Record<string, string> = {
  patience: 'patience',
  gratitude: 'gratitude',
  mercy: 'mercy',
  hope: 'hope',
  forgiveness: 'forgiveness',
  family: 'parents',
  knowledge: 'knowledge',
  charity: 'charity',
  prayer: 'prayer',
  death: 'death',
}

type VerseLike = { verse_key: string; verse_number: number; text_uthmani: string; translations: { text: string }[]; surah: number; surahName: string }

const ayahItem = (verse: VerseLike): ReelItem => ({
  id: `a-${verse.verse_key}`,
  type: 'ayah',
  ref: verse.verse_key,
  surah: verse.surah,
  ayah: verse.verse_number,
  surahName: verse.surahName,
  arabic: verse.text_uthmani,
  text: verse.translations[0]?.text ?? '',
  href: `/quran/${verse.surah}`,
})

export type NameRow = { number: number; arabic: string; transliteration: string; meaning: string }

export function reelPage(opts: { topic: string; cursor: number; limit: number; seed: number; lang: string; names: NameRow[] }): { items: ReelItem[]; next: number | null } {
  const { topic, cursor, limit, seed, lang, names } = opts

  if (topic !== 'foryou' && TOPIC_QUERY[topic]) {
    // Topic feed: ranked search results, ayat first with a hadith mixed in after every three.
    const q = TOPIC_QUERY[topic]
    const verses = searchQuranText(q, 80, lang)
    const hadith = searchHadithText(q, 40)
    const merged: ReelItem[] = []
    let vi = 0
    let hi = 0
    while (vi < verses.length || hi < hadith.length) {
      for (let k = 0; k < 3 && vi < verses.length; k++, vi++) {
        const [s, a] = verses[vi].key.split(':').map(Number)
        const v = getVerse(s, a, lang)
        if (v && v.text_uthmani.split(' ').length <= 45) merged.push(ayahItem({ ...v, surah: s, surahName: '' }))
      }
      if (hi < hadith.length) {
        const h = hadith[hi++]
        if (h.text.length <= 700) merged.push({ id: `h-${h.bookId}-${h.number}`, type: 'hadith', ref: `${h.book} ${h.number}`, text: h.text, href: `/hadith?book=${h.bookId}&number=${h.number}` })
      }
    }
    const slice = merged.slice(cursor, cursor + limit)
    return { items: slice, next: cursor + limit < merged.length ? cursor + limit : null }
  }

  // For-you feed: endless, seeded mix of ayah / hadith / name / word.
  const pattern = ['ayah', 'ayah', 'hadith', 'ayah', 'name', 'ayah', 'word', 'hadith']
  const hadithPool = getShortHadith()
  const words = wordsAvailable() ? getWords().rows.slice(0, 200) : []
  const items: ReelItem[] = []
  for (let i = cursor; i < cursor + limit; i++) {
    const rand = mulberry32(seed * 1_000_003 + i * 97)
    const kind = pattern[i % pattern.length]
    if (kind === 'hadith' && hadithPool.length) {
      const h = hadithPool[Math.floor(rand() * hadithPool.length)]
      items.push({ id: `h-${h.bookId}-${h.number}`, type: 'hadith', ref: `${h.book} ${h.number}`, text: h.text, href: `/hadith?book=${h.bookId}&number=${h.number}` })
    } else if (kind === 'name' && names.length) {
      const n = names[Math.floor(rand() * names.length)]
      items.push({ id: `n-${n.number}`, type: 'name', arabic: n.arabic, transliteration: n.transliteration, text: n.meaning, href: '/names' })
    } else if (kind === 'word' && words.length) {
      const w = words[Math.floor(rand() * words.length)]
      items.push({ id: `w-${w.ar}`, type: 'word', arabic: w.ar, transliteration: w.tr, text: w.en, count: w.n, audio: w.audio ? `https://audio.qurancdn.com/${w.audio}` : undefined, href: '/learn' })
    } else {
      // an ayah of readable length
      let v = verseAtIndex(Math.floor(rand() * 6236), lang)
      for (let t = 0; t < 40 && (v.wordCount < 5 || v.wordCount > 28); t++) v = verseAtIndex(Math.floor(rand() * 6236), lang)
      items.push(ayahItem(v))
    }
  }
  // De-duplicate within the page (random picks can collide).
  const seen = new Set<string>()
  return { items: items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true))), next: cursor + limit }
}
