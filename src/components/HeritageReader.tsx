'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { HERITAGE, HERITAGE_CATEGORIES, getHeritage } from '@/lib/heritage'
import { useStored } from '@/lib/storage'

export default function HeritageReader({ id }: { id: string }) {
  const h = getHeritage(id)!
  const [read, setRead, readReady] = useStored<string[]>('deen:heritage-read', [])

  // Opening a story counts as reading it.
  useEffect(() => {
    if (readReady) setRead((l) => (l.includes(id) ? l : [...l, id]))
  }, [readReady, id, setRead])

  const group = HERITAGE.filter((x) => x.cat === h.cat)
  const i = group.findIndex((x) => x.id === id)
  const prev = group[i - 1]
  const next = group[i + 1]
  const cat = HERITAGE_CATEGORIES.find((c) => c.id === h.cat)

  return (
    <article>
      <Link href="/heritage" className="text-sm text-[#0F766E] font-semibold">
        ← Great Muslims
      </Link>
      <div className="flex items-start gap-3 mt-2">
        <span className="text-5xl">{h.icon}</span>
        <div>
          <h1 className="text-2xl font-black text-[#0F766E] leading-tight">{h.name}</h1>
          <p className="text-sm text-gray-500">
            {h.years} · {h.region}
          </p>
          <p className="text-xs text-gold font-semibold uppercase tracking-wide mt-1">
            {cat?.icon} {cat?.title}
          </p>
        </div>
      </div>

      <p className="leading-relaxed text-gray-800 mt-5 text-[17px]" data-testid="heritage-story">
        {h.story}
      </p>

      <h2 className="font-bold mt-6 mb-2">Key facts</h2>
      <ul className="space-y-2">
        {h.facts.map((f) => (
          <li key={f} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-2xl bg-[#E6F4F1] p-4">
        <p className="text-xs font-bold text-[#0F766E] uppercase tracking-wide mb-1">What we can learn</p>
        <p className="font-medium text-[#134E4A]">{h.lesson}</p>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <Link href={`/library/read?title=${encodeURIComponent(h.wiki)}`} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold">
          📚 Read more in the Library
        </Link>
        <Link href="/quiz" className="px-3 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold">
          ❓ Test yourself
        </Link>
        <Link href={`/companion?q=${encodeURIComponent(`Tell me about ${h.name} and what Muslims can learn from their life`)}`} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold">
          🤖 Ask the AI companion
        </Link>
      </div>

      <p className="text-xs text-gray-500 mt-5">
        A short summary for learning, with dates as commonly cited (c. = approximately). For detail and sources, follow the Library link. {read.length} of {HERITAGE.length} stories read.
      </p>

      <nav className="flex justify-between gap-2 mt-5" aria-label="More in this group">
        {prev ? (
          <Link href={`/heritage/${prev.id}`} className="text-sm text-[#0F766E] font-semibold">
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/heritage/${next.id}`} className="text-sm text-[#0F766E] font-semibold text-right">
            {next.name} →
          </Link>
        )}
      </nav>
    </article>
  )
}
