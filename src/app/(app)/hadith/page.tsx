'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import LangSelect from '@/components/LangSelect'
import { HADITH_BOOKS } from '@/lib/hadith'
import { isRtl, useLang } from '@/lib/languages'
import { localDateKey } from '@/lib/storage'

type Hadith = { hadithnumber: number; text: string }

function HadithBrowser() {
  const params = useSearchParams()
  const { lang, ready: langReady } = useLang()
  const latest = useRef(0)
  const [hadith, setHadith] = useState<Hadith | null>(null)
  const [label, setLabel] = useState("Today's Hadith — Sahih al-Bukhari")
  const [book, setBook] = useState<string>(params.get('book') || HADITH_BOOKS[0].id)
  const [number, setNumber] = useState(params.get('number') || '1')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(url: string, title: string) {
    const mine = ++latest.current // only the most recent request may update the page
    setLoading(true)
    setError('')
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (mine !== latest.current) return
      if (!res.ok || !data.hadith) throw new Error()
      setHadith(data.hadith)
      setLabel(title)
    } catch {
      if (mine !== latest.current) return
      setHadith(null)
      setError('Hadith not found. Try a different number.')
    } finally {
      if (mine === latest.current) setLoading(false)
    }
  }

  const bookName = (id: string) => HADITH_BOOKS.find((b) => b.id === id)?.name ?? id

  useEffect(() => {
    if (!langReady) return
    const b = params.get('book')
    const n = params.get('number')
    if (b && n) load(`/api/hadith?book=${b}&number=${n}&lang=${lang}`, `${bookName(b)} #${n}`)
    else load(`/api/hadith?date=${localDateKey()}&lang=${lang}`, "Today's Hadith — Sahih al-Bukhari")
  }, [lang, langReady, params])

  function lookup(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(number)
    if (!Number.isInteger(n) || n < 1) {
      setError('Enter a valid hadith number.')
      return
    }
    load(`/api/hadith?book=${book}&number=${n}&lang=${lang}`, `${bookName(book)} #${n}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-2xl font-black text-[#0F766E]">Hadith</h1>
        <LangSelect />
      </div>

      <form onSubmit={lookup} className="flex gap-2 mb-5">
        <select
          value={book}
          onChange={(e) => setBook(e.target.value)}
          aria-label="Collection"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 bg-white"
        >
          {HADITH_BOOKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="numeric"
          aria-label="Hadith number"
          className="w-24 px-3 py-2 rounded-lg border border-gray-300 bg-white"
        />
        <button className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">Find</button>
      </form>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {hadith && !loading && (
        <article className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="text-xs font-bold text-gold uppercase tracking-wide mb-2">{label}</div>
          <p className="leading-relaxed text-gray-800" dir={isRtl(lang) ? 'rtl' : 'ltr'}>
            {hadith.text}
          </p>
        </article>
      )}
      <p className="text-xs text-gray-500 mt-4">
        Not every collection is available in every language; English is shown where a translation doesn’t exist.
      </p>
    </div>
  )
}

export default function HadithPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <HadithBrowser />
    </Suspense>
  )
}
