'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ReadAloudBar, useReadAloud, type Para } from '@/components/ReadAloud'
import { bookById } from '@/lib/books'
import { useLang } from '@/lib/languages'
import { useStored } from '@/lib/storage'

type PageData = { page: number; pages: number; paragraphs: string[]; source: { label: string; url: string; licence: string } }
type Aid = { state: 'loading' } | { state: 'done'; text: string; mode: 'translate' | 'explain' } | { state: 'error'; message: string }

// A shelf book: pages of text in English or the Arabic original, a voice to listen to each page, and an AI aid per paragraph.
export default function BookReader({ id }: { id: string }) {
  const book = bookById(id)
  const { lang: appLang } = useLang()
  const [lang, setLang] = useState<'en' | 'ar'>(book?.english ? 'en' : 'ar')
  const [pos, setPos] = useStored<Record<string, number>>('deen:book-pos', {})
  const posKey = `${id}|${lang}`
  const [page, setPage] = useState<number | null>(null)
  const [data, setData] = useState<PageData | null | undefined>(undefined)
  const [aids, setAids] = useState<Record<string, Aid>>({})
  const [jump, setJump] = useState('')
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState<{ state: 'loading' } | { state: 'error'; message: string } | { state: 'done'; answer: string | null; note?: string; excerpts: { page: number; para: number; text: string }[] } | null>(null)

  // The place is restored once, when the book or language changes.
  useEffect(() => {
    setPage(pos[posKey] ?? 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey])

  useEffect(() => {
    if (!book || page === null) return
    let off = false
    setData(undefined)
    fetch(`/api/books/page?id=${id}&lang=${lang}&page=${page}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (off) return
        setData(d)
        setAids({})
        if (d && d.page !== page) setPage(d.page)
      })
      .catch(() => !off && setData(null))
    return () => {
      off = true
    }
  }, [book, id, lang, page])

  const go = (n: number) => {
    setPage(n)
    setPos({ ...pos, [posKey]: n })
    window.scrollTo({ top: 0 })
  }

  const paras = useMemo<Para[]>(() => (data ? data.paragraphs.map((text) => ({ text, lang: lang === 'ar' ? 'ar-SA' : 'en-GB' })) : []), [data, lang])
  const reader = useReadAloud(paras, appLang)

  const ask = async (para: number, mode: 'translate' | 'explain') => {
    const k = `${para}|${mode}`
    setAids((a) => ({ ...a, [k]: { state: 'loading' } }))
    try {
      const r = await fetch('/api/books/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, lang, page, para, mode, to: appLang }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setAids((a) => ({ ...a, [k]: { state: 'done', text: d.text, mode } }))
    } catch (e) {
      setAids((a) => ({ ...a, [k]: { state: 'error', message: e instanceof Error ? e.message : 'Failed' } }))
    }
  }

  async function askBook(e: React.FormEvent) {
    e.preventDefault()
    if (question.trim().length < 3) return
    setAsked({ state: 'loading' })
    try {
      const r = await fetch('/api/books/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, lang, question, to: appLang }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setAsked({ state: 'done', answer: d.answer, note: d.note, excerpts: d.excerpts ?? [] })
    } catch (err) {
      setAsked({ state: 'error', message: err instanceof Error ? err.message : 'Failed' })
    }
  }

  if (!book) {
    return (
      <p className="text-gray-600">
        We could not find that book. <Link href="/books" className="underline text-[#0F766E]">Back to the shelf</Link>
      </p>
    )
  }
  const btn = 'px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm disabled:opacity-40'
  const rtl = lang === 'ar'

  return (
    <div className="space-y-4">
      <Link href="/books" className="text-sm text-[#0F766E] underline">← All books</Link>
      <header>
        <h1 className="text-xl font-black text-[#0F766E]">{book.title}</h1>
        {book.titleAr && <p dir="rtl" lang="ar" className="font-arabic text-xl">{book.titleAr}</p>}
        <p className="text-sm text-gray-600">{book.author} · {book.died}</p>
        <p className="text-sm text-gray-700 mt-1">{book.blurb}</p>
        {book.english && lang === 'en' && (
          <p className="text-xs text-gray-500 mt-1">
            Translated by {book.english.translator} ({book.english.year}). {book.english.note}
          </p>
        )}
        {book.arabic?.note && lang === 'ar' && <p className="text-xs text-gray-500 mt-1">{book.arabic.note}</p>}
      </header>

      {book.english && book.arabic && (
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden" role="group" aria-label="Language of the book">
          <button onClick={() => setLang('en')} aria-pressed={lang === 'en'} className={`px-4 py-1.5 text-sm ${lang === 'en' ? 'bg-[#0F766E] text-white' : 'bg-white'}`}>English</button>
          <button onClick={() => setLang('ar')} aria-pressed={lang === 'ar'} className={`px-4 py-1.5 text-sm ${lang === 'ar' ? 'bg-[#0F766E] text-white' : 'bg-white'}`}>العربية</button>
        </div>
      )}
      {!book.english && <p className="text-xs text-gray-500">This book is available here in the Arabic original. Use “Translate (AI)” on any paragraph for an English translation.</p>}
      {!book.arabic && <p className="text-xs text-gray-500">This book is available here in English only; the original is not on the shelf.</p>}

      <section className="rounded-2xl border border-gray-200 bg-white p-3" aria-label="Ask this book" data-testid="ask-book">
        <form onSubmit={askBook} className="flex gap-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 300))} placeholder="Ask this book a question…" aria-label="Ask this book a question" className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <button disabled={asked?.state === 'loading' || question.trim().length < 3} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold disabled:opacity-50">Ask</button>
        </form>
        {asked?.state === 'loading' && <p className="text-sm text-gray-500 mt-2">Searching the book…</p>}
        {asked?.state === 'error' && <p className="text-sm text-red-700 mt-2" role="alert">{asked.message}</p>}
        {asked?.state === 'done' && (
          <div className="mt-3 space-y-2" dir="ltr">
            {asked.answer ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-sm">
                <p className="text-xs font-bold text-amber-800">Answer written by AI from the passages below only — it can make mistakes</p>
                <p className="mt-1 whitespace-pre-line text-gray-800" data-testid="ask-answer">{asked.answer}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-700">{asked.note}</p>
            )}
            {asked.excerpts.map((x, i) => (
              <blockquote key={i} className="border-l-4 border-[#0F766E] pl-3 text-sm text-gray-700">
                <p dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className={lang === 'ar' ? 'font-arabic text-lg leading-loose' : ''}>[{i + 1}] {x.text}</p>
                <button type="button" onClick={() => go(x.page)} className="text-xs underline text-[#0F766E] mt-1">Open page {x.page}</button>
              </blockquote>
            ))}
          </div>
        )}
      </section>

      {data === undefined && <p className="text-gray-500">Loading the page…</p>}
      {data === null && <p className="text-gray-700 rounded-xl border border-gray-200 bg-white p-4">The book could not be loaded right now. Please try again in a little while.</p>}
      {data && (
        <>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Pages">
            <button onClick={() => go(data.page - 1)} disabled={data.page <= 1} className={btn}>‹ Previous</button>
            <span className="text-sm text-gray-600">Page {data.page} of {data.pages}</span>
            <button onClick={() => go(data.page + 1)} disabled={data.page >= data.pages} className={btn}>Next ›</button>
            <form onSubmit={(e) => { e.preventDefault(); const n = Number(jump); if (n >= 1) go(Math.min(n, data.pages)); setJump('') }} className="flex gap-1 ml-auto">
              <input value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="Go to page" aria-label="Go to page" className="w-24 px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
              <button className={btn}>Go</button>
            </form>
          </nav>
          <ReadAloudBar reader={reader} label="Listen to this page" />
          <article dir={rtl ? 'rtl' : 'ltr'} lang={lang} className="space-y-3" data-testid="book-page">
            {data.paragraphs.map((p, i) => (
              <div key={i} className={`rounded-xl p-3 border ${reader.active === i ? 'border-[#0F766E] bg-teal-50' : 'border-transparent'}`}>
                <p className={`${rtl ? 'font-arabic text-xl leading-[2.1]' : 'leading-relaxed'} text-gray-900`}>{p}</p>
                <div dir="ltr" className="flex flex-wrap gap-3 mt-1 text-xs">
                  <button onClick={() => reader.play(i)} className="underline text-[#0F766E]">🔊 Listen from here</button>
                  <button onClick={() => ask(i, 'translate')} className="underline text-[#0F766E]">Translate (AI)</button>
                  <button onClick={() => ask(i, 'explain')} className="underline text-[#0F766E]">Explain (AI)</button>
                </div>
                {(['translate', 'explain'] as const).map((m) => {
                  const a = aids[`${i}|${m}`]
                  if (!a) return null
                  return (
                    <div dir="ltr" key={m} className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-sm text-gray-800" role="status">
                      {a.state === 'loading' && <p>Working…</p>}
                      {a.state === 'error' && <p className="text-red-700">{a.message}</p>}
                      {a.state === 'done' && (
                        <>
                          <p className="text-xs font-bold text-amber-800">{m === 'translate' ? 'Translation' : 'Explanation'} written by AI — it can make mistakes; do not rely on it for rulings</p>
                          <p className="mt-1 whitespace-pre-line">{a.text}</p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </article>
          <nav className="flex items-center gap-2" aria-label="Pages (bottom)">
            <button onClick={() => go(data.page - 1)} disabled={data.page <= 1} className={btn}>‹ Previous</button>
            <button onClick={() => go(data.page + 1)} disabled={data.page >= data.pages} className={btn}>Next ›</button>
          </nav>
          <p className="text-xs text-gray-500">
            Source: <a href={data.source.url} target="_blank" rel="noopener noreferrer" className="underline text-[#0F766E]">{data.source.label} ↗</a> · {data.source.licence}
          </p>
        </>
      )}
    </div>
  )
}
