'use client'

import { useEffect, useMemo, useState } from 'react'
import { HIJRI_MONTHS, dateKey, fromHijri, hijriRangeLabel, monthGrid, nextMajorEvent, toHijri, type DayCell } from '@/lib/hijri'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const KIND_STYLE: Record<string, string> = {
  eid: 'bg-[#D4AF37] text-black',
  holy: 'bg-[#0F766E] text-white',
  fast: 'bg-sky-100 text-sky-900',
  info: 'bg-gray-200 text-gray-700',
}

export default function CalendarPage() {
  const [today, setToday] = useState<Date | null>(null)
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null)
  const [selected, setSelected] = useState<DayCell | null>(null)
  const [hDay, setHDay] = useState('')
  const [hMonth, setHMonth] = useState('1')
  const [hYear, setHYear] = useState('')
  const [conv, setConv] = useState('')

  useEffect(() => {
    const t = new Date()
    setToday(t)
    setCursor({ y: t.getFullYear(), m: t.getMonth() })
  }, [])

  const grid = useMemo(() => (today && cursor ? monthGrid(cursor.y, cursor.m, today) : []), [today, cursor])
  const cells = grid.filter((c): c is DayCell => !!c)
  const todayH = today ? toHijri(today) : null
  const next = useMemo(() => (today ? nextMajorEvent(today) : null), [today])
  const detail = selected ?? cells.find((c) => c.isToday) ?? null

  if (!today || !cursor || !todayH) return <p className="text-gray-500">Loading…</p>

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleString('en', { month: 'long', year: 'numeric' })
  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
    setSelected(null)
  }

  function convert(e: React.FormEvent) {
    e.preventDefault()
    const day = Number(hDay)
    const year = Number(hYear)
    if (!Number.isInteger(day) || !Number.isInteger(year) || day < 1 || day > 30 || year < 1300 || year > 1600) {
      return setConv('Enter a valid Hijri day (1–30) and year (1300–1600).')
    }
    const g = fromHijri({ day, month: Number(hMonth), year })
    setConv(g ? `${day} ${HIJRI_MONTHS[Number(hMonth) - 1]} ${year} AH = ${g.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'That date does not exist (that Hijri month has only 29 days).')
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">🗓 Islamic Calendar</h1>
      <p className="text-gray-500 text-sm mb-4">
        Today is <b>{todayH.day} {HIJRI_MONTHS[todayH.month - 1]} {todayH.year} AH</b>
      </p>

      {next && (
        <div className="rounded-2xl p-4 mb-4 text-white bg-gradient-to-br from-[#0F766E] to-[#15803D]">
          <div className="text-xs opacity-80">Next occasion</div>
          <div className="text-lg font-black">{next.event.title}</div>
          <div className="text-sm opacity-90">
            {next.daysAway === 0 ? 'Today' : next.daysAway === 1 ? 'Tomorrow' : `in ${next.daysAway} days`} · {next.date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => move(-1)} aria-label="Previous month" className="px-3 py-2 rounded-lg border border-gray-300 bg-white">
          ←
        </button>
        <div className="text-center">
          <div className="font-bold" data-testid="cal-title">{monthLabel}</div>
          <div className="text-xs text-gray-500">{hijriRangeLabel(grid)}</div>
        </div>
        <button onClick={() => move(1)} aria-label="Next month" className="px-3 py-2 rounded-lg border border-gray-300 bg-white">
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4" role="group" aria-label="Calendar">
        {grid.map((c, i) =>
          c === null ? (
            <div key={i} />
          ) : (
            <button
              key={c.key}
              onClick={() => setSelected(c)}
              data-day={c.key}
              className={`rounded-lg py-1.5 border text-center ${c.isToday ? 'border-[#0F766E] border-2' : 'border-gray-200'} ${detail?.key === c.key ? 'bg-[#0F766E]/10' : 'bg-white'}`}
            >
              <span className="sr-only">{`${c.key}, ${c.hijri.day} ${HIJRI_MONTHS[c.hijri.month - 1]}`}</span>
              <span className="block text-sm font-semibold" aria-hidden="true">{c.date.getDate()}</span>
              <span className="block text-[10px] text-gray-600" aria-hidden="true">{c.hijri.day}</span>
              <span className="flex justify-center gap-0.5 h-1.5 mt-0.5">
                {c.events.slice(0, 3).map((e) => (
                  <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${e.kind === 'eid' ? 'bg-[#D4AF37]' : e.kind === 'holy' ? 'bg-[#0F766E]' : e.kind === 'fast' ? 'bg-sky-500' : 'bg-gray-400'}`} />
                ))}
              </span>
            </button>
          )
        )}
      </div>

      {detail && (
        <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-4" aria-label="Selected day">
          <div className="font-bold">
            {detail.date.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {detail.hijri.day} {HIJRI_MONTHS[detail.hijri.month - 1]} {detail.hijri.year} AH
          </div>
          {detail.events.length === 0 && <p className="text-sm text-gray-500">No special occasion.</p>}
          <ul className="space-y-2">
            {detail.events.map((e) => (
              <li key={e.id} className={`rounded-lg px-3 py-2 text-sm ${KIND_STYLE[e.kind]}`}>
                <b>{e.title}</b>
                {e.note && <span className="block text-xs opacity-80">{e.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
        <h2 className="font-bold mb-2">Hijri → Gregorian</h2>
        <form onSubmit={convert} className="flex flex-wrap gap-2">
          <input value={hDay} onChange={(e) => setHDay(e.target.value)} inputMode="numeric" placeholder="Day" aria-label="Hijri day" className="w-16 px-2 py-2 rounded-lg border border-gray-300" />
          <select value={hMonth} onChange={(e) => setHMonth(e.target.value)} aria-label="Hijri month" className="flex-1 min-w-32 px-2 py-2 rounded-lg border border-gray-300">
            {HIJRI_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input value={hYear} onChange={(e) => setHYear(e.target.value)} inputMode="numeric" placeholder="Year" aria-label="Hijri year" className="w-20 px-2 py-2 rounded-lg border border-gray-300" />
          <button className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">Convert</button>
        </form>
        {conv && <p className="text-sm mt-2" role="status">{conv}</p>}
      </section>

      <p className="text-xs text-gray-500">
        Dates use the Umm al-Qura calendar. Moon-sighting in your country can differ by a day for the start of months and Eid — follow your local authority.
        {' '}Today’s key: {dateKey(today)}.
      </p>
    </div>
  )
}
