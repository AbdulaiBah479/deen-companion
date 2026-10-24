'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAudio } from '@/lib/audio'
import { BEWARE, DUAS, QURAN_ITEMS, UNDERSTAND, UNDERSTAND_SOURCES, type QuranItem, type Source } from '@/lib/ruqyah'
import { useLang } from '@/lib/languages'

type Verse = { verse_number: number; text_uthmani: string; translations: { text: string }[] }

function Sources({ list }: { list: Source[] }) {
  return (
    <p className="text-xs text-gray-500 mt-2">
      Source:{' '}
      {list.map((s, i) => (
        <span key={s.label}>
          {i > 0 && ' · '}
          {s.book && s.number ? (
            <Link href={`/hadith?book=${s.book}&number=${s.number}`} className="underline text-[#0F766E]">
              {s.label}
            </Link>
          ) : (
            s.label
          )}
        </span>
      ))}
    </p>
  )
}

function QuranCard({ item }: { item: QuranItem }) {
  const audio = useAudio()
  const { lang } = useLang()
  const [verses, setVerses] = useState<Verse[] | null>(null)
  const [failed, setFailed] = useState(false)
  const playingThis = audio.range?.surah === item.surah && audio.range.from === item.from && audio.range.to === item.to

  function load() {
    if (verses || failed) return
    fetch(`/api/quran/passage?surah=${item.surah}&from=${item.from}&to=${item.to}&lang=${lang}`)
      .then((r) => r.json())
      .then((d) => (d.verses ? setVerses(d.verses) : setFailed(true)))
      .catch(() => setFailed(true))
  }

  return (
    <article className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold">{item.title}</h3>
        <span className="text-xs text-gray-500 shrink-0">
          {item.surah}:{item.from}
          {item.to > item.from ? `–${item.to}` : ''}
        </span>
      </div>
      <p className="text-sm text-gray-700 mt-1">{item.note}</p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          onClick={() => (playingThis && audio.playing ? audio.toggle() : audio.playRange(item.surah, item.from, item.to, item.loops))}
          className="px-3 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold"
          aria-label={`Listen to ${item.title}${item.loops > 1 ? `, ${item.loops} times` : ''}`}
        >
          {playingThis && audio.playing ? '⏸ Pause' : `▶ Listen${item.loops > 1 ? ` · ${item.loops} times` : ''}`}
        </button>
        {item.loops > 1 && <span className="text-xs text-gray-500">as the Sunnah gives it</span>}
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
      <Sources list={item.sources} />
    </article>
  )
}

export default function RuqyahPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">🛡️ Ruqyah</h1>
        <p className="text-sm text-gray-600 mt-1">Protection and healing through the Qur’an and the supplications of the Prophet ﷺ.</p>
      </header>

      <p className="text-sm rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-3">
        This is a reminder, not medical or religious advice. Healing is from Allah alone; keep seeing your doctor, and ask a qualified scholar about anything specific. Spot a mistake? <Link href="/report?cat=content&ref=Ruqyah" className="underline font-semibold">Tell us</Link>.
      </p>

      <section aria-labelledby="h-und" className="space-y-3">
        <h2 id="h-und" className="font-bold text-lg">Understanding ruqyah</h2>
        {UNDERSTAND.map((u) => (
          <div key={u.title} className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="font-semibold">{u.title}</h3>
            <p className="text-sm text-gray-700 mt-1">{u.text}</p>
          </div>
        ))}
        <Sources list={UNDERSTAND_SOURCES} />
      </section>

      <section aria-labelledby="h-quran" className="space-y-3">
        <h2 id="h-quran" className="font-bold text-lg">From the Qur’an</h2>
        <p className="text-sm text-gray-600">Press Listen to hear it in your chosen reciter’s voice. Use the 🎯 button in the player to repeat each verse, or to pause so you can recite after the reciter.</p>
        {QURAN_ITEMS.map((q) => (
          <QuranCard key={q.id} item={q} />
        ))}
      </section>

      <section aria-labelledby="h-dua" className="space-y-3">
        <h2 id="h-dua" className="font-bold text-lg">Supplications from the Sunnah</h2>
        {DUAS.map((d) => (
          <article key={d.id} className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="font-bold">{d.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{d.when}</p>
            <p className="text-right text-2xl leading-[2.1] mt-3" dir="rtl" lang="ar" style={{ fontFamily: 'var(--font-quran), serif' }}>
              {d.arabic}
            </p>
            <p className="text-sm italic text-gray-600 mt-2">{d.transliteration}</p>
            <p className="text-sm text-gray-800 mt-2">{d.meaning}</p>
            {d.how && <p className="text-xs text-gray-600 mt-2">How: {d.how}</p>}
            <Sources list={d.sources} />
          </article>
        ))}
      </section>

      <section aria-labelledby="h-daily" className="bg-gradient-to-br from-[#0F766E] to-[#15803D] text-white rounded-2xl p-4">
        <h2 id="h-daily" className="font-bold text-lg">A simple daily routine</h2>
        <ul className="text-sm mt-2 space-y-1 list-disc ps-5">
          <li>Morning and evening: Al-Ikhlas, Al-Falaq and An-Nas, three times each.</li>
          <li>At night: Ayat al-Kursi, and the last two verses of Al-Baqarah.</li>
          <li>Before sleep: recite the three surahs, blow gently into your hands and wipe over your body.</li>
        </ul>
        <Link href="/duas" className="inline-block mt-3 px-3 py-2 rounded-lg bg-white/15 border border-white/30 text-sm font-semibold">
          Morning &amp; evening adhkar →
        </Link>
      </section>

      <section aria-labelledby="h-beware" className="space-y-2">
        <h2 id="h-beware" className="font-bold text-lg">Be careful of fraud</h2>
        <ul className="space-y-2">
          {BEWARE.map((b) => (
            <li key={b} className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
              {b}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
