'use client'

import { useEffect, useMemo, useState } from 'react'
import { HadithCard, VerseChips } from '@/components/HadithCard'
import { ReadAloudBar, useReadAloud, type Para } from '@/components/ReadAloud'
import { useLang } from '@/lib/languages'
import { GROUPS, RITUALS, type Ritual } from '@/lib/rituals'

function RitualCard({ r, open }: { r: Ritual; open: boolean }) {
  const { lang } = useLang()
  const paras = useMemo<Para[]>(() => [{ text: r.title }, { text: r.summary }, { text: 'When: ' + r.when }, ...r.steps.map((s, i) => ({ text: `Step ${i + 1}. ${s}` })), ...(r.notes ?? []).map((n) => ({ text: 'Note. ' + n }))], [r])
  const reader = useReadAloud(paras, lang)
  return (
    <details id={r.id} open={open} className="rounded-2xl border border-gray-200 bg-white p-4 scroll-mt-20" data-testid="ritual">
      <summary className="cursor-pointer font-bold">
        <span className="mr-2">{r.icon}</span>
        {r.title} <span dir="rtl" lang="ar" className="font-arabic text-gray-500 font-normal text-base">· {r.titleAr}</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm text-gray-800">
        <p>{r.summary}</p>
        <p><strong>When:</strong> {r.when}</p>
        <ReadAloudBar reader={reader} label="Listen" />
        <ol className="list-decimal pl-5 space-y-1.5">
          {r.steps.map((s, i) => (
            <li key={i} className={reader.active === i + 3 ? 'bg-teal-50 rounded' : ''}>{s}</li>
          ))}
        </ol>
        {r.notes && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-900 space-y-1">
            <p className="text-xs font-bold">Good to know</p>
            {r.notes.map((n, i) => <p key={i} className="text-xs">{n}</p>)}
          </div>
        )}
        <VerseChips refs={r.quran} />
        <div className="space-y-2">
          {r.hadith.map((h) => (
            <HadithCard key={`${h.book}${h.number}`} book={h.book} number={h.number} />
          ))}
        </div>
      </div>
    </details>
  )
}

export default function RitualsPage() {
  const [hash, setHash] = useState('')
  useEffect(() => {
    const f = () => setHash(location.hash.slice(1))
    f()
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = RITUALS.filter((r) => !needle || `${r.title} ${r.titleAr} ${r.summary}`.toLowerCase().includes(needle))

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">Rituals &amp; special prayers</h1>
        <p className="text-sm text-gray-600 mt-1">Istikharah, the prayer for rain, the eclipse prayer, the funeral prayer, Eid and more: when each is done, how, and the hadith it comes from. You can listen to each one.</p>
        <p className="text-xs text-amber-700 mt-1">These are summaries of what scholars widely agree on, and the notes show where the schools differ. This is not a fatwa; ask a qualified scholar about your own situation.</p>
      </header>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. rain, funeral, travel" aria-label="Search rituals" className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm" />
      {GROUPS.map((g) => {
        const list = shown.filter((r) => r.group === g)
        if (!list.length) return null
        return (
          <section key={g} aria-label={g} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#0F766E]">{g}</h2>
            {list.map((r) => (
              <RitualCard key={r.id} r={r} open={hash === r.id} />
            ))}
          </section>
        )
      })}
      {shown.length === 0 && <p className="text-gray-600">Nothing matches. Try another word.</p>}
    </div>
  )
}
