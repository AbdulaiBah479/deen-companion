'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toHijri } from '@/lib/hijri'
import { clock, minutesOfDay, usePrayerTimes } from '@/lib/use-prayer-times'
import { useStored } from '@/lib/storage'

type Tracker = { fasted: number[]; taraweeh: number[]; juz: number[] }

const DAYS = Array.from({ length: 30 }, (_, i) => i + 1)
const toggle = (arr: number[], n: number) => (arr.includes(n) ? arr.filter((x) => x !== n) : [...arr, n])

function Grid({
  title,
  hint,
  selected,
  onToggle,
  label,
}: {
  title: string
  hint: string
  selected: number[]
  onToggle: (n: number) => void
  label: string
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <h2 className="font-bold">{title}</h2>
        <span className="text-sm font-semibold text-[#0F766E]">{selected.length}/30</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{hint}</p>
      <div className="grid grid-cols-6 gap-2">
        {DAYS.map((n) => (
          <button
            key={n}
            onClick={() => onToggle(n)}
            aria-pressed={selected.includes(n)}
            aria-label={`${label} ${n}`}
            className={`aspect-square rounded-lg text-sm font-semibold border ${
              selected.includes(n) ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white border-gray-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </section>
  )
}

// Suhoor ends at Fajr; the fast is broken at Maghrib.
function FastingTimes() {
  const { times, error } = usePrayerTimes()
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (error) return <p className="text-sm text-gray-500 mb-4">{error}. Set your location on the <Link href="/prayer" className="underline">Prayer page</Link>.</p>
  if (!times || now === null) return <p className="text-sm text-gray-500 mb-4">Loading fasting times…</p>

  const d = new Date(now)
  const mins = d.getHours() * 60 + d.getMinutes()
  const fajr = minutesOfDay(times.fajr)
  const maghrib = minutesOfDay(times.maghrib)
  const h = toHijri(d)
  const inRamadan = h.month === 9
  const fmt = (m: number) => `${Math.floor(m / 60) > 0 ? Math.floor(m / 60) + 'h ' : ''}${m % 60}m`

  let status: string
  if (mins < fajr) status = `Suhoor ends in ${fmt(fajr - mins)}`
  else if (mins < maghrib) status = `Iftar in ${fmt(maghrib - mins)}`
  else status = `Suhoor ends in ${fmt(24 * 60 - mins + fajr)}`

  return (
    <section className="rounded-2xl p-5 mb-4 text-white bg-gradient-to-br from-[#0F766E] to-[#15803D]" aria-label="Fasting times">
      <div className="text-xs opacity-80">{inRamadan ? `Ramadan day ${h.day}` : 'Fasting times today'}</div>
      <div className="text-2xl font-black mb-3" data-testid="fast-status">{status}</div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-black/20 rounded-xl py-2">
          <div className="text-[11px] opacity-95">Suhoor ends (Fajr)</div>
          <div className="text-xl font-black">{clock(times.fajr)}</div>
        </div>
        <div className="bg-black/20 rounded-xl py-2">
          <div className="text-[11px] opacity-95">Iftar (Maghrib)</div>
          <div className="text-xl font-black text-[#E6C86A]">{clock(times.maghrib)}</div>
        </div>
      </div>
      <p className="text-[11px] opacity-70 mt-2">For your saved location. Many places stop eating a few minutes before Fajr — follow your local timetable.</p>
    </section>
  )
}

export default function RamadanPage() {
  const [t, setT] = useStored<Tracker>('deen:ramadan', { fasted: [], taraweeh: [], juz: [] })
  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">🌙 Ramadan Tracker</h1>
      <p className="text-gray-500 text-sm mb-4">Track your fasts, night prayers and Quran completion. Stored on your device.</p>
      <FastingTimes />
      <Grid
        title="Fasting"
        hint="Mark each day of Ramadan you fasted."
        selected={t.fasted}
        onToggle={(n) => setT((x) => ({ ...x, fasted: toggle(x.fasted, n) }))}
        label="Fasted day"
      />
      <Grid
        title="Taraweeh / Qiyam"
        hint="Mark each night you prayed."
        selected={t.taraweeh}
        onToggle={(n) => setT((x) => ({ ...x, taraweeh: toggle(x.taraweeh, n) }))}
        label="Night"
      />
      <Grid
        title="Quran — Juz completed"
        hint="Tap a juz when you finish reading it."
        selected={t.juz}
        onToggle={(n) => setT((x) => ({ ...x, juz: toggle(x.juz, n) }))}
        label="Juz"
      />
      <button
        onClick={() => {
          if (window.confirm('Reset all Ramadan tracking?')) setT({ fasted: [], taraweeh: [], juz: [] })
        }}
        className="text-sm text-gray-500 underline"
      >
        Reset tracker
      </button>
    </div>
  )
}
