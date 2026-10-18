// Server-side access to the bundled datasets in ./data (created by `npm run data`).
// Everything is loaded lazily and cached in memory for the life of the server process.

import 'server-only'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { BM25 } from './bm25'
import { VerseMatcher } from './match'
import { dailyIndex } from './daily'

const DATA = path.join(process.cwd(), 'data')

export const SUPPORTED_LANGS = ['en', 'ur', 'fr', 'id', 'tr', 'bn', 'es', 'ha', 'de', 'ru', 'ms', 'so', 'sw']

export type Surah = {
  id: number
  name_simple: string
  name_arabic: string
  verses_count: number
  revelation_place: string
  translated_name: { name: string }
}
type ArabicRow = [string, string, string] // key, uthmani, simple

const cache = new Map<string, unknown>()
function load<T>(rel: string): T {
  if (!cache.has(rel)) {
    const file = path.join(DATA, rel)
    if (!existsSync(file)) throw new Error(`Missing dataset ${rel}. Run: npm run data`)
    cache.set(rel, JSON.parse(readFileSync(file, 'utf8')))
  }
  return cache.get(rel) as T
}

export const dataAvailable = () => existsSync(path.join(DATA, 'quran', 'arabic.json'))
export const isLang = (code: string) => SUPPORTED_LANGS.includes(code)

export const getSurahs = () => load<Surah[]>('quran/surahs.json')
const getArabic = () => load<ArabicRow[]>('quran/arabic.json')
const getTranslation = (lang: string) => load<string[]>(`quran/tr-${isLang(lang) ? lang : 'en'}.json`)

// Global index of the first verse of each surah.
let offsets: number[] | null = null
function surahOffset(surah: number): number {
  if (!offsets) {
    offsets = [0]
    for (const s of getSurahs()) offsets.push(offsets[offsets.length - 1] + s.verses_count)
  }
  return offsets[surah - 1]
}

export type VerseOut = {
  verse_number: number
  verse_key: string
  text_uthmani: string
  text_simple: string // same words in standard spelling — used to match speech recognition
  translations: { text: string }[]
}

export function getVerses(surah: number, lang = 'en', from = 1, to = Infinity): VerseOut[] {
  const meta = getSurahs()[surah - 1]
  if (!meta) return []
  const base = surahOffset(surah)
  const ar = getArabic()
  const tr = getTranslation(lang)
  const out: VerseOut[] = []
  for (let v = Math.max(1, from); v <= Math.min(meta.verses_count, to); v++) {
    const i = base + v - 1
    out.push({ verse_number: v, verse_key: `${surah}:${v}`, text_uthmani: ar[i][1], text_simple: ar[i][2], translations: [{ text: tr[i] }] })
  }
  return out
}

export function getVerse(surah: number, verse: number, lang = 'en'): VerseOut | null {
  return getVerses(surah, lang, verse, verse)[0] ?? null
}

// ---- Search ----
let quranIndex: BM25 | null = null
// Strict first (most query terms must appear); if nothing qualifies, relax once. Unrelated queries return nothing.
function coverageSearch(index: BM25, query: string, limit: number) {
  const strict = index.search(query, limit, 0.6)
  return strict.length ? strict : index.search(query, limit, 0.4)
}

export function searchQuranText(query: string, limit = 5, lang = 'en') {
  if (!quranIndex) quranIndex = new BM25(getTranslation('en'))
  const ar = getArabic()
  const tr = getTranslation(lang)
  return coverageSearch(quranIndex, query, limit).map(({ index, score }) => {
    const [key, uthmani] = ar[index]
    return { key, arabic: uthmani, text: tr[index], score }
  })
}

type HadithRow = [number, string]
const HADITH_BOOKS = [
  { id: 'bukhari', name: 'Sahih al-Bukhari' },
  { id: 'muslim', name: 'Sahih Muslim' },
] as const
let hadithIndex: { book: (typeof HADITH_BOOKS)[number]; row: HadithRow }[] | null = null
let hadithBm25: BM25 | null = null

export function searchHadithText(query: string, limit = 4) {
  if (!hadithIndex || !hadithBm25) {
    hadithIndex = HADITH_BOOKS.flatMap((book) => load<HadithRow[]>(`hadith/${book.id}.json`).map((row) => ({ book, row })))
    hadithBm25 = new BM25(hadithIndex.map((h) => h.row[1]))
  }
  return coverageSearch(hadithBm25, query, limit).map(({ index, score }) => {
    const { book, row } = hadithIndex![index]
    return { book: book.name, bookId: book.id, number: row[0], text: row[1], score }
  })
}

// Direct lookup of an English hadith by its number in the bundled Bukhari/Muslim files.
const localByNumber = new Map<string, Map<number, string>>()
export function getLocalHadith(bookId: string, number: number): string | null {
  if (bookId !== 'bukhari' && bookId !== 'muslim') return null
  if (!localByNumber.has(bookId)) {
    localByNumber.set(bookId, new Map(load<HadithRow[]>(`hadith/${bookId}.json`)))
  }
  return localByNumber.get(bookId)!.get(number) ?? null
}

// ---- Recitation matching ----
let matcher: VerseMatcher | null = null
export function matchRecitation(arabicText: string, limit = 5) {
  if (!matcher) matcher = new VerseMatcher(getArabic().map((r) => [r[0], r[2]]))
  const surahs = getSurahs()
  return matcher.find(arabicText, limit).map((m) => ({
    ...m,
    surahName: surahs[m.surah - 1]?.name_simple,
    verses: getVerses(m.surah, 'en', m.from, m.to),
  }))
}

// ---- Navigation: mushaf pages (604), juz (30) ----
type MetaRow = [number, number, number] // page, juz, quarter-hizb
const getMeta = () => load<MetaRow[]>('quran/meta.json')
export const metaAvailable = () => existsSync(path.join(DATA, 'quran', 'meta.json'))

// Global index -> [surah, verse]
let locator: { surah: Uint8Array; verse: Uint16Array } | null = null
function getLocator() {
  if (!locator) {
    const surah = new Uint8Array(6236)
    const verse = new Uint16Array(6236)
    let i = 0
    for (const s of getSurahs()) {
      for (let v = 1; v <= s.verses_count; v++, i++) {
        surah[i] = s.id
        verse[i] = v
      }
    }
    locator = { surah, verse }
  }
  return locator
}

let pageRange: { start: Int32Array; end: Int32Array } | null = null
function getPageRange() {
  if (!pageRange) {
    const start = new Int32Array(606).fill(-1)
    const end = new Int32Array(606).fill(-1)
    getMeta().forEach(([page], i) => {
      if (start[page] === -1) start[page] = i
      end[page] = i
    })
    pageRange = { start, end }
  }
  return pageRange
}

export type PageVerse = VerseOut & { surah: number; surahName: string; surahArabic: string; startsSurah: boolean }

export function getPage(page: number, lang = 'en'): { page: number; juz: number; verses: PageVerse[] } | null {
  if (!Number.isInteger(page) || page < 1 || page > 604) return null
  const { start, end } = getPageRange()
  const surahs = getSurahs()
  const loc = getLocator()
  const ar = getArabic()
  const tr = getTranslation(lang)
  const meta = getMeta()
  const verses: PageVerse[] = []
  for (let i = start[page]; i <= end[page]; i++) {
    const s = loc.surah[i]
    const v = loc.verse[i]
    verses.push({
      verse_number: v,
      verse_key: `${s}:${v}`,
      text_uthmani: ar[i][1],
      text_simple: ar[i][2],
      translations: [{ text: tr[i] }],
      surah: s,
      surahName: surahs[s - 1].name_simple,
      surahArabic: surahs[s - 1].name_arabic,
      startsSurah: v === 1,
    })
  }
  return { page, juz: meta[start[page]][1], verses }
}

export function pageOf(surah: number, verse: number): number | null {
  const meta = getMeta()
  return meta[surahOffset(surah) + verse - 1]?.[0] ?? null
}

// First verse of each juz, for the Juz tab.
export function juzIndex() {
  const meta = getMeta()
  const loc = getLocator()
  const surahs = getSurahs()
  const out: { juz: number; surah: number; verse: number; surahName: string; surahArabic: string; page: number }[] = []
  for (let i = 0; i < meta.length; i++) {
    const juz = meta[i][1]
    if (out.length < juz) {
      out.push({ juz, surah: loc.surah[i], verse: loc.verse[i], surahName: surahs[loc.surah[i] - 1].name_simple, surahArabic: surahs[loc.surah[i] - 1].name_arabic, page: meta[i][0] })
    }
  }
  return out
}

// First page of each surah (for the surah list).
export function surahPages(): number[] {
  const meta = getMeta()
  return getSurahs().map((s) => meta[surahOffset(s.id)][0])
}

// "Ayah of the day": same verse for everyone on a given date, from verses of moderate length (so the card reads well).
// Walks through the whole pool without repeating (see lib/daily.ts).
let dailyVerses: number[] | null = null
export function verseOfDay(dateKey: string, lang = 'en') {
  const ar = getArabic()
  if (!dailyVerses) {
    dailyVerses = []
    for (let i = 0; i < ar.length; i++) {
      const words = ar[i][2].split(' ').length
      if (words >= 5 && words <= 30) dailyVerses.push(i)
    }
  }
  if (!dailyVerses.length) return null
  const idx = dailyVerses[dailyIndex(dateKey, dailyVerses.length)]
  const loc = getLocator()
  const s = loc.surah[idx]
  const v = loc.verse[idx]
  return { ...getVerse(s, v, lang)!, surah: s, surahName: getSurahs()[s - 1].name_simple }
}

// Deterministic-per-cursor pseudo-random verse indices for the reels feed.
export function verseAtIndex(idx: number, lang = 'en') {
  const loc = getLocator()
  const i = ((idx % 6236) + 6236) % 6236
  const s = loc.surah[i]
  const v = loc.verse[i]
  const verse = getVerse(s, v, lang)!
  return { ...verse, surah: s, surahName: getSurahs()[s - 1].name_simple, wordCount: getArabic()[i][2].split(' ').length }
}

// ---- Learning data & short hadith for feeds ----
export type WordRow = { ar: string; tr: string; en: string; n: number; audio?: string; ex: string }
export const wordsAvailable = () => existsSync(path.join(DATA, 'learn', 'words.json'))
export const getWords = () => load<{ total: number; distinct: number; rows: WordRow[] }>('learn/words.json')

// The hadith of the day: the same for everyone on a given date, different every day, and not repeating on a yearly cycle.
// Drawn from Sahih al-Bukhari's one-screen-length hadith (numbering matches the translated editions, so every language works).
export function hadithOfDay(dateKey: string) {
  const pool = getShortHadith().filter((h) => h.bookId === 'bukhari')
  if (!pool.length) return null
  return pool[dailyIndex(dateKey, pool.length, 2)]
}

let shortHadith: { bookId: string; book: string; number: number; text: string }[] | null = null
// Hadith short enough to read on one screen (90–380 characters), from the bundled collections.
export function getShortHadith() {
  if (!shortHadith) {
    shortHadith = HADITH_BOOKS.flatMap((book) =>
      load<HadithRow[]>(`hadith/${book.id}.json`)
        .filter(([, t]) => t.length >= 90 && t.length <= 380)
        .map(([number, text]) => ({ bookId: book.id, book: book.name, number, text }))
    )
  }
  return shortHadith
}
