'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { dailyIndex } from '@/lib/daily'
import { HERITAGE, HERITAGE_CATEGORIES, type Heritage, type HeritageCategory } from '@/lib/heritage'
import { localDateKey, useStored } from '@/lib/storage'

const century = (y: number) => {
  const c = Math.floor((y - 1) / 100) + 1
  const suffix = c % 100 >= 11 && c % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[c % 10] || 'th'
  return `${c}${suffix} century`
}

export default function HeritagePage() {
  const [cat, setCat] = useState<HeritageCategory | 'all'>('all')
  const [view, setView] = useState<'list' | 'timeline'>('list')
  const [q, setQ] = useState('')
  const [read] = useStored<string[]>('deen:heritage-read', [])
  const [today, setToday] = useState<Heritage | null>(null)

  useEffect(() => {
    setToday(HERITAGE[dailyIndex(localDateKey(), HERITAGE.length, 3)])
  }, [])

  const needle = q.trim().toLowerCase()
  const list = useMemo(() => {
    const l = HERITAGE.filter((h) => (cat === 'all' || h.cat === cat) && (!needle || `${h.name} ${h.region} ${h.years}`.toLowerCase().includes(needle)))
    return view === 'timeline' ? [...l].sort((a, b) => a.start - b.start) : l
  }, [cat, needle, view])

  const card = (h: Heritage) => (
    <li key={h.id}>
      <Link href={`/heritage/${h.id}`} className="flex gap-3 items-center bg-white border border-gray-200 rounded-2xl p-3 hover:border-[#0F766E]" data-heritage={h.id}>
        <span className="text-3xl w-10 text-center">{h.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold leading-tight">{h.name}</span>
          <span className="block text-xs text-gray-500">
            {h.years} · {h.region}
          </span>
        </span>
        {read.includes(h.id) && <span className="text-[#0F766E] text-sm" aria-label="Read">✓</span>}
      </Link>
    </li>
  )

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Great Muslims in History</h1>
      <p className="text-gray-500 text-sm mb-4">
        {HERITAGE.length} short stories of rulers, defenders, scientists, scholars, explorers and women who shaped the world — so we know where we come from. Read{' '}
        {read.length > 0 ? `${read.length} of ${HERITAGE.length}` : 'one'}, then{' '}
        <Link href="/quiz" className="text-[#0F766E] underline">
          test yourself
        </Link>
        .
      </p>

      {today && !needle && cat === 'all' && (
        <Link href={`/heritage/${today.id}`} className="block rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#134E4A] text-white p-5 mb-4" data-testid="heritage-today">
          <span className="text-xs uppercase tracking-widest text-[#E6C86A]">Meet someone today</span>
          <span className="block text-xl font-bold mt-1">
            {today.icon} {today.name}
          </span>
          <span className="block text-sm opacity-90 mt-1">
            {today.years} · {today.region}
          </span>
          <span className="block text-sm font-semibold mt-2 text-[#E6C86A]">Read the story →</span>
        </Link>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search — Salahuddin, algebra, Córdoba…"
        aria-label="Search history"
        className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white mb-3"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2" role="tablist" aria-label="Groups" style={{ scrollbarWidth: 'none' }}>
        {[{ id: 'all', title: 'Everyone', icon: '✨' }, ...HERITAGE_CATEGORIES].map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id as HeritageCategory | 'all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${cat === c.id ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            {c.icon} {c.title}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {(['list', 'timeline'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${view === v ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {v === 'list' ? 'By group' : 'Timeline'}
          </button>
        ))}
      </div>

      {view === 'timeline' ? (
        <ol className="border-l-2 border-[#0F766E]/30 ml-2 space-y-3" data-testid="heritage-timeline">
          {list.map((h, i) => (
            <li key={h.id} className="pl-4 relative">
              <span className="absolute -left-[7px] top-4 w-3 h-3 rounded-full bg-[#0F766E]" />
              {(i === 0 || century(list[i - 1].start) !== century(h.start)) && <div className="text-xs font-bold text-gold uppercase tracking-wide mb-1">{century(h.start)}</div>}
              <ul>{card(h)}</ul>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-2" data-testid="heritage-list">
          {list.map(card)}
        </ul>
      )}
      {list.length === 0 && <p className="text-gray-500 text-center py-8">No one matches “{q}”.</p>}
    </div>
  )
}
