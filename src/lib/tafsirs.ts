// Tafsir sources available from the Quran.Foundation API (ids from /resources/tafsirs).
export type TafsirSource = { id: number; name: string; lang: 'en' | 'ar' | 'ur'; about?: string }

export const TAFSIRS: TafsirSource[] = [
  { id: 169, name: 'Ibn Kathir (abridged)', lang: 'en', about: 'The best-known classical commentary: explains the Quran with other verses, hadith and the words of the Companions.' },
  { id: 168, name: "Ma'arif al-Qur'an (Mufti Shafi)", lang: 'en', about: 'A modern commentary that draws lessons for daily life and answers present-day questions.' },
  { id: 817, name: 'Tazkirul Quran (Wahiduddin Khan)', lang: 'en', about: 'A short, thoughtful modern commentary that focuses on the message and its spiritual meaning.' },
  { id: 16, name: 'التفسير الميسر (Al-Muyassar)', lang: 'ar', about: 'A clear, brief Arabic explanation — the easiest place to start.' },
  { id: 91, name: 'تفسير السعدي (As-Sa‘di)', lang: 'ar', about: 'Simple, deep and focused on lessons and benefits of each verse.' },
  { id: 93, name: 'التفسير الوسيط (Al-Wasit)', lang: 'ar', about: 'A modern, balanced Arabic commentary issued by Al-Azhar scholars.' },
  { id: 94, name: 'تفسير البغوي (Al-Baghawi)', lang: 'ar', about: 'A classic that relies on narrations from the Companions and early scholars.' },
  { id: 90, name: 'تفسير القرطبي (Al-Qurtubi)', lang: 'ar', about: 'Detailed: language, the rulings drawn from the verses and the views of the scholars.' },
  { id: 15, name: 'تفسير الطبري (At-Tabari)', lang: 'ar', about: 'The earliest great commentary: gathers the narrations and weighs the views.' },
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
