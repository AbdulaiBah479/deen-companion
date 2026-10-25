'use client'

import Link from 'next/link'
import PassageCard from '@/components/PassageCard'
import { BEWARE, DUAS, QURAN_ITEMS, UNDERSTAND, UNDERSTAND_SOURCES, type Source } from '@/lib/ruqyah'

function Sources({ list }: { list: Source[] }) {
  return (
    <p className="text-xs text-gray-500 mt-2">
      Source:{' '}
      {list.map((s, i) => (
        <span key={s.label}>
          {i > 0 && ' · '}
          {s.book && s.number ? (
            <Link href={`/hadith?book=${s.book}&number=${s.number}`} className="underline text-[#0F766E]">
              {s.label}
            </Link>
          ) : (
            s.label
          )}
        </span>
      ))}
    </p>
  )
}

export default function RuqyahPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">🛡️ Ruqyah</h1>
        <p className="text-sm text-gray-600 mt-1">Protection and healing through the Qur’an and the supplications of the Prophet ﷺ.</p>
      </header>

      <p className="text-sm rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-3">
        This is a reminder, not medical or religious advice. Healing is from Allah alone; keep seeing your doctor, and ask a qualified scholar about anything specific. Spot a mistake? <Link href="/report?cat=content&ref=Ruqyah" className="underline font-semibold">Tell us</Link>.
      </p>

      <section aria-labelledby="h-und" className="space-y-3">
        <h2 id="h-und" className="font-bold text-lg">Understanding ruqyah</h2>
        {UNDERSTAND.map((u) => (
          <div key={u.title} className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="font-semibold">{u.title}</h3>
            <p className="text-sm text-gray-700 mt-1">{u.text}</p>
          </div>
        ))}
        <Sources list={UNDERSTAND_SOURCES} />
      </section>

      <section aria-labelledby="h-quran" className="space-y-3">
        <h2 id="h-quran" className="font-bold text-lg">From the Qur’an</h2>
        <p className="text-sm text-gray-600">Press Listen to hear it in your chosen reciter’s voice. Use the 🎯 button in the player to repeat each verse, or to pause so you can recite after the reciter.</p>
        {QURAN_ITEMS.map((q) => (
          <PassageCard key={q.id} title={q.title} note={q.note} surah={q.surah} from={q.from} to={q.to} loops={q.loops} footer={<Sources list={q.sources} />} />
        ))}
      </section>

      <section aria-labelledby="h-dua" className="space-y-3">
        <h2 id="h-dua" className="font-bold text-lg">Supplications from the Sunnah</h2>
        {DUAS.map((d) => (
          <article key={d.id} className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="font-bold">{d.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{d.when}</p>
            <p className="text-right text-2xl leading-[2.1] mt-3" dir="rtl" lang="ar" style={{ fontFamily: 'var(--font-quran), serif' }}>
              {d.arabic}
            </p>
            <p className="text-sm italic text-gray-600 mt-2">{d.transliteration}</p>
            <p className="text-sm text-gray-800 mt-2">{d.meaning}</p>
            {d.how && <p className="text-xs text-gray-600 mt-2">How: {d.how}</p>}
            <Sources list={d.sources} />
          </article>
        ))}
      </section>

      <section aria-labelledby="h-daily" className="bg-gradient-to-br from-[#0F766E] to-[#15803D] text-white rounded-2xl p-4">
        <h2 id="h-daily" className="font-bold text-lg">A simple daily routine</h2>
        <ul className="text-sm mt-2 space-y-1 list-disc ps-5">
          <li>Morning and evening: Al-Ikhlas, Al-Falaq and An-Nas, three times each.</li>
          <li>At night: Ayat al-Kursi, and the last two verses of Al-Baqarah.</li>
          <li>Before sleep: recite the three surahs, blow gently into your hands and wipe over your body.</li>
        </ul>
        <Link href="/duas" className="inline-block mt-3 px-3 py-2 rounded-lg bg-white/15 border border-white/30 text-sm font-semibold">
          Morning &amp; evening adhkar →
        </Link>
      </section>

      <section aria-labelledby="h-beware" className="space-y-2">
        <h2 id="h-beware" className="font-bold text-lg">Be careful of fraud</h2>
        <ul className="space-y-2">
          {BEWARE.map((b) => (
            <li key={b} className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
              {b}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
