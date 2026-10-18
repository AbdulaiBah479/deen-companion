'use client'

import { useState } from 'react'
import { localDateKey, useStored } from '@/lib/storage'

type Gift = { id: string; date: string; amount: number; note: string }

// Set NEXT_PUBLIC_DONATE_URL in .env.local to a donation page you control (e.g. a Stripe Payment Link).
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL

export default function DonatePage() {
  const [gifts, setGifts] = useStored<Gift[]>('deen:sadaqah', [])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const total = gifts.reduce((s, g) => s + g.amount, 0)

  function add(e: React.FormEvent) {
    e.preventDefault()
    const n = parseFloat(amount)
    if (!Number.isFinite(n) || n <= 0) return
    setGifts((g) => [{ id: `${Date.now()}`, date: localDateKey(), amount: n, note: note.trim() }, ...g])
    setAmount('')
    setNote('')
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Sadaqah Journal</h1>
      <blockquote className="text-sm text-gray-600 border-l-4 border-[#D4AF37] pl-3 mb-5">
        “Charity does not decrease wealth.” — Sahih Muslim 2588
      </blockquote>

      {DONATE_URL && (
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center w-full py-3 rounded-xl bg-[#D4AF37] text-[#1a0e00] font-bold mb-5"
        >
          Support Deen Companion ↗
        </a>
      )}

      <form onSubmit={add} className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 space-y-3">
        <p className="text-sm text-gray-600">
          Keep a private record of your giving. Give through any charity or person you trust — this app does not handle money.
        </p>
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Amount"
            aria-label="Amount"
            className="w-28 px-3 py-2 rounded-lg border border-gray-300"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Note"
            maxLength={120}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300"
          />
          <button className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">Add</button>
        </div>
      </form>

      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Your giving</h2>
        <span className="font-semibold text-[#0F766E]">Total: {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>
      {gifts.length === 0 && <p className="text-gray-500 text-sm">Nothing logged yet.</p>}
      <ul className="space-y-2">
        {gifts.map((g) => (
          <li key={g.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <span>
              <span className="font-semibold">{g.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              {g.note && <span className="text-gray-600"> · {g.note}</span>}
              <span className="block text-xs text-gray-500">{g.date}</span>
            </span>
            <button
              onClick={() => setGifts((all) => all.filter((x) => x.id !== g.id))}
              aria-label="Delete entry"
              className="text-gray-500 hover:text-red-600"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
