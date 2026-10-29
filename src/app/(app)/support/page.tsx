'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { money, summarize, type Ledger, type Sponsor } from '@/lib/support-shared'

type Data = { ledger: Ledger; sponsor: Sponsor | null; donateUrl: string | null }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthName = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`

// "Support the app": why it needs support, how to give, and exactly where the money goes (a public ledger the owner keeps up to date).
export default function SupportPage() {
  const [data, setData] = useState<Data | null | undefined>(undefined)
  useEffect(() => {
    fetch('/api/support')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [])

  const s = data ? summarize(data.ledger) : null
  const cur = data?.ledger.currency ?? 'USD'

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">Support Deen Companion</h1>
        <p className="text-sm text-gray-600 mt-1">
          The app is free for everyone and has no ads inside the Quran, prayer, dua or ruqyah screens. Running it costs money every month (hosting, the domain, and the services that
          write explanations). If it benefits you, you can help keep it running, as voluntary sadaqah.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-label="How to give">
        <h2 className="font-bold">Give</h2>
        {data === undefined && <p className="text-sm text-gray-500 mt-1">Loading…</p>}
        {data?.donateUrl ? (
          <a href={data.donateUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center w-full py-3 rounded-xl bg-[#D4AF37] text-[#1a0e00] font-bold" data-testid="support-give">
            Support the app ↗
          </a>
        ) : (
          data !== undefined && <p className="text-sm text-gray-600 mt-1" data-testid="support-soon">Giving is not open yet. Please check back soon, in shā’ Allāh.</p>
        )}
        <ul className="mt-3 text-xs text-gray-600 space-y-1 list-disc pl-5">
          <li>You give on the donation service’s own page. This app never sees your card or bank details.</li>
          <li>This is sadaqah for the app’s costs. <strong>It is not zakat</strong>: zakat has its own eight categories. To give zakat, use <Link href="/zakat#causes" className="underline text-[#0F766E]">Where your zakat can go</Link>.</li>
          <li>Giving never unlocks anything. Every worship feature stays free for everyone.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-label="Where the money goes" data-testid="ledger">
        <h2 className="font-bold">Where the money goes</h2>
        <p className="text-xs text-gray-500">Every month’s income and costs are published here, in {cur}.</p>
        {data === undefined && <p className="text-sm text-gray-500 mt-2">Loading…</p>}
        {data === null && <p className="text-sm text-gray-600 mt-2">The figures could not be loaded right now.</p>}
        {data && s && s.rows.length === 0 && (
          <p className="text-sm text-gray-600 mt-2">No figures have been published yet. Once the app receives any support, each month’s income and costs will appear here, line by line.</p>
        )}
        {data && s && s.rows.length > 0 && (
          <>
            <dl className="grid grid-cols-3 gap-2 text-center mt-3">
              <div className="rounded-xl bg-teal-50 p-2"><dt className="text-[11px] text-gray-600">Received</dt><dd className="font-black text-[#0F766E]">{money(s.income, cur)}</dd></div>
              <div className="rounded-xl bg-amber-50 p-2"><dt className="text-[11px] text-gray-600">Spent</dt><dd className="font-black text-amber-800">{money(s.costs, cur)}</dd></div>
              <div className="rounded-xl bg-gray-50 p-2"><dt className="text-[11px] text-gray-600">Left</dt><dd className="font-black">{money(s.balance, cur)}</dd></div>
            </dl>
            <div className="mt-3 space-y-3">
              {s.rows.map((m) => (
                <details key={m.month} className="rounded-xl border border-gray-200 p-3" open={m === s.rows[0]}>
                  <summary className="cursor-pointer font-semibold text-sm">
                    {monthName(m.month)} <span className="text-gray-500 font-normal">· in {money(m.totalIncome, cur)} · out {money(m.totalCosts, cur)}</span>
                  </summary>
                  <div className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-bold text-[#0F766E] uppercase">Received</p>
                      {m.income.length === 0 ? <p className="text-gray-500 text-xs">Nothing this month.</p> : (
                        <ul>{m.income.map((l, i) => <li key={i} className="flex justify-between gap-2"><span>{l.label}</span><span>{money(l.amount, cur)}</span></li>)}</ul>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-800 uppercase">Spent</p>
                      {m.costs.length === 0 ? <p className="text-gray-500 text-xs">Nothing this month.</p> : (
                        <ul>{m.costs.map((l, i) => <li key={i} className="flex justify-between gap-2"><span>{l.label}</span><span>{money(l.amount, cur)}</span></li>)}</ul>
                      )}
                    </div>
                  </div>
                  {m.note && <p className="text-xs text-gray-600 mt-2">{m.note}</p>}
                  <p className="text-xs text-gray-500 mt-1">Carried forward after this month: {money(m.balance, cur)}</p>
                </details>
              ))}
            </div>
          </>
        )}
        <p className="text-xs text-gray-500 mt-3">Anything left over is kept for the next months’ costs. If it ever grows beyond what the app needs, the owner has promised to give the extra as sadaqah and say so here.</p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700" aria-label="Our promises">
        <h2 className="font-bold text-base">Our promises</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>No ads or sponsor banners inside the Quran, prayer times, duas, ruqyah, hadith or any worship screen.</li>
          <li>A sponsor, if there is one, is always labelled “Sponsored”, appears only on the home and More pages, and never tracks you.</li>
          <li>We never sell your data. See the <Link href="/legal/privacy" className="underline text-[#0F766E]">privacy page</Link>.</li>
        </ul>
        <p className="mt-3">Are you a business or a mosque that would like to sponsor? <Link href="/sponsor" className="underline text-[#0F766E] font-semibold">Read how sponsoring works</Link>.</p>
      </section>
    </div>
  )
}
