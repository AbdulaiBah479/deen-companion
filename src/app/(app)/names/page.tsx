'use client'

import { useEffect, useState } from 'react'

type Name = { number: number; arabic: string; transliteration: string; meaning: string }

export default function NamesPage() {
  const [names, setNames] = useState<Name[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/names')
      .then((r) => r.json())
      .then((d) => {
        if (!d.names) throw new Error()
        setNames(d.names)
      })
      .catch(() => setError('Could not load the names. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const q = query.trim().toLowerCase()
  const shown = q
    ? names.filter((n) => n.transliteration.toLowerCase().includes(q) || n.meaning.toLowerCase().includes(q))
    : names

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">The 99 Names of Allah</h1>
      <p className="text-gray-500 text-sm mb-4">أسماء الله الحسنى</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or meaning…"
        aria-label="Search names"
        className="w-full mb-4 px-4 py-3 rounded-xl border border-gray-300 bg-white"
      />
      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      <ul className="grid grid-cols-2 gap-3">
        {shown.map((n) => (
          <li key={n.number} className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">{n.number}</div>
            <div className="text-2xl mb-1" dir="rtl" lang="ar">
              {n.arabic}
            </div>
            <div className="font-bold text-[#0F766E]">{n.transliteration}</div>
            <div className="text-sm text-gray-600">{n.meaning}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
