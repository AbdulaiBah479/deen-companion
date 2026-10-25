'use client'

import { useEffect, useState } from 'react'
import { useLang } from '@/lib/languages'
import { useStored } from '@/lib/storage'
import { TAFSIRS, defaultTafsirFor } from '@/lib/tafsirs'

type Result = { source: string; paragraphs: string[] } | { error: string }
const cache = new Map<string, Result>()

// Commentary for one verse, with a picker for the source (Ibn Kathir, Ma'arif al-Qur'an, Al-Muyassar, …).
export default function TafsirPanel({ verseKey }: { verseKey: string }) {
  const { lang } = useLang()
  const [pref, setPref] = useStored<number>('deen:tafsir', 0) // 0 = automatic (follows the language)
  const id = pref || defaultTafsirFor(lang)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const k = `${verseKey}|${id}`
    const hit = cache.get(k)
    if (hit) {
      setResult(hit)
      return
    }
    let cancelled = false
    setResult(null)
    fetch(`/api/tafsir?key=${verseKey}&id=${id}`)
      .then(async (r) => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => {
        const res: Result = ok ? { source: d.source, paragraphs: d.paragraphs } : { error: d.error || 'Tafsir unavailable right now. Try again.' }
        if (ok) cache.set(k, res)
        if (!cancelled) setResult(res)
      })
      .catch(() => !cancelled && setResult({ error: 'Tafsir unavailable right now. Try again.' }))
    return () => {
      cancelled = true
    }
  }, [verseKey, id])

  const rtl = TAFSIRS.find((t) => t.id === id)?.lang !== 'en'

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-700 space-y-2 max-h-96 overflow-y-auto" data-testid="tafsir-panel">
      <select
        value={id}
        onChange={(e) => setPref(Number(e.target.value))}
        aria-label="Tafsir source"
        className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-xs"
      >
        {TAFSIRS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {verseKey.includes(':') && (
        <a href={`/tafsir/${verseKey.replace(':', '/')}`} className="inline-block text-xs font-semibold text-[#0F766E] underline">
          Study this verse in depth: explanation, connected verses, listen →
        </a>
      )}
      {!result && <p className="text-gray-500">Loading tafsir…</p>}
      {result && 'error' in result && <p className="text-red-600">{result.error}</p>}
      {result && 'paragraphs' in result && (
        <div dir={rtl ? 'rtl' : 'ltr'} className="space-y-2">
          <p className="text-xs font-bold text-gold uppercase">{result.source}</p>
          {result.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}
