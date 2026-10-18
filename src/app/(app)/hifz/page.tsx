'use client'

import { useEffect, useRef, useState } from 'react'
import { compareRecitation } from '@/lib/arabic'
import { useLang } from '@/lib/languages'
import { getVerseAudioUrl, RECITERS } from '@/lib/quran'
import { isDue, newStoredCard, previewIntervals, review, type ReviewGrade, type StoredCard } from '@/lib/srs'
import { useStored } from '@/lib/storage'

type Surah = { id: number; name_simple: string; name_arabic: string; verses_count: number }
type Verse = { verse_number: number; text_uthmani: string; translations?: { text: string }[] }
type Plan = Record<string, { name: string; total: number; cards: Record<string, StoredCard> }>

const BATCH = 3
const LANG_INDEX = ['en', 'ur', 'fr', 'id', 'tr', 'bn', 'es', 'ha', 'de', 'ru', 'ms', 'so', 'sw']
const stripHtml = (s: string) => s.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]*>/g, '')

type SR = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
const getSR = (): (new () => SR) | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export default function HifzPage() {
  const { lang } = useLang()
  const [plan, setPlan, ready] = useStored<Plan>('deen:hifz', {})
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [query, setQuery] = useState('')
  const [verses, setVerses] = useState<Record<number, Verse[]>>({})
  const [queue, setQueue] = useState<{ surah: number; verse: number }[] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recRef = useRef<SR | null>(null)
  const heardRef = useRef('')
  const [hasSR, setHasSR] = useState(false)
  const [reciting, setReciting] = useState(false)
  const [result, setResult] = useState<{ words: string[]; matched: boolean[]; score: number } | null>(null)

  useEffect(() => {
    fetch('/api/quran/surahs')
      .then((r) => r.json())
      .then((d) => setSurahs(d.surahs || []))
      .catch(() => setError('Could not load surahs.'))
    setHasSR(!!getSR())
    return () => {
      audioRef.current?.pause()
      recRef.current?.stop()
    }
  }, [])

  async function ensureVerses(surah: number): Promise<Verse[]> {
    const cacheKey = surah * 100 + LANG_INDEX.indexOf(lang)
    if (verses[cacheKey]) return verses[cacheKey]
    const d = await (await fetch(`/api/quran/surah/${surah}?lang=${lang}`)).json()
    if (!d.verses?.length) throw new Error('no verses')
    setVerses((v) => ({ ...v, [cacheKey]: d.verses }))
    return d.verses
  }

  async function addVerses(s: Surah) {
    setBusy(true)
    setError('')
    try {
      await ensureVerses(s.id)
      setPlan((p) => {
        const entry = p[s.id] ?? { name: s.name_simple, total: s.verses_count, cards: {} }
        const have = Object.keys(entry.cards).length
        const cards = { ...entry.cards }
        for (let v = have + 1; v <= Math.min(s.verses_count, have + BATCH); v++) cards[v] = newStoredCard()
        return { ...p, [s.id]: { ...entry, cards } }
      })
    } catch {
      setError('Could not load that surah. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function startReview() {
    setBusy(true)
    setError('')
    try {
      const due: { surah: number; verse: number }[] = []
      for (const [sid, entry] of Object.entries(plan)) {
        for (const [v, card] of Object.entries(entry.cards)) {
          if (isDue(card)) due.push({ surah: Number(sid), verse: Number(v) })
        }
      }
      await Promise.all([...new Set(due.map((d) => d.surah))].map(ensureVerses))
      setQueue(due)
      setRevealed(false)
    } catch {
      setError('Could not load verses for review. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function play(surah: number, verse: number) {
    audioRef.current?.pause()
    const a = new Audio(getVerseAudioUrl(surah, verse, RECITERS[0].folder))
    audioRef.current = a
    a.play().catch(() => {})
  }

  function grade(g: ReviewGrade) {
    if (!queue?.length) return
    const { surah, verse } = queue[0]
    setPlan((p) => {
      const entry = p[surah]
      return { ...p, [surah]: { ...entry, cards: { ...entry.cards, [verse]: review(entry.cards[verse], g) } } }
    })
    setQueue((q) => {
      if (!q) return q
      const [first, ...rest] = q
      return g === 'again' ? [...rest, first] : rest
    })
    setRevealed(false)
    setResult(null)
  }

  function recite(expected: string) {
    const SRC = getSR()
    if (!SRC) return
    setResult(null)
    heardRef.current = ''
    const rec = new SRC()
    rec.lang = 'ar-SA'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      heardRef.current = Array.from(e.results).map((r) => r[0].transcript).join(' ')
    }
    rec.onerror = () => setReciting(false)
    rec.onend = () => {
      setReciting(false)
      setResult(compareRecitation(expected, heardRef.current))
      setRevealed(true)
    }
    recRef.current = rec
    rec.start()
    setReciting(true)
  }

  // Review session
  if (queue) {
    const cur = queue[0]
    const verse = cur ? verses[cur.surah * 100 + LANG_INDEX.indexOf(lang)]?.find((v) => v.verse_number === cur.verse) : null
    const card = cur ? plan[cur.surah]?.cards[cur.verse] : null
    return (
      <div>
        <button
          onClick={() => {
            audioRef.current?.pause()
            setQueue(null)
          }}
          className="text-[#0F766E] font-semibold text-sm mb-3"
        >
          ← Back to plan
        </button>
        {!cur || !verse || !card ? (
          <div className="text-center bg-white border border-gray-200 rounded-2xl p-8">
            <div className="text-5xl mb-2">🌟</div>
            <h2 className="text-xl font-bold">Review complete</h2>
            <p className="text-gray-500 mt-1">MashaAllah! Come back when more verses are due.</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              {queue.length} due · {plan[cur.surah].name} {cur.surah}:{cur.verse}
            </p>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
              <p className="text-xs text-gray-500 mb-2">Recite from memory, then reveal</p>
              <p className="text-gray-700 mb-4">{verse.translations?.[0] && stripHtml(verse.translations[0].text)}</p>
              <button onClick={() => play(cur.surah, cur.verse)} className="text-[#0F766E] font-semibold text-sm">
                ▶ Hear it
              </button>
              {hasSR && (
                <div className="mt-3">
                  {!reciting ? (
                    <button onClick={() => recite(verse.text_uthmani)} className="text-[#0F766E] font-semibold text-sm border border-[#0F766E] rounded-lg px-3 py-1">
                      🎤 Recite it &amp; check
                    </button>
                  ) : (
                    <button onClick={() => recRef.current?.stop()} className="bg-red-600 text-white font-semibold text-sm rounded-lg px-3 py-1 animate-pulse">
                      ⏹ Done reciting
                    </button>
                  )}
                </div>
              )}
              {result && (
                <div className="mt-3 text-sm">
                  <p className="font-semibold mb-1">
                    {Math.round(result.score * 100)}% of the words matched
                    {result.score >= 0.9 ? ' — excellent!' : result.score >= 0.6 ? ' — good, review the red words' : ' — keep practising'}
                  </p>
                  <p className="text-xl leading-[2.2]" dir="rtl" lang="ar">
                    {result.words.map((w, i) => (
                      <span key={i} className={result.matched[i] ? 'text-green-700' : 'text-red-600 underline'}>
                        {w}{' '}
                      </span>
                    ))}
                  </p>
                  <p className="text-xs text-gray-500">Speech recognition can mishear — treat this as a guide, not a verdict.</p>
                </div>
              )}
              {revealed && (
                <p className="text-3xl leading-[2.3] mt-5 pt-5 border-t border-gray-200" dir="rtl" lang="ar">
                  {verse.text_uthmani}
                </p>
              )}
            </div>
            {!revealed ? (
              <button onClick={() => setRevealed(true)} className="mt-4 w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
                Reveal verse
              </button>
            ) : (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {(['again', 'hard', 'good', 'easy'] as ReviewGrade[]).map((g) => (
                  <button key={g} onClick={() => grade(g)} className="py-3 rounded-xl border-2 border-gray-300 bg-white capitalize text-sm font-semibold hover:border-[#0F766E]">
                    {g}
                    <span className="block text-[10px] text-gray-500 font-normal">{previewIntervals(card)[g]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const entries = Object.entries(plan)
  const dueTotal = ready
    ? entries.reduce((n, [, e]) => n + Object.values(e.cards).filter((c) => isDue(c)).length, 0)
    : 0
  const q = query.trim().toLowerCase()
  const matches = q
    ? surahs.filter((s) => s.name_simple.toLowerCase().includes(q) || String(s.id) === q).slice(0, 6)
    : []

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Hifz Coach</h1>
      <p className="text-gray-500 text-sm mb-4">
        Add {BATCH} verses at a time. Each verse is reviewed on an FSRS spaced-repetition schedule — recite from memory,
        reveal, then rate yourself honestly.
      </p>

      <button
        onClick={startReview}
        disabled={busy || dueTotal === 0}
        className="w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-50 mb-5"
      >
        {dueTotal > 0 ? `Start review (${dueTotal} due)` : 'Nothing due right now'}
      </button>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <h2 className="font-bold mb-2">Your plan</h2>
      {entries.length === 0 && <p className="text-gray-500 text-sm mb-4">Search for a surah below to begin.</p>}
      <ul className="space-y-2 mb-6">
        {entries.map(([sid, e]) => {
          const n = Object.keys(e.cards).length
          return (
            <li key={sid} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between font-semibold">
                <span>
                  {e.name} <span className="text-gray-500 font-normal">({sid})</span>
                </span>
                <span className="text-sm text-gray-500">
                  {n}/{e.total} verses
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full my-2 overflow-hidden">
                <div className="h-full bg-[#D4AF37]" style={{ width: `${(n / e.total) * 100}%` }} />
              </div>
              {n < e.total && (
                <button
                  onClick={() => addVerses({ id: Number(sid), name_simple: e.name, name_arabic: '', verses_count: e.total })}
                  disabled={busy}
                  className="text-sm font-semibold text-[#0F766E]"
                >
                  + Add next {Math.min(BATCH, e.total - n)} verses
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <h2 className="font-bold mb-2">Add a surah</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search surah name or number…"
        aria-label="Search surah"
        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white mb-2"
      />
      <ul className="space-y-2">
        {matches.map((s) => (
          <li key={s.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <span>
              {s.id}. {s.name_simple} <span className="text-gray-500 text-sm">· {s.verses_count} verses</span>
            </span>
            <button onClick={() => addVerses(s)} disabled={busy || !!plan[s.id]} className="text-sm font-semibold text-[#0F766E] disabled:text-gray-500">
              {plan[s.id] ? 'Added' : `Start (${BATCH} verses)`}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
