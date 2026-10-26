'use client'

import Link from 'next/link'
import { useState } from 'react'

const BOOKS = { bukhari: 'Sahih al-Bukhari', muslim: 'Sahih Muslim' } as const

// One hadith as evidence: the English text (from the bundled data), a button for the Arabic, and a link to the hadith browser.
export function HadithCard({ book, number }: { book: 'bukhari' | 'muslim'; number: number }) {
  const [en, setEn] = useState<string | null | undefined>(undefined)
  const [ar, setAr] = useState<string | null | undefined>(undefined)
  const [open, setOpen] = useState(false)

  async function load(l: string, set: (t: string | null) => void) {
    try {
      const r = await fetch(`/api/hadith?book=${book}&number=${number}&lang=${l}`)
      const d = await r.json()
      set(r.ok ? d.hadith?.text ?? null : null)
    } catch {
      set(null)
    }
  }
  const toggle = () => {
    setOpen((o) => !o)
    if (en === undefined) load('en', setEn)
  }
  const showArabic = () => {
    if (ar === undefined) load('ar', setAr)
    else setAr(undefined)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm" data-testid="hadith-card">
      <button onClick={toggle} aria-expanded={open} className="w-full text-left font-semibold text-[#7a5c00]">
        {BOOKS[book]} {number} {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {en === undefined && <p className="text-gray-500">Loading…</p>}
          {en === null && <p className="text-gray-600">This hadith could not be loaded right now.</p>}
          {typeof en === 'string' && <p className="text-gray-800 whitespace-pre-line">{en}</p>}
          {typeof en === 'string' && (
            <div className="flex gap-3 text-xs">
              <button onClick={showArabic} className="underline text-[#0F766E]">{ar === undefined ? 'Show the Arabic' : 'Hide the Arabic'}</button>
              <Link href={`/hadith?book=${book}&number=${number}`} className="underline text-[#0F766E]">Open in the hadith section</Link>
            </div>
          )}
          {typeof ar === 'string' && <p dir="rtl" lang="ar" className="font-arabic text-lg leading-loose text-gray-900">{ar}</p>}
          {ar === null && <p className="text-xs text-gray-500">The Arabic text could not be loaded right now.</p>}
        </div>
      )}
    </div>
  )
}

export function VerseChips({ refs }: { refs?: string[] }) {
  if (!refs?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {refs.map((r) => {
        const [s, a] = r.split(/[:-]/)
        return (
          <Link key={r} href={`/tafsir/${s}/${a}`} className="text-xs font-semibold px-2 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E]">
            Quran {r}
          </Link>
        )
      })}
    </div>
  )
}
