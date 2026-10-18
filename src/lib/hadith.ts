// Hadith from fawazahmed0/hadith-api (free, served via jsDelivr CDN).
// Bukhari and Muslim in English are also bundled locally (see lib/data.ts) for instant lookup and search.

const HADITH_CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'

export const HADITH_BOOKS = [
  { id: 'bukhari', name: 'Sahih al-Bukhari' },
  { id: 'muslim', name: 'Sahih Muslim' },
  { id: 'abudawud', name: 'Sunan Abi Dawud' },
  { id: 'tirmidhi', name: "Jami' at-Tirmidhi" },
  { id: 'nasai', name: "Sunan an-Nasa'i" },
  { id: 'ibnmajah', name: 'Sunan Ibn Majah' },
  { id: 'malik', name: "Muwatta Malik" },
  { id: 'nawawi', name: "Imam Nawawi's 40 Hadith" },
  { id: 'qudsi', name: 'Forty Hadith Qudsi' },
] as const

export type HadithBookId = (typeof HADITH_BOOKS)[number]['id']
export const isBookId = (id: string): id is HadithBookId => HADITH_BOOKS.some((b) => b.id === id)

// Languages the hadith-api has editions for (3-letter prefix). Others fall back to English.
const EDITION_PREFIX: Record<string, string> = {
  en: 'eng', ar: 'ara', ur: 'urd', fr: 'fra', id: 'ind', tr: 'tur', bn: 'ben', ru: 'rus',
}

export function editionId(book: HadithBookId, lang: string): string {
  return `${EDITION_PREFIX[lang] ?? 'eng'}-${book}`
}

export type HadithItem = { hadithnumber: number; text: string; reference?: { book: number; hadith: number } }

// Fetch one hadith from the CDN. The API wraps the item: { metadata, hadiths: [ {...} ] }.
export async function fetchHadith(book: HadithBookId, number: number, lang = 'en'): Promise<HadithItem | null> {
  const tryEdition = async (edition: string) => {
    const res = await fetch(`${HADITH_CDN}/${edition}/${number}.json`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const h = data.hadiths?.[0]
    return h?.text ? (h as HadithItem) : null
  }
  try {
    return (await tryEdition(editionId(book, lang))) ?? (lang !== 'en' ? await tryEdition(editionId(book, 'en')) : null)
  } catch (error) {
    console.error('Failed to fetch hadith:', error)
    return null
  }
}

// Day-of-year rotation through the first 365 hadith of Bukhari.
export function dayOfYear(now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}
