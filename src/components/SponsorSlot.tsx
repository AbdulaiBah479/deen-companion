'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Sponsor } from '@/lib/support-shared'

// The one labelled sponsor line. Shown only where it is mounted (home and More), never on worship screens. Renders nothing when there is no sponsor.
export default function SponsorSlot() {
  const [s, setS] = useState<Sponsor | null>(null)
  useEffect(() => {
    fetch('/api/support')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setS(d?.sponsor ?? null))
      .catch(() => {})
  }, [])
  if (!s) return null
  return (
    <aside className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm flex items-center gap-2" aria-label="Sponsored" data-testid="sponsor-slot">
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 border border-gray-300 rounded px-1.5 py-0.5">Sponsored</span>
      <a href={s.url} target="_blank" rel="sponsored noopener noreferrer" className="flex-1 min-w-0 truncate">
        <strong>{s.name}</strong> <span className="text-gray-600">· {s.line}</span>
      </a>
      <Link href="/support" className="text-[11px] text-gray-500 underline shrink-0">Why?</Link>
    </aside>
  )
}
