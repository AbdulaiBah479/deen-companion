'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CAUSE_CATEGORIES, ZAKAT_FIT_LABEL, ZAKAT_RECIPIENTS, type Cause } from '@/lib/causes-shared'

const FIT_STYLE = { yes: 'bg-green-100 text-green-800', depends: 'bg-amber-100 text-amber-800', no: 'bg-gray-100 text-gray-700' } as const

// "Where your zakat can go": real causes people give to (Gaza relief, orphans, food, water…), who each helps, and whether it counts as
// zakat or sadaqah. The app never touches money — every link opens the charity's own website.
export default function ZakatCauses() {
  const [causes, setCauses] = useState<Cause[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [zakatOnly, setZakatOnly] = useState(false)

  useEffect(() => {
    let off = false
    fetch('/api/causes')
      .then((r) => r.json())
      .then((d) => !off && setCauses(d.causes ?? []))
      .catch(() => !off && setFailed(true))
    return () => {
      off = true
    }
  }, [])

  const shown = (causes ?? []).filter((c) => (filter === 'all' || c.category === filter) && (!zakatOnly || c.zakat !== 'no'))
  const used = CAUSE_CATEGORIES.filter((cat) => (causes ?? []).some((c) => c.category === cat.id))

  return (
    <section id="causes" className="mt-8" aria-labelledby="h-causes">
      <h2 id="h-causes" className="text-xl font-black text-[#0F766E]">
        Where your zakat can go
      </h2>
      <p className="text-sm text-gray-600 mt-1">Real causes people are giving to right now. Each opens the charity’s own website — this app never handles your money.</p>

      <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Filter causes">
        <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'} className={`px-3 py-1.5 rounded-full text-sm border ${filter === 'all' ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'border-gray-300 bg-white'}`}>
          All
        </button>
        {used.map((cat) => (
          <button key={cat.id} onClick={() => setFilter(cat.id)} aria-pressed={filter === cat.id} className={`px-3 py-1.5 rounded-full text-sm border ${filter === cat.id ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'border-gray-300 bg-white'}`}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm mt-3">
        <input type="checkbox" checked={zakatOnly} onChange={(e) => setZakatOnly(e.target.checked)} />
        Only show causes that can receive zakat
      </label>

      <div className="mt-3 space-y-3">
        {causes === null && !failed && (
          <div className="space-y-3" aria-label="Loading causes">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}
        {failed && <p className="text-sm text-red-600">Could not load the causes. Check your connection and try again.</p>}
        {causes && shown.length === 0 && <p className="text-sm text-gray-600">Nothing matches that filter.</p>}
        {shown.map((c) => {
          const cat = CAUSE_CATEGORIES.find((x) => x.id === c.category)
          return (
            <article key={c.id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">
                  <span aria-hidden="true">{cat?.icon} </span>
                  {c.title}
                </h3>
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full ${FIT_STYLE[c.zakat]}`}>{ZAKAT_FIT_LABEL[c.zakat]}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{c.summary}</p>
              {c.zakatNote && (
                <details className="mt-2 text-xs text-gray-600">
                  <summary className="cursor-pointer font-semibold">Is this zakat?</summary>
                  <p className="mt-1">{c.zakatNote}</p>
                </details>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {c.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold">
                    Give via {l.name} ↗
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Link wrong, or something looks suspicious?{' '}
                <Link href={`/report?cat=abuse&ref=${encodeURIComponent('Zakat cause: ' + c.title)}&from=%2Fzakat`} className="underline">
                  Tell us
                </Link>
              </p>
            </article>
          )
        })}
      </div>

      <p className="text-xs text-gray-500 mt-3">Before you give: check the organisation is genuine (a registered charity number, public accounts), and ask whether it runs a separate zakat fund. We list organisations as suggestions, not endorsements.</p>

      <details className="mt-5 bg-white border border-gray-200 rounded-2xl p-4">
        <summary className="cursor-pointer font-bold">Who can receive zakat? (the eight categories, Qur’an 9:60)</summary>
        <ul className="mt-3 space-y-2 text-sm">
          {ZAKAT_RECIPIENTS.map((r) => (
            <li key={r.name}>
              <span className="font-semibold">{r.name}</span> <span className="text-gray-500" lang="ar" dir="rtl">{r.arabic}</span>
              <span className="block text-gray-600">{r.meaning}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-3">“Zakāh expenditures are only for the poor and for the needy and for those employed for it and for bringing hearts together [for Islām] and for freeing captives [or slaves] and for those in debt and for the cause of Allāh and for the [stranded] traveler - an obligation [imposed] by Allāh. And Allāh is Knowing and Wise.” (9:60)</p>
      </details>
    </section>
  )
}
