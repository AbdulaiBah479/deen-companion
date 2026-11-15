'use client'

import { useState } from 'react'
import { HIJRI_MONTHS, atNoon, fromHijri, toHijri } from '@/lib/hijri'

const pad = (n: number) => String(n).padStart(2, '0')
const field = 'mt-1 w-full rounded-xl border border-gray-300 p-2'

export default function ConverterPage() {
  const today = atNoon(new Date())
  const th = toHijri(today)
  const [g, setG] = useState(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`)
  const [hy, setHy] = useState(String(th.year))
  const [hm, setHm] = useState(th.month)
  const [hd, setHd] = useState(String(th.day))

  const gd = /^\d{4}-\d{2}-\d{2}$/.test(g) ? new Date(`${g}T12:00:00`) : null
  const gh = gd && !Number.isNaN(gd.getTime()) && gd.getFullYear() >= 1900 && gd.getFullYear() <= 2100 ? toHijri(gd) : null
  const yy = Number(hy)
  const dd = Number(hd)
  const back = Number.isInteger(yy) && Number.isInteger(dd) && yy >= 1300 && yy <= 1500 && dd >= 1 && dd <= 30 ? fromHijri({ year: yy, month: hm, day: dd }) : null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#0F766E]">Hijri date converter</h1>
        <p className="text-sm text-gray-600 mt-1">Today is {th.day} {HIJRI_MONTHS[th.month - 1]} {th.year} AH. Convert in either direction. Works without internet.</p>
      </div>
      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="c1">
        <h2 id="c1" className="font-bold">Gregorian → Hijri</h2>
        <label className="block text-sm mt-2">Date<input type="date" value={g} onChange={(e) => setG(e.target.value)} className={field} aria-label="Gregorian date" /></label>
        {gh ? <p className="mt-3 text-xl font-black text-[#0F766E]" data-testid="to-hijri">{gh.day} {HIJRI_MONTHS[gh.month - 1]} {gh.year} AH</p> : <p className="mt-3 text-sm text-gray-500">Pick a date between 1900 and 2100.</p>}
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="c2">
        <h2 id="c2" className="font-bold">Hijri → Gregorian</h2>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <label className="text-sm">Day<input inputMode="numeric" value={hd} onChange={(e) => setHd(e.target.value.replace(/\D/g, '').slice(0, 2))} className={field} aria-label="Hijri day" /></label>
          <label className="text-sm">Month
            <select value={hm} onChange={(e) => setHm(Number(e.target.value))} className={field} aria-label="Hijri month">
              {HIJRI_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="text-sm">Year<input inputMode="numeric" value={hy} onChange={(e) => setHy(e.target.value.replace(/\D/g, '').slice(0, 4))} className={field} aria-label="Hijri year" /></label>
        </div>
        {back ? <p className="mt-3 text-xl font-black text-[#0F766E]" data-testid="to-gregorian">{back.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p> : <p className="mt-3 text-sm text-gray-500">Enter a day (1–30) and a year (1300–1500).</p>}
      </section>
      <p className="text-xs text-gray-500">Dates use the Umm al-Qura calendar. The start of a month in your country is set by moon sighting and can differ by a day.</p>
    </div>
  )
}
