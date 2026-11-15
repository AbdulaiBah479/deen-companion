'use client'

import { useState } from 'react'
import { SA_KG, fidya, kaffarahFast, kaffarahOath, zakatAlFitr, type Result } from '@/lib/giving-calc'

const CURRENCIES = ['USD', 'GBP', 'EUR', 'SLE', 'NGN', 'GHS', 'SAR', 'AED', 'PKR', 'INR', 'BDT', 'IDR', 'MYR', 'TRY', 'EGP', 'ZAR', 'KES']
const n = (s: string) => {
  const v = parseFloat(s)
  return Number.isFinite(v) && v >= 0 ? v : NaN
}
const field = 'mt-1 w-full rounded-xl border border-gray-300 p-2'

function Out({ r, cur, id }: { r: Result | null; cur: string; id: string }) {
  if (!r) return <p className="text-sm text-gray-500 mt-3">Fill in the numbers above to see the amount.</p>
  return (
    <div className="mt-3 rounded-xl bg-teal-50 border border-teal-200 p-3" data-testid={id}>
      <p className="text-2xl font-black text-[#0F766E]">{r.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {cur}</p>
      <p className="text-sm text-gray-700">{r.people} × {r.perPerson.toLocaleString(undefined, { maximumFractionDigits: 2 })} {cur}</p>
      <p className="text-xs text-gray-600 mt-2">{r.note}</p>
    </div>
  )
}

export default function GivingPage() {
  const [cur, setCur] = useState('USD')
  const [people, setPeople] = useState('1')
  const [kgPrice, setKgPrice] = useState('')
  const [sa, setSa] = useState(String(SA_KG.low))
  const [days, setDays] = useState('')
  const [meal, setMeal] = useState('')

  const fitr = zakatAlFitr(n(people), n(kgPrice), n(sa))
  const fid = fidya(n(days), n(meal))
  const oath = kaffarahOath(n(meal))
  const fast = kaffarahFast(n(meal))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#0F766E]">Zakat al-Fitr, fidya &amp; kaffarah</h1>
        <p className="text-sm text-gray-600 mt-1">
          Each amount is the number of people to feed times what a meal or a measure of food costs where you live. Prices differ everywhere, so type your local price.
        </p>
        <label className="block text-sm mt-3">
          <span className="font-semibold">Currency</span>
          <select value={cur} onChange={(e) => setCur(e.target.value)} className={field} aria-label="Currency">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="g-fitr">
        <h2 id="g-fitr" className="font-bold">Zakat al-Fitr (end of Ramadan)</h2>
        <p className="text-sm text-gray-600 mt-1">One measure (sa’) of staple food for every person you support, paid before the Eid prayer. The Prophet ﷺ made it obligatory (Bukhari, Muslim).</p>
        <label className="block text-sm mt-2">People you support<input inputMode="numeric" aria-label="Number of people" value={people} onChange={(e) => setPeople(e.target.value.replace(/\D/g, '').slice(0, 4))} className={field} /></label>
        <label className="block text-sm mt-2">Price of 1 kg of the staple food ({cur})<input inputMode="decimal" aria-label="Price per kg" value={kgPrice} onChange={(e) => setKgPrice(e.target.value.replace(/[^\d.]/g, '').slice(0, 10))} className={field} /></label>
        <label className="block text-sm mt-2">Size of the measure
          <select value={sa} onChange={(e) => setSa(e.target.value)} className={field} aria-label="Size of the measure">
            <option value={SA_KG.low}>{SA_KG.low} kg (the usual minimum)</option>
            <option value={SA_KG.high}>{SA_KG.high} kg (some scholars)</option>
          </select>
        </label>
        <Out r={fitr} cur={cur} id="fitr-out" />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="g-fidya">
        <h2 id="g-fidya" className="font-bold">Fidya (fasts you cannot make up)</h2>
        <p className="text-sm text-gray-600 mt-1">For someone who cannot fast and is not expected to be able to: feed one poor person for each missed day (Quran 2:184).</p>
        <label className="block text-sm mt-2">Days<input inputMode="numeric" aria-label="Days of fidya" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 5))} className={field} /></label>
        <label className="block text-sm mt-2">Cost of one average meal ({cur}), used here for fidya and kaffarah<input inputMode="decimal" aria-label="Cost of one meal" value={meal} onChange={(e) => setMeal(e.target.value.replace(/[^\d.]/g, '').slice(0, 10))} className={field} /></label>
        <Out r={fid} cur={cur} id="fidya-out" />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="g-oath">
        <h2 id="g-oath" className="font-bold">Kaffarah for a broken oath</h2>
        <p className="text-sm text-gray-600 mt-1">Quran 5:89: feed ten poor people, or clothe them; whoever cannot, fasts three days. Uses the meal cost above.</p>
        <Out r={oath} cur={cur} id="oath-out" />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="g-fast">
        <h2 id="g-fast" className="font-bold">Kaffarah for deliberately breaking a Ramadan fast</h2>
        <p className="text-sm text-gray-600 mt-1">The options are in order: free a slave, otherwise fast two months in a row, otherwise feed sixty poor people. The day is also made up. Uses the meal cost above.</p>
        <Out r={fast} cur={cur} id="fast-out" />
      </section>

      <p className="text-xs text-gray-500">These are guides, not a fatwa. Scholars differ on details such as the size of the measure and whether money may replace food. Ask a scholar you trust for your case.</p>
    </div>
  )
}
