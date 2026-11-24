'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { localDateKey, useStored } from '@/lib/storage'

type Gift = { id: string; date: string; amount: number; note: string }

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })
const MAX_AMOUNT = 1_000_000_000

// Sadaqah journal (private, on this device) plus a clear way to support the app itself.
export default function DonatePage() {
  const [gifts, setGifts] = useStored<Gift[]>('deen:sadaqah', [])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [donateUrl, setDonateUrl] = useState<string | null>(null)
  const [undo, setUndo] = useState<Gift | null>(null)

  // The giving link comes from the server, which only passes on a safe https address.
  useEffect(() => {
    let live = true
    fetch('/api/support')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setDonateUrl(typeof d?.donateUrl === 'string' ? d.donateUrl : null))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const total = gifts.reduce((s, g) => s + g.amount, 0)
  const thisMonth = useMemo(() => {
    const m = localDateKey().slice(0, 7)
    return gifts.filter((g) => g.date.startsWith(m)).reduce((s, g) => s + g.amount, 0)
  }, [gifts])

  function add(e: React.FormEvent) {
    e.preventDefault()
    const n = parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) return setError('Please type an amount greater than zero.')
    if (n > MAX_AMOUNT) return setError('That amount is too large.')
    setError('')
    setUndo(null)
    setGifts((g) => [{ id: `${Date.now()}`, date: localDateKey(), amount: Math.round(n * 100) / 100, note: note.trim() }, ...g])
    setAmount('')
    setNote('')
  }

  function remove(g: Gift) {
    setGifts((all) => all.filter((x) => x.id !== g.id))
    setUndo(g)
  }

  function restore() {
    if (!undo) return
    const back = undo
    setGifts((all) => (all.some((x) => x.id === back.id) ? all : [back, ...all].sort((a, b) => b.id.localeCompare(a.id))))
    setUndo(null)
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E] mb-1">Giving</h1>
        <blockquote className="text-sm text-gray-600 border-l-4 border-[#D4AF37] pl-3">“Charity does not decrease wealth.” — Sahih Muslim 2588</blockquote>
      </header>

      <section className="rounded-2xl border border-[#D4AF37]/50 bg-amber-50/60 p-4" aria-label="Support the app" data-testid="donate-support">
        <h2 className="font-bold">Help keep Deen Companion free</h2>
        <p className="text-sm text-gray-700 mt-1">
          The app is free for everyone, with no ads in any worship screen. Hosting and other running costs are paid by voluntary sadaqah. Every contribution is listed in the public ledger.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          {donateUrl && (
            <a href={donateUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-3 rounded-xl bg-[#D4AF37] text-[#1a0e00] font-bold" data-testid="donate-give">
              Support the app ↗
            </a>
          )}
          <Link href="/support" className="flex-1 text-center py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold">
            Where the money goes
          </Link>
          <Link href="/sponsor" className="flex-1 text-center py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold">
            Sponsor the app
          </Link>
        </div>
        {!donateUrl && <p className="text-xs text-gray-600 mt-2">Online giving is not open yet. Check the support page soon, in shā’ Allāh.</p>}
        <p className="text-xs text-gray-600 mt-2">
          This is sadaqah, not zakat. To give zakat, see <Link href="/zakat#causes" className="underline text-[#0F766E]">where your zakat can go</Link>. The app never sees your card or bank details.
        </p>
      </section>

      <section aria-label="Sadaqah journal">
        <h2 className="text-lg font-bold text-[#0F766E] mb-2">Sadaqah journal</h2>
        <form onSubmit={add} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm text-gray-600">Keep a private record of your giving, saved on this device. Give through any charity or person you trust. This app does not handle money.</p>
          <div className="flex gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Amount"
              aria-label="Amount"
              autoComplete="off"
              className="w-28 px-3 py-3 rounded-lg border border-gray-300 text-base"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              aria-label="Note"
              maxLength={120}
              autoComplete="off"
              enterKeyHint="done"
              className="flex-1 min-w-0 px-3 py-3 rounded-lg border border-gray-300 text-base"
            />
            <button className="px-4 min-h-[44px] rounded-lg bg-[#0F766E] text-white font-semibold">Add</button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </form>

        <div className="flex justify-between items-baseline mt-5 mb-2">
          <h3 className="font-bold">Your giving</h3>
          <span className="font-semibold text-[#0F766E]">Total: {fmt(total)}</span>
        </div>
        {gifts.length > 0 && <p className="text-xs text-gray-500 mb-2">This month: {fmt(thisMonth)}</p>}
        {undo && (
          <p role="status" className="text-sm bg-gray-100 rounded-lg px-3 py-2 mb-2 flex justify-between items-center">
            <span>Entry deleted.</span>
            <button onClick={restore} className="font-semibold text-[#0F766E] px-2 min-h-[44px]">
              Undo
            </button>
          </p>
        )}
        {gifts.length === 0 && <p className="text-gray-500 text-sm">Nothing logged yet.</p>}
        <ul className="space-y-2">
          {gifts.map((g) => (
            <li key={g.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
              <span>
                <span className="font-semibold">{fmt(g.amount)}</span>
                {g.note && <span className="text-gray-600"> · {g.note}</span>}
                <span className="block text-xs text-gray-500">{g.date}</span>
              </span>
              <button onClick={() => remove(g)} aria-label="Delete entry" className="text-gray-500 hover:text-red-600 min-w-[44px] min-h-[44px]">
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
