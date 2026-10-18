'use client'

import { useState } from 'react'

// Nisab: 85 g of gold or 595 g of silver (the commonly cited modern equivalents of 20 mithqal / 200 dirham; some scholars use slightly different figures).
// Zakat due is 2.5% of net zakatable wealth held for a full lunar year, if at or above nisab.
const GOLD_NISAB_G = 85
const SILVER_NISAB_G = 595

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const FIELDS: { key: string; label: string; hint?: string }[] = [
  { key: 'cash', label: 'Cash & bank balances' },
  { key: 'gold', label: 'Gold you own (value)' },
  { key: 'silver', label: 'Silver you own (value)' },
  { key: 'investments', label: 'Investments & shares (market value)' },
  { key: 'business', label: 'Business stock & receivables' },
  { key: 'owed', label: 'Money owed to you (expected to be repaid)' },
]

type Live = { usdPerGram: { gold: number; silver: number }; rates: Record<string, number>; updatedAt?: string }
const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SAR', 'AED', 'NGN', 'GHS', 'PKR', 'INR', 'BDT', 'IDR', 'MYR', 'TRY', 'EGP', 'ZAR']

export default function ZakatPage() {
  const [live, setLive] = useState<Live | null>(null)
  const [liveError, setLiveError] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [prices, setPrices] = useState({ gold: '', silver: '' })

  async function fetchLive(cur: string) {
    setLiveError('')
    try {
      const data: Live = live ?? (await (await fetch('/api/metals')).json())
      if (!data.usdPerGram) throw new Error()
      setLive(data)
      const rate = data.rates[cur] ?? 1
      setCurrency(cur)
      setPrices({
        gold: (data.usdPerGram.gold * rate).toFixed(2),
        silver: (data.usdPerGram.silver * rate).toFixed(2),
      })
    } catch {
      setLiveError('Live prices are unavailable right now — please enter them manually.')
    }
  }

  const [basis, setBasis] = useState<'silver' | 'gold'>('silver')
  const [vals, setVals] = useState<Record<string, string>>({})
  const [debts, setDebts] = useState('')

  const gross = FIELDS.reduce((sum, f) => sum + num(vals[f.key] || ''), 0)
  const net = Math.max(0, gross - num(debts))
  const pricePerGram = num(basis === 'gold' ? prices.gold : prices.silver)
  const nisab = pricePerGram * (basis === 'gold' ? GOLD_NISAB_G : SILVER_NISAB_G)
  const ready = pricePerGram > 0
  const due = ready && net >= nisab ? net * 0.025 : 0

  const input = 'w-full px-3 py-2 rounded-lg border border-gray-300 bg-white'

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Zakat Calculator</h1>
      <p className="text-gray-500 text-sm mb-5">
        Enter today’s metal price from a source you trust, in your own currency. Everything stays on your device.
      </p>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
        <h2 className="font-bold">1. Nisab threshold</h2>
        <div className="flex gap-2 items-center">
          <select
            value={currency}
            onChange={(e) => (live ? fetchLive(e.target.value) : setCurrency(e.target.value))}
            aria-label="Currency"
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button type="button" onClick={() => fetchLive(currency)} className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold">
            Fill live prices
          </button>
        </div>
        {live?.updatedAt && <p className="text-xs text-gray-500">Spot prices from gold-api.com · updated {live.updatedAt}</p>}
        {liveError && <p className="text-xs text-red-600">{liveError}</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Gold price per gram
            <input inputMode="decimal" className={input} value={prices.gold} onChange={(e) => setPrices({ ...prices, gold: e.target.value })} />
          </label>
          <label className="text-sm">
            Silver price per gram
            <input inputMode="decimal" className={input} value={prices.silver} onChange={(e) => setPrices({ ...prices, silver: e.target.value })} />
          </label>
        </div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={basis === 'silver'} onChange={() => setBasis('silver')} /> Silver nisab ({SILVER_NISAB_G} g)
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={basis === 'gold'} onChange={() => setBasis('gold')} /> Gold nisab ({GOLD_NISAB_G} g)
          </label>
        </div>
        {ready && <p className="text-sm text-gray-600">Nisab: <b>{nisab.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></p>}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
        <h2 className="font-bold">2. Your zakatable wealth</h2>
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-sm">
            {f.label}
            <input
              inputMode="decimal"
              className={input}
              value={vals[f.key] || ''}
              onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
            />
          </label>
        ))}
        <label className="block text-sm">
          Debts & bills due now (subtracted)
          <input inputMode="decimal" className={input} value={debts} onChange={(e) => setDebts(e.target.value)} />
        </label>
      </section>

      <section className="bg-gradient-to-br from-[#0F766E] to-[#15803D] text-white rounded-2xl p-5">
        <div className="text-sm opacity-80">Net zakatable wealth</div>
        <div className="text-2xl font-black mb-3">{net.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        {!ready ? (
          <p className="text-sm">Enter a metal price above to check against the nisab.</p>
        ) : net >= nisab ? (
          <>
            <div className="text-sm opacity-80">Zakat due (2.5%)</div>
            <div className="text-4xl font-black text-[#E6C86A]">{due.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </>
        ) : (
          <p className="text-sm">Below the nisab — zakat is not obligatory on this wealth. Voluntary sadaqah is always encouraged.</p>
        )}
      </section>
      <p className="text-xs text-gray-500 mt-4">
        Zakat applies to wealth held for one full lunar year. Scholars differ on details (jewellery, retirement funds, etc.) —
        consult a qualified scholar for your situation.
      </p>
    </div>
  )
}
