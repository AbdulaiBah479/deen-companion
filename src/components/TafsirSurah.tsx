'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadSurahData, type SurahInfo } from '@/lib/surah-list'

// One surah in the tafsir section: who/where/how many, and a button for every verse to study it.
export default function TafsirSurah({ surahNum }: { surahNum: number }) {
  const [info, setInfo] = useState<SurahInfo | null | undefined>(undefined)
  useEffect(() => {
    loadSurahData().then((d) => setInfo(d.surahs.find((s) => s.id === surahNum) ?? null))
  }, [surahNum])

  if (info === undefined) return <p className="text-gray-500">Loading…</p>
  if (!info) {
    return (
      <p className="text-gray-600">
        There is no such surah. <Link href="/tafsir" className="underline text-[#0F766E]">Back to the list</Link>
      </p>
    )
  }
  return (
    <div className="space-y-4">
      <Link href="/tafsir" className="text-sm text-[#0F766E] underline">← All surahs</Link>
      <header className="text-center">
        <p dir="rtl" className="font-arabic text-4xl">{info.name_arabic}</p>
        <h1 className="text-2xl font-black text-[#0F766E] mt-1">
          {info.id}. {info.name_simple}
        </h1>
        <p className="text-sm text-gray-600">
          {info.translated_name.name} · {info.verses_count} verses · revealed in {info.revelation_place === 'madinah' ? 'Madinah' : 'Makkah'}
        </p>
      </header>
      <p className="text-sm text-gray-600">Choose a verse to study it.</p>
      <ul className="grid grid-cols-6 sm:grid-cols-10 gap-2" data-testid="tafsir-verses">
        {Array.from({ length: info.verses_count }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link href={`/tafsir/${info.id}/${n}`} className="block text-center py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:border-[#0F766E]" aria-label={`Study verse ${n}`}>
              {n}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">
        Prefer to read the whole surah? <Link href={`/quran/${info.id}`} className="underline text-[#0F766E]">Open it in the reader</Link>.
      </p>
    </div>
  )
}
