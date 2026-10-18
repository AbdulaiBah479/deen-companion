'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { HABITS, dayScore, habitStreak, isDone, toggleHabit, weekSummary, type HabitLog, type Resolver } from '@/lib/habits'
import { shiftKey, type ReadLog } from '@/lib/khatam'
import { localDateKey, useStored } from '@/lib/storage'

export default function HabitsPage() {
  const [log, setLog] = useStored<HabitLog>('deen:habits', {})
  const [prayers] = useStored<Record<string, Record<string, boolean>>>('deen:prayers', {})
  const [reading] = useStored<ReadLog>('deen:readlog', {})
  const [today, setToday] = useState('')
  const [date, setDate] = useState('')
  useEffect(() => {
    const t = localDateKey()
    setToday(t)
    setDate(t)
  }, [])

  // What the rest of the app already knows about a given day.
  const resolve: Resolver = useMemo(
    () => (d: string) => ({
      prayersDone: Object.values(prayers[d] ?? {}).filter(Boolean).length,
      pagesRead: reading[d]?.length ?? 0,
    }),
    [prayers, reading]
  )

  if (!date || !today) return <p className="text-gray-500">Loading…</p>
  const ctx = resolve(date)
  const score = dayScore(date, log, resolve)
  const week = weekSummary(today, log, resolve)
  const isToday = date === today

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">✅ Daily Deeds</h1>
      <p className="text-gray-500 text-sm mb-4">Build good habits one day at a time. Prayers and Quran reading fill in automatically.</p>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setDate(shiftKey(date, -1))} aria-label="Previous day" className="px-3 py-2 rounded-lg border border-gray-300 bg-white">
          ←
        </button>
        <div className="text-center">
          <div className="font-bold">{isToday ? 'Today' : date}</div>
          <div className="text-xs text-gray-500">
            {score.done} of {score.total} done
          </div>
        </div>
        <button onClick={() => setDate(shiftKey(date, 1))} disabled={isToday} aria-label="Next day" className="px-3 py-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40">
          →
        </button>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4" role="progressbar" aria-valuenow={Math.round(score.ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Deeds completed">
        <div className="h-full bg-gradient-to-r from-[#0F766E] to-[#D4AF37] transition-all" style={{ width: `${score.ratio * 100}%` }} />
      </div>

      <ul className="space-y-2 mb-5">
        {HABITS.map((h) => {
          const done = isDone(h, date, log, ctx)
          const streak = habitStreak(h, today, log, resolve)
          return (
            <li key={h.id}>
              <button
                onClick={() => !h.auto && setLog((l) => toggleHabit(l, date, h.id))}
                disabled={h.auto}
                aria-pressed={done}
                data-habit={h.id}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${done ? 'bg-green-100 border-green-600' : 'bg-white border-gray-200'} ${h.auto ? 'cursor-default' : 'hover:border-[#0F766E]'}`}
              >
                <span className="text-2xl">{h.icon}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{h.label}</span>
                  <span className="block text-xs text-gray-500">
                    {h.auto ? h.hint : streak > 0 ? `🔥 ${streak}-day streak` : 'Tap to mark done'}
                    {h.auto && streak > 0 ? ` · 🔥 ${streak}` : ''}
                  </span>
                </span>
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold ${done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
              </button>
            </li>
          )
        })}
      </ul>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-bold">This week</h2>
          <span className="text-xs text-gray-500">
            {Math.round(week.average * 100)}% average · {week.perfectDays} perfect day{week.perfectDays === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-end gap-2 h-24">
          {week.days.map((d) => (
            <button
              key={d.date}
              onClick={() => setDate(d.date)}
              className="flex-1 flex flex-col items-center justify-end h-full"
              aria-label={`${d.date}: ${d.done} of ${d.total}`}
            >
              <div className={`w-full rounded-t ${d.date === date ? 'bg-[#D4AF37]' : 'bg-[#0F766E]'}`} style={{ height: `${Math.max(d.ratio * 100, 3)}%`, opacity: d.done ? 1 : 0.2 }} />
              <span className="text-[10px] text-gray-500 mt-1">{d.date.slice(8)}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Track prayers in <Link href="/prayer" className="underline">Prayer times</Link> and reading in the <Link href="/goals" className="underline">Khatam planner</Link>.
      </p>
    </div>
  )
}
