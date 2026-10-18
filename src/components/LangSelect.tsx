'use client'

import { LANGUAGES, useLang, type LangCode } from '@/lib/languages'

export default function LangSelect({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang()
  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={(e) => setLang(e.target.value as LangCode)}
      className={`px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm ${className}`}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.native}
          {l.native !== l.name ? ` (${l.name})` : ''}
        </option>
      ))}
    </select>
  )
}
