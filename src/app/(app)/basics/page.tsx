'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { HadithCard, VerseChips } from '@/components/HadithCard'
import { ReadAloudBar, useReadAloud, type Para } from '@/components/ReadAloud'
import { GLOSSARY, SECTIONS, type Section } from '@/lib/basics'
import { useLang } from '@/lib/languages'

function SectionCard({ s, open }: { s: Section; open: boolean }) {
  const { lang } = useLang()
  const paras = useMemo<Para[]>(
    () => [
      { text: s.title },
      { text: s.intro },
      ...(s.steps ?? []).flatMap((st, i) => [{ text: `Step ${i + 1}. ${st.title}. ${st.body}` }, ...(st.say ? [{ text: `You say: ${st.say.translit}. It means: ${st.say.meaning}.` }] : [])]),
      ...(s.items ?? []).map((it) => ({ text: `${it.title}. ${it.body}` })),
      ...(s.notes ?? []).map((n) => ({ text: 'Note. ' + n })),
    ],
    [s]
  )
  const reader = useReadAloud(paras, lang)
  return (
    <details id={s.id} open={open} className="rounded-2xl border border-gray-200 bg-white p-4 scroll-mt-20" data-testid="basics-section">
      <summary className="cursor-pointer font-bold">
        <span className="mr-2">{s.icon}</span>
        {s.title} <span dir="rtl" lang="ar" className="font-arabic text-gray-500 font-normal text-base">· {s.titleAr}</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm text-gray-800">
        <p>{s.intro}</p>
        <ReadAloudBar reader={reader} label="Listen" />
        {s.steps && (
          <ol className="space-y-3">
            {s.steps.map((st, i) => (
              <li key={i} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <p className="font-semibold"><span className="text-[#0F766E]">{i + 1}.</span> {st.title}</p>
                <p className="mt-1">{st.body}</p>
                {st.say && (
                  <p className="mt-2 rounded-lg bg-teal-50 border border-teal-200 p-2">
                    <span className="block font-semibold text-teal-900">{st.say.translit}</span>
                    <span className="block text-xs text-gray-600">{st.say.meaning}</span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        {s.items && (
          <ul className="space-y-2">
            {s.items.map((it) => (
              <li key={it.title} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <p className="font-semibold">{it.title}</p>
                <p className="mt-0.5">{it.body}</p>
                {it.href && <Link href={it.href} className="text-xs underline text-[#0F766E]">Open in the app →</Link>}
              </li>
            ))}
          </ul>
        )}
        {s.notes && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-900 space-y-1">
            <p className="text-xs font-bold">Good to know</p>
            {s.notes.map((n, i) => <p key={i} className="text-xs">{n}</p>)}
          </div>
        )}
        <VerseChips refs={s.quran} />
        <div className="space-y-2">
          {s.hadith.map((h) => <HadithCard key={`${h.book}${h.number}`} book={h.book} number={h.number} />)}
        </div>
      </div>
    </details>
  )
}

export default function BasicsPage() {
  const [hash, setHash] = useState('')
  useEffect(() => {
    const f = () => setHash(location.hash.slice(1))
    f()
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">Islam basics</h1>
        <p className="text-sm text-gray-600 mt-1">The foundations in plain steps: the pillars, the articles of faith, how to pray, purification, fasting, daily manners, and the words scholars use. Works without internet once saved from Settings → Offline packs.</p>
        <p className="text-xs text-amber-700 mt-1">This is a learning aid, not a fatwa. Where the schools differ, the notes say so. For your own situation, ask a qualified scholar.</p>
      </header>
      {SECTIONS.map((s) => <SectionCard key={s.id} s={s} open={hash === s.id} />)}
      <details className="rounded-2xl border border-gray-200 bg-white p-4" data-testid="glossary">
        <summary className="cursor-pointer font-bold">📖 Words you will hear</summary>
        <dl className="mt-3 space-y-2 text-sm">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="font-semibold">{g.term} <span dir="rtl" lang="ar" className="font-arabic text-gray-500 font-normal">{g.ar}</span></dt>
              <dd className="text-gray-700">{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </details>
      <p className="text-xs text-gray-500">More: <Link className="underline text-[#0F766E]" href="/rituals">Rituals & special prayers</Link> · <Link className="underline text-[#0F766E]" href="/guides">Hajj & Umrah</Link> · <Link className="underline text-[#0F766E]" href="/duas">Duas & adhkar</Link></p>
    </div>
  )
}
