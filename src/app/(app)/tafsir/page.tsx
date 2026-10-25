'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { loadSurahData, type SurahInfo } from '@/lib/surah-list'

export default function TafsirIndex() {
  const [surahs, setSurahs] = useState<SurahInfo[]>([])
  const [q, setQ] = useState('')
  useEffect(() => {
    loadSurahData().then((d) => setSurahs(d.surahs))
  }, [])
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? surahs.filter((s) => s.name_simple.toLowerCase().includes(t) || s.translated_name.name.toLowerCase().includes(t) || String(s.id) === t || s.name_arabic.includes(t)) : surahs
  }, [surahs, q])

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">Tafsir study</h1>
        <p className="text-sm text-gray-600 mt-1">
          Understand any verse: a plain-language explanation, the classical commentaries (Ibn Kathir, Sa‘di, Qurtubi, Tabari and more), the other verses it connects to, and a voice to listen instead of reading.
        </p>
      </header>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a surah (name or number)"
        aria-label="Find a surah"
        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
      />
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="tafsir-surahs">
        {shown.map((s) => (
          <li key={s.id}>
            <Link href={`/tafsir/${s.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-[#0F766E]">
              <span className="w-8 h-8 rounded-full bg-[#0F766E]/10 text-[#0F766E] text-sm font-bold flex items-center justify-center shrink-0">{s.id}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">{s.name_simple}</span>
                <span className="block text-xs text-gray-500 truncate">
                  {s.translated_name.name} · {s.verses_count} verses
                </span>
              </span>
              <span dir="rtl" className="font-arabic text-lg">{s.name_arabic}</span>
            </Link>
          </li>
        ))}
      </ul>
      {surahs.length === 0 && <p className="text-gray-500 text-sm">Loading…</p>}
    </div>
  )
}
