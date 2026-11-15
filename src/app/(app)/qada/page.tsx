'use client'

import { useState } from 'react'
import { EMPTY_QADA, PRAYER_KEYS, cleanQada, daysLeft, estimateOwed, lastWeek, makeUpFast, makeUpPrayer, streak, totalPrayers, undoFast, undoPrayer, type PrayerKey, type Qada } from '@/lib/qada'
import { localDateKey, useStored } from '@/lib/storage'

const LABEL: Record<PrayerKey, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', witr: 'Witr' }
const btn = 'rounded-full border border-gray-300 px-3 py-1.5 text-sm'

export default function QadaPage() {
  const [raw, setRaw, ready] = useStored<Qada>('deen:qada', EMPTY_QADA)
  const q = cleanQada(raw)
  const today = localDateKey()
  const [years, setYears] = useState('')
  const [fastsIn, setFastsIn] = useState('')
  const [lastTap, setLastTap] = useState<{ kind: 'p'; key: PrayerKey } | { kind: 'f' } | null>(null)

  const total = totalPrayers(q)
  const week = lastWeek(q, today)
  const left = daysLeft(total + q.fasts, week.prayers + week.fasts)
  const st = streak(q, today)
  const done = ready && total === 0 && q.fasts === 0 && Object.keys(q.log).length > 0

  const apply = () => {
    const y = Math.max(0, Math.floor(Number(years) || 0))
    if (y > 0) setRaw({ ...q, prayers: { ...estimateOwed(y), witr: q.prayers.witr } })
    const f = Math.max(0, Math.floor(Number(fastsIn) || 0))
    if (fastsIn !== '') setRaw((p) => ({ ...cleanQada(p), fasts: Math.min(100000, f) }))
    setYears('')
    setFastsIn('')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#0F766E]">Make-up prayers &amp; fasts</h1>
        <p className="text-sm text-gray-600 mt-1">
          Count what you still owe and tick it off as you make it up, one at a time. Kept on this device (and synced only if you sign in).
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="qada-summary">
        <h2 id="qada-summary" className="font-bold">Your progress</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-2">
            <div className="text-2xl font-black text-[#0F766E]" data-testid="qada-total">{total}</div>
            <div className="text-xs text-gray-500">prayers left</div>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-2">
            <div className="text-2xl font-black text-[#0F766E]" data-testid="qada-fasts">{q.fasts}</div>
            <div className="text-xs text-gray-500">fasts left</div>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-2">
            <div className="text-2xl font-black text-[#0F766E]" data-testid="qada-streak">{st}</div>
            <div className="text-xs text-gray-500">day streak</div>
          </div>
        </div>
        {left !== null && <p className="text-sm text-gray-700 mt-3">At your pace this week ({week.prayers + week.fasts} made up) you would finish in about {left} {left === 1 ? 'day' : 'days'}. Steady and small is the way.</p>}
        {done && <p className="text-sm font-semibold text-[#0F766E] mt-3">Everything you listed is made up. May Allah accept it from you.</p>}
        <p className="text-xs text-gray-500 mt-2">“The most beloved deeds to Allah are the most consistent, even if small.” (Bukhari and Muslim)</p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="qada-prayers">
        <h2 id="qada-prayers" className="font-bold mb-2">Prayers</h2>
        <ul className="space-y-2">
          {PRAYER_KEYS.map((k) => (
            <li key={k} className="flex items-center justify-between gap-2">
              <span className="font-semibold w-24">{LABEL[k]}</span>
              <span className="text-lg font-black tabular-nums" data-testid={`qada-${k}`}>{q.prayers[k]}</span>
              <button type="button" className={`${btn} bg-[#0F766E] text-white border-[#0F766E] disabled:opacity-40`} disabled={q.prayers[k] === 0} onClick={() => { setRaw(makeUpPrayer(q, k, today)); setLastTap({ kind: 'p', key: k }) }} aria-label={`I made up one ${LABEL[k]}`}>
                Made up ✓
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="qada-fasts-h">
        <h2 id="qada-fasts-h" className="font-bold mb-2">Fasts</h2>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold w-24">Days</span>
          <span className="text-lg font-black tabular-nums">{q.fasts}</span>
          <button type="button" className={`${btn} bg-[#0F766E] text-white border-[#0F766E] disabled:opacity-40`} disabled={q.fasts === 0} onClick={() => { setRaw(makeUpFast(q, today)); setLastTap({ kind: 'f' }) }} aria-label="I made up one fast">
            Made up ✓
          </button>
        </div>
      </section>

      {lastTap && (
        <button type="button" className={btn} onClick={() => { setRaw(lastTap.kind === 'p' ? undoPrayer(q, lastTap.key, today) : undoFast(q, today)); setLastTap(null) }}>
          ↩ Undo the last tick
        </button>
      )}

      <details className="rounded-2xl border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer font-bold">Set or estimate what I owe</summary>
        <div className="mt-3 space-y-3 text-sm">
          <label className="block">
            <span className="font-semibold">Years of prayers missed (an estimate; fills the five daily prayers)</span>
            <input inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, '').slice(0, 3))} className="mt-1 w-full rounded-xl border border-gray-300 p-2" placeholder="e.g. 3" />
          </label>
          <label className="block">
            <span className="font-semibold">Fasting days owed</span>
            <input inputMode="numeric" value={fastsIn} onChange={(e) => setFastsIn(e.target.value.replace(/\D/g, '').slice(0, 5))} className="mt-1 w-full rounded-xl border border-gray-300 p-2" placeholder="e.g. 12" />
          </label>
          <p className="text-xs text-gray-500">Or set one prayer exactly:</p>
          <div className="grid grid-cols-3 gap-2">
            {PRAYER_KEYS.map((k) => (
              <label key={k} className="block text-xs">
                {LABEL[k]}
                <input
                  inputMode="numeric"
                  aria-label={`${LABEL[k]} owed`}
                  value={String(q.prayers[k])}
                  onChange={(e) => setRaw({ ...q, prayers: { ...q.prayers, [k]: Math.min(100000, Number(e.target.value.replace(/\D/g, '')) || 0) } })}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-1.5 text-sm"
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={apply} className="rounded-xl bg-[#0F766E] text-white px-4 py-2 font-semibold">Save estimate</button>
        </div>
      </details>

      <p className="text-xs text-gray-500">
        This is a counter, not a ruling. Scholars agree a missed prayer should be made up as soon as possible with sincere repentance; some hold that prayers
        left on purpose need repentance alone. If your situation is complicated (illness, travel, a long period), ask a scholar you trust.
      </p>
    </div>
  )
}
