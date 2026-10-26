'use client'

import { HadithCard, VerseChips } from '@/components/HadithCard'
import { AREAS, HABITS } from '@/lib/baraka'

// "Habits that bring baraka": practical things from the Quran and Sunnah, each with its evidence.
export default function BarakaHabits() {
  return (
    <div className="space-y-5" data-testid="baraka">
      <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-sm text-teal-900">
        <strong>Baraka</strong> is the blessing Allah places in time, food, money, family and effort, so a little goes a long way. It comes only from Allah. These are the means the Quran and the Prophet ﷺ pointed to; they are not charms and nothing is guaranteed. Do them sincerely and ask Him.
      </div>
      {AREAS.map((a) => (
        <section key={a} aria-label={a} className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#0F766E]">{a}</h2>
          {HABITS.filter((h) => h.area === a).map((h) => (
            <details key={h.id} className="rounded-2xl border border-gray-200 bg-white p-4" data-testid="habit">
              <summary className="cursor-pointer font-bold">{h.title}</summary>
              <div className="mt-3 space-y-2 text-sm text-gray-800">
                <p>{h.why}</p>
                <p><strong>How:</strong> {h.how}</p>
                <VerseChips refs={h.quran} />
                {h.hadith?.map((x) => <HadithCard key={`${x.book}${x.number}`} book={x.book} number={x.number} />)}
              </div>
            </details>
          ))}
        </section>
      ))}
    </div>
  )
}
