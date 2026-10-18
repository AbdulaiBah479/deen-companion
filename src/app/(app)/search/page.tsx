'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import LangSelect from '@/components/LangSelect'
import { isRtl, useLang } from '@/lib/languages'

type QuranHit = { key: string; arabic: string; text: string }
type HadithHit = { book: string; bookId: string; number: number; text: string }

function Search() {
  const params = useSearchParams()
  const { lang } = useLang()
  const [q, setQ] = useState(params.get('q') ?? '')
  const autoRan = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState<{ quran: QuranHit[]; hadith: HadithHit[] } | null>(null)

  async function run(e?: React.FormEvent) {
    e?.preventDefault()
    if (q.trim().length < 2) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&lang=${lang}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRes(d)
    } catch (err) {
      setRes(null)
      setError(err instanceof Error && err.message ? err.message : 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.get('q') && !autoRan.current) {
      autoRan.current = true
      run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Search</h1>
      <p className="text-gray-500 text-sm mb-4">
        Search the Quran and hadith by meaning — e.g. “patience”, “kindness to parents”, “fasting”.
      </p>
      <form onSubmit={run} className="flex gap-2 mb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          aria-label="Search query"
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-300 bg-white"
        />
        <button disabled={loading} className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-50">
          {loading ? '…' : 'Search'}
        </button>
      </form>
      <div className="mb-5 flex items-center gap-2 text-sm text-gray-500">
        Show translations in <LangSelect />
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {res && (
        <div className="space-y-6">
          <section>
            <h2 className="font-bold mb-2">Quran ({res.quran.length})</h2>
            {res.quran.length === 0 && <p className="text-gray-500 text-sm">No verses matched.</p>}
            <ul className="space-y-3">
              {res.quran.map((h) => (
                <li key={h.key} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <Link href={`/quran/${h.key.split(':')[0]}`} className="text-xs font-bold bg-[#0F766E]/10 text-[#0F766E] px-2 py-1 rounded-full">
                    {h.key}
                  </Link>
                  <p className="text-right text-2xl leading-[2.2] mt-2" dir="rtl" lang="ar">
                    {h.arabic}
                  </p>
                  <p className="text-gray-700 mt-1" dir={isRtl(lang) ? 'rtl' : 'ltr'}>
                    {h.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-bold mb-2">Hadith ({res.hadith.length})</h2>
            {res.hadith.length === 0 && <p className="text-gray-500 text-sm">No hadith matched.</p>}
            <ul className="space-y-3">
              {res.hadith.map((h) => (
                <li key={`${h.bookId}-${h.number}`} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <Link
                    href={`/hadith?book=${h.bookId}&number=${h.number}`}
                    className="text-xs font-bold text-gold uppercase"
                  >
                    {h.book} #{h.number}
                  </Link>
                  <p className="text-gray-800 mt-1 leading-relaxed">{h.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Search />
    </Suspense>
  )
}
