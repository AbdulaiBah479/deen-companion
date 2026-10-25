'use client'

import Link from 'next/link'
import { useState } from 'react'
import PassageCard from '@/components/PassageCard'
import { careText, needsCare } from '@/lib/care'
import { SITUATIONS, findSituations, type Situation } from '@/lib/situations'

// "What is on your heart?" — type how you feel (or tap one), and get duas and verses for it, with audio and sources.
export default function DuaFinder() {
  const [text, setText] = useState('')
  const [shown, setShown] = useState<Situation[] | null>(null)
  const [searched, setSearched] = useState('')

  function search(e?: React.FormEvent) {
    e?.preventDefault()
    const q = text.trim()
    if (!q) return
    setSearched(q)
    setShown(needsCare(q) ? [] : findSituations(q))
  }

  const care = searched && needsCare(searched)

  return (
    <section className="mb-6 rounded-2xl border border-[#0F766E]/30 bg-[#0F766E]/5 p-4" aria-labelledby="h-find">
      <h2 id="h-find" className="font-bold text-lg text-[#0F766E]">
        What is on your heart?
      </h2>
      <p className="text-sm text-gray-600 mt-1">Tell us how you feel, or choose below — we’ll find duas and verses for it.</p>

      <form onSubmit={search} className="flex gap-2 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          aria-label="How are you feeling?"
          placeholder="e.g. I feel anxious about my exam"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 bg-white"
        />
        <button className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">Find</button>
      </form>

      <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Common situations">
        {SITUATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSearched(s.title)
              setText('')
              setShown([s])
            }}
            className="px-3 py-1.5 rounded-full border border-gray-300 bg-white text-sm hover:border-[#0F766E]"
          >
            {s.emoji} {s.title}
          </button>
        ))}
      </div>

      {care && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm whitespace-pre-wrap text-amber-900" role="status">
          {careText('en')}
          <p className="mt-2">
            <Link href="/quran/39#v53" className="underline font-semibold">Read Qur’an 39:53</Link> · <Link href="/quran/94" className="underline font-semibold">Read Surat ash-Sharh</Link>
          </p>
        </div>
      )}

      {shown && shown.length === 0 && !care && (
        <div className="mt-4 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl p-4" role="status">
          I couldn’t match “{searched}” to a ready-made dua. You can pick a situation above, or{' '}
          <Link href={`/companion?q=${encodeURIComponent('Give me an authentic dua or verse for: ' + searched)}`} className="text-[#0F766E] font-semibold underline">
            ask the AI companion
          </Link>
          .
        </div>
      )}

      {shown?.map((s) => (
        <div key={s.id} className="mt-4 space-y-3" aria-label={s.title}>
          <h3 className="font-bold">
            {s.emoji} {s.title}
          </h3>
          <p className="text-sm text-gray-700">{s.intro}</p>

          {s.duas.map((d) => (
            <article key={d.source.label} className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-right text-2xl leading-[2.1]" dir="rtl" lang="ar" style={{ fontFamily: 'var(--font-quran), serif' }}>
                {d.arabic}
              </p>
              <p className="text-sm italic text-gray-600 mt-2">{d.transliteration}</p>
              <p className="text-sm text-gray-800 mt-2">{d.meaning}</p>
              <p className="text-xs text-gray-500 mt-2">
                Source:{' '}
                {d.source.book && d.source.number ? (
                  <Link href={`/hadith?book=${d.source.book}&number=${d.source.number}`} className="underline text-[#0F766E]">
                    {d.source.label}
                  </Link>
                ) : (
                  d.source.label
                )}
              </p>
            </article>
          ))}

          {s.quran.map((q) => (
            <PassageCard key={`${q.surah}:${q.from}`} title={`Qur’an ${q.surah}:${q.from}${q.to > q.from ? '–' + q.to : ''}`} note={q.note} surah={q.surah} from={q.from} to={q.to} />
          ))}

          {s.id === 'decision' && (
            <p className="text-sm bg-white border border-gray-200 rounded-xl p-3">
              Read the istikhara supplication taught by the Prophet ﷺ:{' '}
              <Link href="/hadith?book=bukhari&number=6382" className="underline text-[#0F766E] font-semibold">
                Sahih al-Bukhari 6382
              </Link>
              .
            </p>
          )}
          {s.ruqyah && (
            <p className="text-sm bg-white border border-gray-200 rounded-xl p-3">
              <Link href="/ruqyah" className="underline text-[#0F766E] font-semibold">
                Open the Ruqyah section
              </Link>{' '}
              for the Qur’an and supplications of the Sunnah for illness and pain.
            </p>
          )}
          {(s.id === 'anxiety' || s.id === 'hardship') && (
            <p className="text-xs text-gray-600 bg-white border border-gray-200 rounded-xl p-3">
              If these feelings last, or you ever feel unsafe, please talk to a doctor, a counsellor, or someone you trust. Seeking help is part of the Sunnah.
            </p>
          )}
        </div>
      ))}
    </section>
  )
}
