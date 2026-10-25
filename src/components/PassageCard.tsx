'use client'

import { useState } from 'react'
import { useAudio } from '@/lib/audio'
import { useLang } from '@/lib/languages'

type Verse = { verse_number: number; text_uthmani: string; translations: { text: string }[] }

// A few verses with a Listen button (in the chosen reciter's voice, repeated as the Sunnah says where it gives a number)
// and a "Read the verses" fold-out showing the Arabic and the translation.
export default function PassageCard({ title, note, surah, from, to, loops = 1, footer }: { title: string; note?: string; surah: number; from: number; to: number; loops?: number; footer?: React.ReactNode }) {
  const audio = useAudio()
  const { lang } = useLang()
  const [verses, setVerses] = useState<Verse[] | null>(null)
  const [failed, setFailed] = useState(false)
  const playingThis = audio.range?.surah === surah && audio.range.from === from && audio.range.to === to

  function load() {
    if (verses || failed) return
    fetch(`/api/quran/passage?surah=${surah}&from=${from}&to=${to}&lang=${lang}`)
      .then((r) => r.json())
      .then((d) => (d.verses ? setVerses(d.verses) : setFailed(true)))
      .catch(() => setFailed(true))
  }

  return (
    <article className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <span className="text-xs text-gray-500 shrink-0">
          {surah}:{from}
          {to > from ? `–${to}` : ''}
        </span>
      </div>
      {note && <p className="text-sm text-gray-700 mt-1">{note}</p>}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          onClick={() => (playingThis && audio.playing ? audio.toggle() : audio.playRange(surah, from, to, loops))}
          className="px-3 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold"
          aria-label={`Listen to ${title}${loops > 1 ? `, ${loops} times` : ''}`}
        >
          {playingThis && audio.playing ? '⏸ Pause' : `▶ Listen${loops > 1 ? ` · ${loops} times` : ''}`}
        </button>
        {loops > 1 && <span className="text-xs text-gray-500">as the Sunnah gives it</span>}
      </div>
      <details className="mt-3" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && load()}>
        <summary className="cursor-pointer text-sm font-semibold text-[#0F766E]">Read the verses</summary>
        <div className="mt-2 space-y-3">
          {failed && <p className="text-sm text-red-600">Could not load the verses. Check your connection.</p>}
          {!verses && !failed && <p className="text-sm text-gray-500">Loading…</p>}
          {verses?.map((v) => (
            <div key={v.verse_number}>
              <p className="text-right text-xl leading-[2.1]" dir="rtl" lang="ar" style={{ fontFamily: 'var(--font-quran), serif' }}>
                {v.text_uthmani}
              </p>
              <p className="text-sm text-gray-700">{v.translations[0]?.text}</p>
            </div>
          ))}
        </div>
      </details>
      {footer}
    </article>
  )
}
