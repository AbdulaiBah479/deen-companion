// Languages with a bundled Quran translation (see scripts/fetch-data.mjs).
export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', rtl: false },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
  { code: 'fr', name: 'French', native: 'Français', rtl: false },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', rtl: false },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', rtl: false },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', rtl: false },
  { code: 'es', name: 'Spanish', native: 'Español', rtl: false },
  { code: 'ha', name: 'Hausa', native: 'Hausa', rtl: false },
  { code: 'de', name: 'German', native: 'Deutsch', rtl: false },
  { code: 'ru', name: 'Russian', native: 'Русский', rtl: false },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', rtl: false },
  { code: 'so', name: 'Somali', native: 'Soomaali', rtl: false },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', rtl: false },
] as const

export type LangCode = (typeof LANGUAGES)[number]['code']

export const isLangCode = (c: string): c is LangCode => LANGUAGES.some((l) => l.code === c)

export function isRtl(code: string): boolean {
  return LANGUAGES.find((l) => l.code === code)?.rtl ?? false
}
