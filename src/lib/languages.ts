'use client'

import { useStored } from './storage'
import { isLangCode, type LangCode } from './language-list'

export { LANGUAGES, isLangCode, isRtl, type LangCode } from './language-list'

// The reader's preferred language for Quran translations, hadith and AI answers.
export function useLang() {
  const [lang, setLang, ready] = useStored<LangCode>('deen:lang', 'en')
  return { lang: isLangCode(lang) ? lang : 'en', setLang, ready }
}
