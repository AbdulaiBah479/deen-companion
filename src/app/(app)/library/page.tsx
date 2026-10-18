'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LIBRARY, LIBRARY_CATEGORIES, entryOfTheDay, type LibraryCategory, type LibraryEntry } from '@/lib/library'
import { localDateKey, useStored } from '@/lib/storage'

type Hit = { title: string; snippet: string }
type Brief = { title: string; extract: string; description: string }

const readHref = (title: string) => `/library/read?title=${encodeURIComponent(title)}`

export default function LibraryPage() {
  const [cat, setCat] = useState<LibraryCategory | 'all'>('all')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [saved] = useStored<string[]>('deen:library-saved', [])
  const [recent] = useStored<string[]>('deen:library-recent', [])
  const [daily, setDaily] = useState<{ entry: LibraryEntry; brief: Brief | null } | null>(null)

  // "Learn something new": one article a day.
  useEffect(() => {
    const entry = entryOfTheDay(localDateKey())
    setDaily({ entry, brief: null })
    let off = false
    fetch(`/api/library?title=${encodeURIComponent(entry.title)}&brief=1`)
      .then((r) => r.json())
      .then((d) => !off && d.summary && setDaily({ entry, brief: d.summary }))
      .catch(() => {})
    return () => {
      off = true
    }
  }, [])

  const needle = q.trim().toLowerCase()
  const list = useMemo(
    () => LIBRARY.filter((x) => (cat === 'all' || x.cat === cat) && (!needle || `${x.name} ${x.title}`.toLowerCase().includes(needle))),
    [cat, needle]
  )

  async function searchOnline() {
    setSearching(true)
    setSearchError('')
    try {
      const r = await fetch(`/api/library?q=${encodeURIComponent(q.trim())}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Search failed')
      setHits(d.results)
    } catch (e) {
      setHits(null)
      setSearchError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const nameOf = (title: string) => LIBRARY.find((x) => x.title === title)?.name ?? title

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Library</h1>
      <p className="text-gray-500 text-sm mb-4">
        {LIBRARY.length} topics — prophets, companions, history, holy places, scholars and beliefs. Always up to date, from the open encyclopedia, and searchable
        beyond this list.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim().length >= 2) void searchOnline()
        }}
        className="flex gap-2 mb-3"
      >
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setHits(null)
          }}
          placeholder="Search — Salahuddin, Zamzam, zakat, Andalusia…"
          aria-label="Search the library"
          className="flex-1 min-w-0 px-4 py-2 rounded-xl border border-gray-300 bg-white"
        />
        <button type="submit" disabled={q.trim().length < 2 || searching} className="px-4 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-40">
          {searching ? '…' : 'Search'}
        </button>
      </form>

      {hits && (
        <section className="mb-5" aria-label="Search results">
          <h2 className="font-bold mb-2">Results for “{q.trim()}”</h2>
          {hits.length === 0 && <p className="text-gray-500 text-sm">Nothing found. Try another spelling.</p>}
          <ul className="space-y-2">
            {hits.map((h) => (
              <li key={h.title}>
                <Link href={readHref(h.title)} className="block bg-white border border-gray-200 rounded-xl p-3 hover:border-[#0F766E]">
                  <span className="block font-semibold">{h.title}</span>
                  <span className="block text-sm text-gray-500 line-clamp-2">{h.snippet}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {searchError && <p className="text-red-600 text-sm mb-3">{searchError}</p>}

      {!needle && !hits && daily && (
        <Link href={readHref(daily.entry.title)} className="block rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#134E4A] text-white p-5 mb-5" data-testid="library-daily">
          <span className="text-xs uppercase tracking-widest text-[#E6C86A]">Learn something new today</span>
          <span className="block text-xl font-bold mt-1">{daily.entry.name}</span>
          <span className="block text-sm opacity-90 mt-1 line-clamp-3">{daily.brief?.extract ?? 'Loading…'}</span>
          <span className="block text-sm font-semibold mt-2 text-[#E6C86A]">Read more →</span>
        </Link>
      )}

      {!needle && (saved.length > 0 || recent.length > 0) && (
        <section className="mb-5">
          {saved.length > 0 && (
            <>
              <h2 className="font-bold mb-2">★ Saved</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {saved.map((t) => (
                  <Link key={t} href={readHref(t)} className="px-3 py-1 rounded-full bg-[#E6F4F1] text-[#0F766E] text-sm font-semibold">
                    {nameOf(t)}
                  </Link>
                ))}
              </div>
            </>
          )}
          {recent.length > 0 && (
            <>
              <h2 className="font-bold mb-2">Recently read</h2>
              <div className="flex flex-wrap gap-2">
                {recent.slice(0, 8).map((t) => (
                  <Link key={t} href={readHref(t)} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                    {nameOf(t)}
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" role="tablist" aria-label="Categories" style={{ scrollbarWidth: 'none' }}>
        {[{ id: 'all', title: 'All', icon: '✨' }, ...LIBRARY_CATEGORIES].map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id as LibraryCategory | 'all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${cat === c.id ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            {c.icon} {c.title}
          </button>
        ))}
      </div>
      {cat !== 'all' && <p className="text-xs text-gray-500 mb-2">{LIBRARY_CATEGORIES.find((c) => c.id === cat)?.blurb}</p>}

      <ul className="grid sm:grid-cols-2 gap-2" data-testid="library-list">
        {list.map((x) => (
          <li key={x.title}>
            <Link href={`${readHref(x.title)}`} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#0F766E]">
              <span className="flex-1 font-semibold">
                {x.name}
                {x.honorific && <span className="text-gray-500 font-normal"> {x.honorific}</span>}
              </span>
              <span className="text-xs text-gray-500">{LIBRARY_CATEGORIES.find((c) => c.id === x.cat)?.icon}</span>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className="text-gray-500 text-sm py-6 text-center">
          Not in the list. {q.trim().length >= 2 ? 'Press Search to look it up in the whole encyclopedia.' : ''}
        </p>
      )}
    </div>
  )
}
