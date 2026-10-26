'use client'

import { useEffect, useState } from 'react'
import BarakaHabits from '@/components/BarakaHabits'
import DuaFinder from '@/components/DuaFinder'

const CATEGORIES = [
  { id: 'morning-dhikr', label: 'Morning' },
  { id: 'evening-dhikr', label: 'Evening' },
  { id: 'dhikr-after-salah', label: 'After Salah' },
  { id: 'daily-dua', label: 'Daily' },
  { id: 'selected-dua', label: 'Selected' },
  { id: 'baraka', label: '✨ Baraka' },
]

type Dua = {
  title: string
  arabic: string
  latin?: string
  translation?: string
  notes?: string | null
  fawaid?: string | null
  benefits?: string | null
  source?: string | null
}

export default function DuasPage() {
  const [category, setCategory] = useState(CATEGORIES[0].id)
  const [items, setItems] = useState<Dua[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (category === 'baraka') {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/duas?category=${category}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (!d.items) throw new Error(d.error)
        setItems(d.items)
      })
      .catch(() => !cancelled && setError('Could not load duas. Please try again.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [category])

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-4">Duas & Adhkar</h1>
      <DuaFinder />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border ${
              category === c.id ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white border-gray-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {category === 'baraka' && <BarakaHabits />}
      {category !== 'baraka' && loading && <p className="text-gray-500">Loading…</p>}
      {category !== 'baraka' && error && <p className="text-red-600">{error}</p>}

      <ul className="space-y-4">
        {category !== 'baraka' && !loading &&
          items.map((d, i) => (
            <li key={`${d.title}-${i}`} className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold mb-3">{d.title}</h2>
              <p className="text-right text-2xl leading-[2.2]" dir="rtl" lang="ar">
                {d.arabic}
              </p>
              {d.latin && <p className="text-sm text-gray-500 italic mt-2">{d.latin}</p>}
              {d.translation && <p className="mt-2 text-gray-800">{d.translation}</p>}
              {d.notes && (
                <p className="mt-2 text-sm font-semibold text-[#0F766E]">{d.notes}</p>
              )}
              {(d.fawaid || d.benefits) && (
                <p className="mt-2 text-sm text-gray-600">{d.fawaid || d.benefits}</p>
              )}
              {d.source && <p className="mt-2 text-xs font-bold text-gold">{d.source}</p>}
            </li>
          ))}
      </ul>
    </div>
  )
}
