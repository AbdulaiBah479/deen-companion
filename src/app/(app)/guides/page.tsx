'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ReadAloudBar, useReadAloud, type Para } from '@/components/ReadAloud'
import { useLang } from '@/lib/languages'
import { useStored } from '@/lib/storage'
import { GUIDES, SEERAH, type HadithRef, type QuranRef, type Step } from '@/lib/guides-content'

type Tab = 'umrah' | 'hajj' | 'seerah'

const quranHref = (r: QuranRef) => `/quran/${r.ref.split(':')[0]}#v${r.ref.split(':')[1]}`
const hadithHref = (h: HadithRef) => `/hadith?book=${h.book}&number=${h.number}`

function StepCard({ step, open, done, current, onToggle, number }: { step: Step; open?: boolean; done?: boolean; current?: boolean; onToggle?: () => void; number?: number }) {
  const { lang } = useLang()
  const paras = useMemo<Para[]>(
    () => [{ text: step.title }, { text: step.body }, ...(step.bullets ?? []).map((text) => ({ text })), ...(step.dua ? [{ text: step.dua.ar, lang: 'ar-SA' }, { text: step.dua.en }] : [])],
    [step]
  )
  const reader = useReadAloud(paras, lang)
  return (
    <details className={`bg-white border rounded-2xl p-4 ${current ? 'border-[#0F766E] ring-1 ring-[#0F766E]' : 'border-gray-200'} ${done ? 'opacity-70' : ''}`} open={open} data-testid="guide-step" data-done={done ? 'yes' : 'no'}>
      <summary className="font-bold cursor-pointer">
        {number !== undefined && <span className="inline-block w-6 text-[#0F766E]">{done ? '✓' : number}</span>}
        {step.title}
        {current && <span className="ml-2 text-xs font-semibold text-[#0F766E]">← you are here</span>}
      </summary>
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
        <ReadAloudBar reader={reader} label="Listen to this step" />
        {onToggle && (
          <button onClick={onToggle} aria-pressed={!!done} className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${done ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'border-[#0F766E] text-[#0F766E]'}`}>
            {done ? '✓ Done — tap to undo' : 'I have done this step'}
          </button>
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
  // Where you are in the Umrah or the Hajj: the steps you have marked done are remembered on this device.
  const [progress, setProgress] = useStored<Record<string, number[]>>('deen:guide-progress', {})
  const doneSet = new Set(guide ? (progress[guide.id] ?? []) : [])
  const currentIndex = guide ? guide.steps.findIndex((_, i) => !doneSet.has(i)) : -1
  const toggleStep = (i: number) => {
    if (!guide) return
    const cur = new Set(progress[guide.id] ?? [])
    if (cur.has(i)) cur.delete(i)
    else cur.add(i)
    setProgress({ ...progress, [guide.id]: [...cur].sort((a, b) => a - b) })
  }

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
          <p className="text-sm text-gray-700 mb-3">{guide.intro}</p>
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3" data-testid="guide-progress">
            <p className="text-sm font-semibold">
              {doneSet.size === 0 ? 'Mark each step as you complete it, and the app will remember where you are.' : doneSet.size === guide.steps.length ? 'All steps done. May Allah accept it from you.' : `Step ${currentIndex + 1} of ${guide.steps.length}: ${guide.steps[currentIndex].title}`}
            </p>
            <div className="h-2 rounded-full bg-gray-200 mt-2 overflow-hidden" role="progressbar" aria-valuenow={doneSet.size} aria-valuemin={0} aria-valuemax={guide.steps.length} aria-label="Progress">
              <div className="h-full bg-[#0F766E]" style={{ width: `${(doneSet.size / guide.steps.length) * 100}%` }} />
            </div>
            {doneSet.size > 0 && <button onClick={() => setProgress({ ...progress, [guide.id]: [] })} className="text-xs underline text-gray-500 mt-2">Start again</button>}
          </div>
          <div className="space-y-3">
            {guide.steps.map((s, i) => (
              <StepCard key={s.title} step={s} number={i + 1} open={i === (currentIndex >= 0 ? currentIndex : 0)} current={i === currentIndex && doneSet.size > 0} done={doneSet.has(i)} onToggle={() => toggleStep(i)} />
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
