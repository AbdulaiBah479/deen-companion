'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import LangSelect from '@/components/LangSelect'
import { HADITH_BOOKS } from '@/lib/hadith'
import { isRtl, useLang } from '@/lib/languages'
import { localDateKey } from '@/lib/storage'

type Hadith = { hadithnumber: number; text: string; arabic?: string; grade?: string }
type Section = { id: number; name: string; first: number; last: number; count: number }

const BLURB: Record<string, string> = {
  bukhari: 'The most trusted collection · 97 books',
  muslim: 'Second most trusted · 56 books',
  abudawud: 'Rulings and daily practice',
  tirmidhi: 'With the scholar’s comments',
  nasai: 'Prayer, purification, fasting',
  ibnmajah: 'Completes the six books',
  malik: 'The earliest collection, from Madinah',
  nawawi: '42 short, essential hadith',
  qudsi: 'Words of Allah, told by the Prophet ﷺ',
}

const bookName = (id: string) => HADITH_BOOKS.find((b) => b.id === id)?.name ?? id

function Card({ h, book, rtl }: { h: Hadith; book: string; rtl: boolean }) {
  const [note, setNote] = useState('')
  const ref = `${bookName(book)} #${h.hadithnumber}`
  async function copy() {
    const text = [h.arabic, h.text, ref].filter(Boolean).join(String.fromCharCode(10,10))
    try {
      await navigator.clipboard.writeText(text)
      setNote('Copied')
    } catch {
      setNote('Could not copy')
    }
    setTimeout(() => setNote(''), 1800)
  }
  async function share() {
    const text = [h.text, ref].join(String.fromCharCode(10, 10))
    try {
      if (navigator.share) await navigator.share({ title: ref, text, url: location.origin + `/hadith?book=${book}&number=${h.hadithnumber}` })
      else await copy()
    } catch {}
  }
  return (
    <article className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/hadith?book=${book}&number=${h.hadithnumber}`} className="text-xs font-bold text-gold uppercase tracking-wide">
          {ref}
        </Link>
        {h.grade && <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 shrink-0">{h.grade}</span>}
      </div>
      {h.arabic && (
        <p className="text-right leading-[2.1] text-xl mt-2" style={{ fontFamily: 'var(--font-quran), serif' }} dir="rtl" lang="ar">
          {h.arabic}
        </p>
      )}
      <p className="leading-relaxed text-gray-800 mt-2" dir={rtl ? 'rtl' : 'ltr'}>
        {h.text}
      </p>
      <div className="flex items-center gap-4 mt-3 text-sm font-semibold text-[#0F766E]">
        <button onClick={copy}>📋 Copy</button>
        <button onClick={share}>📤 Share</button>
        {note && (
          <span className="text-xs text-gray-500" role="status">
            {note}
          </span>
        )}
      </div>
    </article>
  )
}

// Hadith of the day + every collection, so there is always something to read without searching.
function Home({ lang, rtl }: { lang: string; rtl: boolean }) {
  const [today, setToday] = useState<Hadith | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let off = false
    fetch(`/api/hadith?date=${localDateKey()}&lang=${lang}`)
      .then((r) => r.json())
      .then((d) => !off && (d.hadith ? setToday(d.hadith) : setFailed(true)))
      .catch(() => !off && setFailed(true))
    return () => {
      off = true
    }
  }, [lang])
  return (
    <div>
      <section className="rounded-2xl p-4 bg-gradient-to-br from-[#0F766E] to-[#15803D] text-white mb-5">
        <div className="text-xs font-bold uppercase tracking-wide text-[#E6C86A] mb-1">Hadith of the day · Sahih al-Bukhari</div>
        {today ? (
          <p className="leading-relaxed line-clamp-6" dir={rtl ? 'rtl' : 'ltr'}>
            {today.text}
          </p>
        ) : failed ? (
          <p className="text-sm opacity-90">Could not load today’s hadith. Pick a collection below.</p>
        ) : (
          <div className="space-y-2" aria-label="Loading">
            <div className="h-3 rounded bg-white/25 w-full" />
            <div className="h-3 rounded bg-white/25 w-11/12" />
            <div className="h-3 rounded bg-white/25 w-2/3" />
          </div>
        )}
        {today && (
          <Link href={`/hadith?book=bukhari&number=${today.hadithnumber}`} className="inline-block mt-2 text-sm font-semibold underline">
            Read in full →
          </Link>
        )}
      </section>

      <h2 className="font-bold mb-2">Collections</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
        {HADITH_BOOKS.map((b) => (
          <Link key={b.id} href={`/hadith?book=${b.id}`} className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 hover:border-[#0F766E]">
            <span className="text-2xl shrink-0" aria-hidden="true">
              📚
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-sm leading-tight">{b.name}</span>
              <span className="block text-[11px] text-gray-500 leading-tight">{BLURB[b.id]}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// The chapters ("Faith", "Prayer", "Fasting"…) of one collection.
function Chapters({ book }: { book: string }) {
  const [sections, setSections] = useState<Section[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let off = false
    setSections(null)
    setError('')
    fetch(`/api/hadith/sections?book=${book}`)
      .then((r) => r.json())
      .then((d) => {
        if (off) return
        if (d.sections) setSections(d.sections)
        else setError(d.error || 'Could not load the chapters.')
      })
      .catch(() => !off && setError('Could not load the chapters. Check your connection.'))
    return () => {
      off = true
    }
  }, [book])
  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">Choose a chapter to read its hadith.</p>
      {error && <p className="text-red-600">{error}</p>}
      {!sections && !error && (
        <div className="space-y-2" aria-label="Loading">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100" />
          ))}
        </div>
      )}
      {sections && (
        <ul className="space-y-2">
          {sections.map((s) => (
            <li key={s.id}>
              <Link href={`/hadith?book=${book}&section=${s.id}`} className="bg-white border border-gray-200 rounded-xl px-3 py-3 flex items-center justify-between gap-3 hover:border-[#0F766E]">
                <span className="font-semibold text-sm min-w-0">{s.name}</span>
                <span className="text-xs text-gray-500 shrink-0">{s.count} hadith</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// The hadith of one chapter, twenty at a time.
function ChapterHadith({ book, section, lang, rtl }: { book: string; section: number; lang: string; rtl: boolean }) {
  const [items, setItems] = useState<Hadith[]>([])
  const [name, setName] = useState('')
  const [total, setTotal] = useState(0)
  const [next, setNext] = useState<number | null>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const token = useRef(0)

  const more = useCallback(
    async (offset: number, reset: boolean) => {
      const mine = ++token.current
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/hadith/section?book=${book}&n=${section}&lang=${lang}&offset=${offset}&limit=20`)
        const d = await res.json()
        if (mine !== token.current) return
        if (!res.ok) throw new Error(d.error)
        setName(d.section.name)
        setTotal(d.section.count)
        setItems((cur) => (reset ? d.hadiths : [...cur, ...d.hadiths]))
        setNext(d.nextOffset)
      } catch (e) {
        if (mine === token.current) setError(e instanceof Error && e.message ? e.message : 'Could not load these hadith.')
      } finally {
        if (mine === token.current) setLoading(false)
      }
    },
    [book, section, lang]
  )

  useEffect(() => {
    setItems([])
    setNext(0)
    void more(0, true)
  }, [more])

  return (
    <div>
      {name && (
        <p className="text-sm text-gray-500 mb-3">
          <span className="font-semibold text-gray-800">{name}</span> · {total} hadith
        </p>
      )}
      <div className="space-y-3">
        {items.map((h) => (
          <Card key={h.hadithnumber} h={h} book={book} rtl={rtl} />
        ))}
      </div>
      {loading && <p className="text-gray-500 mt-3">Loading…</p>}
      {error && (
        <p className="text-red-600 mt-3">
          {error}{' '}
          <button onClick={() => void more(items.length, items.length === 0)} className="underline font-semibold">
            Try again
          </button>
        </p>
      )}
      {next !== null && !loading && !error && items.length > 0 && (
        <button onClick={() => void more(next, false)} className="mt-4 w-full py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold">
          Show more
        </button>
      )}
    </div>
  )
}

// One hadith by number (also how links from search results and the companion open).
function One({ book, number, lang, rtl }: { book: string; number: string; lang: string; rtl: boolean }) {
  const [hadith, setHadith] = useState<Hadith | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let off = false
    setHadith(null)
    setError('')
    fetch(`/api/hadith?book=${book}&number=${number}&lang=${lang}`)
      .then(async (r) => {
        const d = await r.json()
        if (off) return
        if (!r.ok || !d.hadith) setError('Hadith not found. Try a different number.')
        else setHadith(d.hadith)
      })
      .catch(() => !off && setError('Could not load this hadith. Check your connection.'))
    return () => {
      off = true
    }
  }, [book, number, lang])
  return (
    <div>
      {error && <p className="text-red-600">{error}</p>}
      {!hadith && !error && <p className="text-gray-500">Loading…</p>}
      {hadith && <Card h={hadith} book={book} rtl={rtl} />}
    </div>
  )
}

function HadithBrowser() {
  const params = useSearchParams()
  const { lang } = useLang()
  const rtl = isRtl(lang)
  const book = params.get('book') ?? ''
  const valid = HADITH_BOOKS.some((b) => b.id === book)
  const sectionParam = params.get('section')
  const number = params.get('number')
  const section = sectionParam !== null && sectionParam !== '' ? Number(sectionParam) : null

  let title = 'Hadith'
  let back: { href: string; label: string } | null = null
  if (valid) {
    title = bookName(book)
    back = { href: '/hadith', label: 'All collections' }
    if (section !== null && Number.isInteger(section)) back = { href: `/hadith?book=${book}`, label: bookName(book) }
    else if (number) back = { href: `/hadith?book=${book}`, label: `${bookName(book)} chapters` }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h1 className="text-2xl font-black text-[#0F766E] min-w-0">{title}</h1>
        <LangSelect />
      </div>
      {back && (
        <Link href={back.href} className="inline-block text-sm font-semibold text-[#0F766E] mb-3">
          ← {back.label}
        </Link>
      )}

      {!valid && <Home lang={lang} rtl={rtl} />}
      {valid && section !== null && Number.isInteger(section) && <ChapterHadith book={book} section={section} lang={lang} rtl={rtl} />}
      {valid && section === null && number && <One book={book} number={number} lang={lang} rtl={rtl} />}
      {valid && section === null && !number && <Chapters book={book} />}

      {valid && (section === null || !Number.isInteger(section)) && !number && (
        <JumpTo book={book} />
      )}
      {!valid && (
        <>
          <JumpTo book="bukhari" pickBook />
          <p className="text-xs text-gray-500 mt-4">Not every collection is available in every language; English is shown where a translation doesn’t exist.</p>
        </>
      )}
    </div>
  )
}

// For people who already know a hadith number.
function JumpTo({ book: initial, pickBook }: { book: string; pickBook?: boolean }) {
  const router = useRouter()
  const [book, setBook] = useState(initial)
  const [number, setNumber] = useState('')
  const [error, setError] = useState('')
  return (
    <details className="mt-5 text-sm">
      <summary className="cursor-pointer font-semibold text-[#0F766E]">Go to a hadith number</summary>
      <form
        className="flex gap-2 mt-2"
        onSubmit={(e) => {
          e.preventDefault()
          const n = Number(number)
          if (!Number.isInteger(n) || n < 1) return setError('Enter a valid hadith number.')
          router.push(`/hadith?book=${book}&number=${n}`)
        }}
      >
        {pickBook && (
          <select value={book} onChange={(e) => setBook(e.target.value)} aria-label="Collection" className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 bg-white">
            {HADITH_BOOKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="numeric"
          aria-label="Hadith number"
          placeholder="Number"
          className="w-28 px-3 py-2 rounded-lg border border-gray-300 bg-white"
        />
        <button className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">Go</button>
      </form>
      {error && <p className="text-red-600 mt-1">{error}</p>}
    </details>
  )
}

export default function HadithPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <HadithBrowser />
    </Suspense>
  )
}
