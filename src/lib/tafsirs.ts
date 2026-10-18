// Tafsir sources available from the Quran.Foundation API (ids from /resources/tafsirs).
export type TafsirSource = { id: number; name: string; lang: 'en' | 'ar' | 'ur' }

export const TAFSIRS: TafsirSource[] = [
  { id: 169, name: 'Ibn Kathir (abridged)', lang: 'en' },
  { id: 168, name: "Ma'arif al-Qur'an (Mufti Shafi)", lang: 'en' },
  { id: 817, name: 'Tazkirul Quran (Wahiduddin Khan)', lang: 'en' },
  { id: 16, name: 'التفسير الميسر (Al-Muyassar)', lang: 'ar' },
  { id: 91, name: 'تفسير السعدي (As-Sa‘di)', lang: 'ar' },
  { id: 14, name: 'تفسير ابن كثير (Ibn Kathir)', lang: 'ar' },
  { id: 160, name: 'تفسیر ابن کثیر (Ibn Kathir, Urdu)', lang: 'ur' },
  { id: 159, name: 'بیان القرآن (Dr. Israr Ahmad)', lang: 'ur' },
]

export const isTafsirId = (id: number) => TAFSIRS.some((t) => t.id === id)

// A sensible default for the reader's chosen language (Arabic/Urdu readers get a tafsir in their language).
export function defaultTafsirFor(lang: string): number {
  if (lang === 'ur') return 160
  return 169
}
