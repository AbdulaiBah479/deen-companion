'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PRESETS, TOTAL_PAGES, addPages, juzOfPage, pagesReadSince, parsePageSpec, planStatus, readingStreak, shiftKey, type KhatamPlan, type ReadLog } from '@/lib/khatam'
import { localDateKey, useStored } from '@/lib/storage'

// Pages in each juz of the Madani mushaf (juz 1 = pages 1–21, juz 30 = 582–604, others 20 pages).
const juzPages = (juz: number) => (juz === 1 ? 21 : juz === 30 ? 23 : 20)

export default function GoalsPage() {
  const [plan, setPlan] = useStored<KhatamPlan | null>('deen:khatam', null)
  const [log, setLog] = useStored<ReadLog>('deen:readlog', {})
  const [today, setToday] = useState('')
  const [custom, setCustom] = useState('')
  const [spec, setSpec] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => setToday(localDateKey()), [])

  const status = useMemo(() => (plan && today ? planStatus(plan, log, today) : null), [plan, log, today])
  const readSet = useMemo(() => (plan ? pagesReadSince(log, plan.start) : new Set<number>()), [plan, log])
  const nextPage = useMemo(() => {
    for (let p = 1; p <= TOTAL_PAGES; p++) if (!readSet.has(p)) return p
    return null
  }, [readSet])
  const streak = today && status ? readingStreak(log, today, 1) : 0
  const week = today ? Array.from({ length: 7 }, (_, i) => shiftKey(today, i - 6)) : []

  function start(days: number) {
    if (!today || !Number.isInteger(days) || days < 1 || days > 1000) return setMsg('Choose between 1 and 1000 days.')
    setPlan({ start: today, days })
    setMsg('')
  }

  function addSpec(e: React.FormEvent) {
    e.preventDefault()
    const pages = parsePageSpec(spec)
    if (!pages.length) return setMsg('Enter pages like 5 or 5-8 or 5-8, 12 (1–604).')
    setLog((l) => addPages(l, today, pages))
    setSpec('')
    setMsg(`Added ${pages.length} page${pages.length === 1 ? '' : 's'}.`)
  }

  if (!plan) {
    return (
      <div>
        <h1 className="text-2xl font-black text-[#0F766E] mb-1">📅 Khatam Planner</h1>
        <p className="text-gray-500 text-sm mb-4">Set a goal to complete the whole Quran. We’ll tell you how many pages to read each day and track your progress.</p>
        <div className="grid gap-2 mb-4">
          {PRESETS.map((p) => (
            <button key={p.days} onClick={() => start(p.days)} className="flex justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#0F766E]">
              <span className="font-semibold">{p.label}</span>
              <span className="text-gray-500 text-sm">{Math.ceil(TOTAL_PAGES / p.days)} pages / day</span>
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            start(Number(custom))
          }}
          className="flex gap-2"
        >
          <input value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="numeric" placeholder="Or choose your own number of days" aria-label="Custom days" className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white" />
          <button className="px-4 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">Start</button>
        </form>
        {msg && <p className="text-red-600 text-sm mt-2">{msg}</p>}
        <p className="text-xs text-gray-500 mt-4">Pages are counted from the 604-page Madani mushaf. Open any page in the Mushaf view and stay a few seconds — it’s logged automatically.</p>
      </div>
    )
  }

  const s = status
  const pct = Math.round(((s?.read ?? 0) / TOTAL_PAGES) * 100)

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">📅 Khatam Planner</h1>
      <p className="text-gray-500 text-sm mb-4">
        Finish the Quran in {plan.days} days · {s?.perDay} pages a day{s && s.dayNumber > 0 ? ` · day ${s.dayNumber} of ${plan.days}` : ''}
      </p>

      {s?.complete && (
        <div className="rounded-2xl p-5 mb-4 text-center bg-[#D4AF37]/20 border border-[#D4AF37]">
          <div className="text-4xl">🎉</div>
          <p className="font-black text-lg">Khatam complete — MashaAllah!</p>
          <p className="text-sm text-gray-600">May Allah accept it. Make a dua after completing the Quran.</p>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-black text-[#0F766E]">{pct}%</span>
          <span className="text-sm text-gray-500">
            {s?.read} / {TOTAL_PAGES} pages
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Quran completed">
          <div className="h-full bg-gradient-to-r from-[#0F766E] to-[#D4AF37]" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-black text-lg" data-testid="pages-left-today">{s?.todayLeft}</div>
            <div className="text-xs text-gray-500">pages left today</div>
          </div>
          <div>
            <div className={`font-black text-lg ${s && s.ahead < 0 ? 'text-red-600' : 'text-green-600'}`}>{s && s.ahead >= 0 ? `+${s.ahead}` : s?.ahead}</div>
            <div className="text-xs text-gray-500">{s && s.ahead < 0 ? 'behind schedule' : 'ahead of schedule'}</div>
          </div>
          <div>
            <div className="font-black text-lg">🔥 {streak}</div>
            <div className="text-xs text-gray-500">day streak</div>
          </div>
        </div>
        {s?.finishDate && !s.complete && (
          <p className="text-xs text-gray-500 mt-3">
            At your current pace you’ll finish around <b>{s.finishDate}</b>.
          </p>
        )}
      </section>

      {nextPage && !s?.complete && (
        <Link href={`/quran/page/${nextPage}`} className="block text-center py-3 rounded-xl bg-[#0F766E] text-white font-bold mb-4">
          Continue from page {nextPage} →
        </Link>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <h2 className="font-bold mb-2">Pages read this week</h2>
        <div className="flex items-end gap-2 h-24">
          {week.map((d) => {
            const n = log[d]?.length ?? 0
            const h = Math.min(100, (n / Math.max(1, s?.perDay ?? 1)) * 100)
            return (
              <div key={d} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[10px] text-gray-500">{n || ''}</span>
                <div className="w-full rounded-t bg-[#0F766E]" style={{ height: `${Math.max(h, n ? 6 : 2)}%`, opacity: n ? 1 : 0.2 }} title={`${d}: ${n} pages`} />
                <span className="text-[10px] text-gray-500 mt-1">{d.slice(8)}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <h2 className="font-bold mb-2">Progress by juz</h2>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 30 }, (_, i) => {
            let n = 0
            for (const p of readSet) if (juzOfPage(p) === i + 1) n++
            const frac = n / juzPages(i + 1)
            return (
              <div key={i} className="rounded-lg text-center py-2 text-xs font-semibold border border-gray-200" style={{ background: `rgba(15,118,110,${0.08 + frac * 0.8})`, color: frac > 0.55 ? '#fff' : undefined }} title={`Juz ${i + 1}: ${n}/${juzPages(i + 1)} pages`}>
                {i + 1}
              </div>
            )
          })}
        </div>
      </section>

      <form onSubmit={addSpec} className="flex gap-2 mb-2">
        <input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Mark pages read, e.g. 5-8, 12" aria-label="Pages to mark as read" className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-300 bg-white" />
        <button className="px-4 py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold">Add</button>
      </form>
      {msg && <p className="text-sm text-[#0F766E] mb-2">{msg}</p>}
      <p className="text-xs text-gray-500 mb-4">Pages you open in the Mushaf view are logged automatically after a few seconds.</p>

      <button
        onClick={() => {
          if (window.confirm('Start over? Your reading log is kept, but the plan and its progress are reset.')) setPlan(null)
        }}
        className="text-sm text-gray-500 underline"
      >
        Change or restart plan
      </button>
    </div>
  )
}
