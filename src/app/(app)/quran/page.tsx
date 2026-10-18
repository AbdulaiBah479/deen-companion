'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useStored } from '@/lib/storage'
import { useSurahData } from '@/lib/surah-list'

type Tab = 'surah' | 'juz' | 'page' | 'saved'

export default function QuranPage() {
  const router = useRouter()
  const { surahs, juz, loading } = useSurahData()
  const [tab, setTab] = useState<Tab>('surah')
  const [query, setQuery] = useState('')
  const [pageInput, setPageInput] = useState('')
  const [lastRead] = useStored<{ surah: number; verse: number } | null>('deen:lastRead', null)
  const [bookmarks, setBookmarks] = useStored<string[]>('deen:bookmarks', [])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? surahs.filter((s) => s.name_simple.toLowerCase().includes(q) || s.translated_name.name.toLowerCase().includes(q) || s.name_arabic.includes(query.trim()) || String(s.id) === q)
    : surahs
  const last = lastRead ? surahs.find((s) => s.id === lastRead.surah) : null

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`flex-1 py-2 text-sm font-semibold rounded-full ${tab === id ? 'bg-[#0F766E] text-white' : 'text-gray-600'}`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">The Noble Quran</h1>
      <p className="text-gray-500 text-sm mb-4">114 surahs · 30 juz · 604 pages · Arabic, translations and recitation</p>

      {last && lastRead && (
        <Link
          href={`/quran/${lastRead.surah}`}
          className="flex items-center justify-between rounded-2xl p-4 mb-4 text-white hero-teal"
        >
          <span>
            <span className="block text-xs opacity-80">Continue reading</span>
            <span className="block text-lg font-bold">{last.name_simple}</span>
          </span>
          <span className="text-3xl" dir="rtl" lang="ar">
            {last.name_arabic}
          </span>
        </Link>
      )}

      <div className="flex bg-gray-100 rounded-full p-1 mb-4" role="group" aria-label="Browse by">
        {tabBtn('surah', 'Surah')}
        {tabBtn('juz', 'Juz')}
        {tabBtn('page', 'Page')}
        {tabBtn('saved', `Saved${bookmarks.length ? ` (${bookmarks.length})` : ''}`)}
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && surahs.length === 0 && <p className="text-red-600">Could not load the surah list. Check your connection and refresh.</p>}

      {tab === 'surah' && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search surah by name, meaning, Arabic or number…"
            aria-label="Search surah"
            className="w-full mb-4 px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[#0F766E]"
          />
          <ul className="space-y-2">
            {filtered.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/quran/${s.id}`}
                  className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#0F766E] transition-colors"
                >
                  <span className="w-9 h-9 rounded-lg rotate-45 bg-[#0F766E]/10 text-[#0F766E] font-bold flex items-center justify-center text-sm">
                    <span className="-rotate-45">{s.id}</span>
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold">{s.name_simple}</span>
                    <span className="block text-xs text-gray-500">
                      {s.translated_name.name} · {s.verses_count} verses · {s.revelation_place === 'makkah' ? 'Meccan' : 'Medinan'}
                    </span>
                  </span>
                  <span className="text-xl" dir="rtl" lang="ar">
                    {s.name_arabic}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'juz' && (
        <ul className="grid grid-cols-2 gap-3">
          {juz.map((j) => (
            <li key={j.juz}>
              <Link href={`/quran/page/${j.page}`} className="block bg-white border border-gray-200 rounded-xl p-3 hover:border-[#0F766E]">
                <span className="block text-xs text-[#0F766E] font-bold">Juz {j.juz}</span>
                <span className="block text-xl" dir="rtl" lang="ar">
                  {j.surahArabic}
                </span>
                <span className="block text-xs text-gray-500">
                  {j.surahName} {j.surah}:{j.verse} · p.{j.page}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tab === 'page' && (
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(pageInput)
              if (Number.isInteger(n) && n >= 1 && n <= 604) router.push(`/quran/page/${n}`)
            }}
            className="flex gap-2 mb-4"
          >
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              inputMode="numeric"
              placeholder="Page 1–604"
              aria-label="Page number"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white"
            />
            <button className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">Open</button>
          </form>
          <p className="text-sm text-gray-500 mb-2">The Madani mushaf, page by page. Jump to the start of a juz:</p>
          <div className="grid grid-cols-5 gap-2">
            {juz.map((j) => (
              <Link key={j.juz} href={`/quran/page/${j.page}`} className="text-center py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold hover:border-[#0F766E]">
                {j.juz}
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'saved' && (
        <div>
          {bookmarks.length === 0 && <p className="text-gray-500 text-sm">No saved verses yet. Tap ☆ on a verse to save it.</p>}
          <ul className="space-y-2">
            {bookmarks.map((key) => {
              const [s, v] = key.split(':').map(Number)
              const info = surahs.find((x) => x.id === s)
              return (
                <li key={key} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <Link href={`/quran/${s}#v${v}`} className="flex-1">
                    <span className="block font-bold">{info?.name_simple ?? `Surah ${s}`}</span>
                    <span className="block text-xs text-gray-500">Verse {key}</span>
                  </Link>
                  <button onClick={() => setBookmarks((b) => b.filter((k) => k !== key))} aria-label={`Remove ${key}`} className="text-gray-500 hover:text-red-600">
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
