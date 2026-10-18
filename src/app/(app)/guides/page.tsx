'use client'

import Link from 'next/link'
import { useState } from 'react'
import { GUIDES, SEERAH, type HadithRef, type QuranRef, type Step } from '@/lib/guides-content'

type Tab = 'umrah' | 'hajj' | 'seerah'

const quranHref = (r: QuranRef) => `/quran/${r.ref.split(':')[0]}#v${r.ref.split(':')[1]}`
const hadithHref = (h: HadithRef) => `/hadith?book=${h.book}&number=${h.number}`

function StepCard({ step, open }: { step: Step; open?: boolean }) {
  return (
    <details className="bg-white border border-gray-200 rounded-2xl p-4" open={open}>
      <summary className="font-bold cursor-pointer">{step.title}</summary>
      <div className="mt-3 space-y-3 text-sm text-gray-700">
        <p>{step.body}</p>
        {step.bullets && (
          <ul className="list-disc pl-5 space-y-1">
            {step.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        {step.dua && (
          <div className="bg-[#0F766E]/5 border border-[#0F766E]/20 rounded-xl p-3">
            <p className="text-right text-xl leading-[2.2]" dir="rtl" lang="ar">
              {step.dua.ar}
            </p>
            <p className="text-xs text-gray-600 mt-1">{step.dua.en}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {step.quran?.map((q) => (
            <Link key={q.ref} href={quranHref(q)} className="text-xs font-semibold px-2 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E]">
              Quran {q.ref}
              {q.label ? ` — ${q.label}` : ''}
            </Link>
          ))}
          {step.hadith?.map((h) => (
            <Link key={h.number} href={hadithHref(h)} className="text-xs font-semibold px-2 py-1 rounded-full bg-[#D4AF37]/20 text-[#7a5c00]">
              {h.label}
            </Link>
          ))}
        </div>
      </div>
    </details>
  )
}

export default function GuidesPage() {
  const [tab, setTab] = useState<Tab>('umrah')
  const guide = GUIDES.find((g) => g.id === tab)

  const tabBtn = (id: Tab, label: string) => (
    <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`flex-1 py-2 text-sm font-semibold rounded-full ${tab === id ? 'bg-[#0F766E] text-white' : 'text-gray-600'}`}>
      {label}
    </button>
  )

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">🕋 Hajj, Umrah &amp; Seerah</h1>
      <p className="text-gray-500 text-sm mb-4">Step-by-step guides and the life of the Prophet ﷺ in a timeline.</p>

      <div className="flex bg-gray-100 rounded-full p-1 mb-4" role="group" aria-label="Guide">
        {tabBtn('umrah', 'Umrah')}
        {tabBtn('hajj', 'Hajj')}
        {tabBtn('seerah', 'Seerah')}
      </div>

      {guide && (
        <>
          <p className="text-sm text-gray-700 mb-4">{guide.intro}</p>
          <div className="space-y-3">
            {guide.steps.map((s, i) => (
              <StepCard key={s.title} step={s} open={i === 0} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-5">
            These are summaries of widely agreed steps. Which acts are obligatory versus recommended differs between schools — travel with an accredited group and ask a qualified scholar.
          </p>
        </>
      )}

      {tab === 'seerah' && (
        <>
          <p className="text-sm text-gray-700 mb-4">Key moments in the life of the Prophet Muhammad ﷺ. Dates marked “c.” are approximate.</p>
          <ol className="relative border-l-2 border-[#D4AF37]/60 ml-3 space-y-5" aria-label="Seerah timeline">
            {SEERAH.map((e) => (
              <li key={e.title} className="ml-5" data-seerah>
                <span className="absolute -left-[9px] mt-1 w-4 h-4 rounded-full bg-[#0F766E] border-2 border-white" aria-hidden="true" />
                <div className="text-xs font-bold text-gold uppercase tracking-wide">
                  {e.year}
                  {e.ah ? ` · ${e.ah}` : ''}
                </div>
                <h3 className="font-bold">{e.title}</h3>
                <p className="text-sm text-gray-700">{e.body}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {e.quran?.map((q) => (
                    <Link key={q.ref} href={quranHref(q)} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0F766E]/10 text-[#0F766E]">
                      Quran {q.ref}
                      {q.label ? ` — ${q.label}` : ''}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
