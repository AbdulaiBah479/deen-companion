'use client'

import { useState } from 'react'
import { ITEMS, STATUS_LABEL, lookup, type Status } from '@/lib/halal'

const TONE: Record<Status, string> = { ok: 'bg-green-50 border-green-300 text-green-900', check: 'bg-amber-50 border-amber-300 text-amber-900', avoid: 'bg-red-50 border-red-300 text-red-900' }
const ICON: Record<Status, string> = { ok: '✅', check: '⚠️', avoid: '⛔' }

export default function HalalPage() {
  const [q, setQ] = useState('')
  const [only, setOnly] = useState<Status | undefined>()
  const results = lookup(q, only)
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm ${on ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'border-gray-300'}`
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#0F766E]">Halal ingredient guide</h1>
        <p className="text-sm text-gray-600 mt-1">Type an E-number from a food label (like E471) or an ingredient (like gelatine). Works without internet.</p>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 60))} className="w-full rounded-xl border border-gray-300 p-2" placeholder="E471, gelatine, carmine, rennet…" aria-label="Search ingredients" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
        <button type="button" aria-pressed={!only} className={chip(!only)} onClick={() => setOnly(undefined)}>All ({ITEMS.length})</button>
        {(['ok', 'check', 'avoid'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={only === s} className={chip(only === s)} onClick={() => setOnly(only === s ? undefined : s)}>{ICON[s]} {STATUS_LABEL[s]}</button>
        ))}
      </div>
      {results.length === 0 && <p className="text-sm text-gray-600" data-testid="halal-none">Not in this guide. When you cannot tell what something is, look for a halal certificate from a body you trust, or leave it. “Leave what makes you doubt for what does not make you doubt.” (Tirmidhi)</p>}
      <ul className="space-y-2">
        {results.map((i) => (
          <li key={i.code + i.name} className={`rounded-2xl border p-3 ${TONE[i.status]}`} data-testid="halal-item">
            <p className="font-bold">{ICON[i.status]} {i.code && <span className="mr-1">{i.code} ·</span>}{i.name}</p>
            <p className="text-xs font-semibold">{STATUS_LABEL[i.status]}</p>
            <p className="text-sm mt-1">{i.note}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">A guide, not a fatwa. A label cannot tell us where an ingredient came from, and scholars differ on some of these. When in doubt, ask a scholar you trust or choose a certified product.</p>
    </div>
  )
}
