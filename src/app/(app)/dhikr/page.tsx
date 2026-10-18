'use client'

import { useState } from 'react'
import { useStored } from '@/lib/storage'

const PRESETS = [
  { id: 'subhanallah', ar: 'سُبْحَانَ ٱللَّهِ', en: 'SubhanAllah', target: 33 },
  { id: 'alhamdulillah', ar: 'ٱلْحَمْدُ لِلَّهِ', en: 'Alhamdulillah', target: 33 },
  { id: 'allahuakbar', ar: 'ٱللَّهُ أَكْبَرُ', en: 'Allahu Akbar', target: 34 },
  { id: 'istighfar', ar: 'أَسْتَغْفِرُ ٱللَّهَ', en: 'Astaghfirullah', target: 100 },
]

export default function DhikrPage() {
  const [active, setActive] = useState(PRESETS[0])
  const [counts, setCounts] = useStored<Record<string, number>>('deen:dhikr', {})

  const count = counts[active.id] || 0
  const pct = Math.min(100, Math.round((count / active.target) * 100))

  function tap() {
    setCounts((c) => ({ ...c, [active.id]: (c[active.id] || 0) + 1 }))
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(10)
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-black text-[#0F766E] mb-4 text-left">Dhikr Counter</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className={`px-3 py-2 rounded-full text-sm font-semibold border ${
              active.id === p.id ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white border-gray-300'
            }`}
          >
            {p.en}
          </button>
        ))}
      </div>

      <p className="text-4xl mb-1" dir="rtl" lang="ar">
        {active.ar}
      </p>
      <p className="text-gray-500 mb-6">{active.en}</p>

      <button
        onClick={tap}
        aria-label={`Count ${active.en}`}
        className="w-56 h-56 rounded-full bg-gradient-to-br from-[#0F766E] to-[#15803D] text-white shadow-lg active:scale-95 transition-transform mx-auto flex flex-col items-center justify-center"
      >
        <span className="text-6xl font-black">{count}</span>
        <span className="text-sm opacity-80">of {active.target}</span>
      </button>

      <div className="h-2 bg-gray-200 rounded-full mt-6 overflow-hidden">
        <div className="h-full bg-[#D4AF37]" style={{ width: `${pct}%` }} />
      </div>
      {count >= active.target && <p className="mt-3 text-[#0F766E] font-semibold">MashaAllah! Target reached 🎉</p>}

      <button
        onClick={() => setCounts((c) => ({ ...c, [active.id]: 0 }))}
        className="mt-6 text-sm text-gray-500 underline"
      >
        Reset this counter
      </button>
    </div>
  )
}
