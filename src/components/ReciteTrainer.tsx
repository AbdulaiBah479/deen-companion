'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAudio } from '@/lib/audio'
import { align, summarize, type WordStatus } from '@/lib/recite-align'
import { localDateKey, useStored } from '@/lib/storage'
import { useSurahData } from '@/lib/surah-list'

type Verse = { verse_number: number; verse_key: string; text_uthmani: string; text_simple: string }
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

export type ReciteLogEntry = { date: string; ref: string; accuracy: number; words: number }
const MAX_VERSES = 15

const STATUS_CLASS: Record<WordStatus, string> = {
  correct: 'text-green-600',
  mistake: 'text-red-600 underline decoration-wavy',
  skipped: 'text-amber-600 underline',
  pending: 'text-gray-500',
}

function Trainer() {
  const params = useSearchParams()
  const audio = useAudio()
  const { surahs } = useSurahData()
  const [surah, setSurah] = useState(Number(params.get('s')) || 112)
  const [from, setFrom] = useState(Number(params.get('from')) || 1)
  const [to, setTo] = useState(Number(params.get('to')) || 0)
  const [verses, setVerses] = useState<Verse[]>([])
  const [loadError, setLoadError] = useState('')
  const [memorize, setMemorize] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [hasSR, setHasSR] = useState(false)
  const [log, setLog] = useStored<ReciteLogEntry[]>('deen:recite-log', [])
  const recRef = useRef<SR | null>(null)
  const activeRef = useRef(false)
  const baseRef = useRef('') // text from earlier recognition sessions (the browser restarts after silence)
  const sessionRef = useRef('')

  const info = surahs.find((s) => s.id === surah)
  const last = Math.min(to || info?.verses_count || from, info?.verses_count ?? 999, from + MAX_VERSES - 1)

  useEffect(() => setHasSR(!!getSR()), [])

  // Load the chosen verses
  useEffect(() => {
    let cancelled = false
    setLoadError('')
    fetch(`/api/quran/surah/${surah}?lang=en`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (!d.verses) throw new Error()
        setVerses((d.verses as Verse[]).filter((v) => v.verse_number >= from && v.verse_number <= last))
      })
      .catch(() => !cancelled && setLoadError('Could not load those verses.'))
    return () => {
      cancelled = true
    }
  }, [surah, from, last])

  const expected = useMemo(() => verses.map((v) => v.text_uthmani).join(' '), [verses])
  const plain = useMemo(() => verses.map((v) => v.text_simple).join(' '), [verses])
  const result = useMemo(() => align(expected, transcript, plain), [expected, transcript, plain])
  const summary = summarize(result)
  const attempted = result.correct + result.mistakes + result.skipped

  const stop = useCallback(() => {
    activeRef.current = false
    recRef.current?.stop()
    setListening(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  function startListening() {
    const SRC = getSR()
    if (!SRC) return
    audio.stop()
    setError('')
    baseRef.current = ''
    sessionRef.current = ''
    setTranscript('')
    activeRef.current = true

    const begin = () => {
      const rec = new SRC()
      rec.lang = 'ar-SA'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (e) => {
        sessionRef.current = Array.from(e.results).map((r) => r[0].transcript).join(' ')
        setTranscript((baseRef.current + ' ' + sessionRef.current).trim())
      }
      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return // normal pauses
        activeRef.current = false
        setListening(false)
        setError(e.error === 'not-allowed' ? 'Microphone permission was denied.' : `Speech recognition error: ${e.error}`)
      }
      rec.onend = () => {
        // Browsers end the session after a pause; carry the text over and keep listening until the user stops.
        baseRef.current = (baseRef.current + ' ' + sessionRef.current).trim()
        sessionRef.current = ''
        if (activeRef.current) {
          try {
            begin()
          } catch {
            setListening(false)
          }
        } else setListening(false)
      }
      recRef.current = rec
      rec.start()
    }
    begin()
    setListening(true)
  }

  // Save the result to the practice log when the user finishes.
  function finish() {
    stop()
    if (attempted > 0 && info) {
      const ref = `${info.name_simple} ${from}${last > from ? `–${last}` : ''}`
      setLog((l) => [...l, { date: localDateKey(), ref, accuracy: Math.round(result.accuracy * 100), words: attempted }].slice(-60))
    }
  }

  const best = log.length ? Math.max(...log.map((l) => l.accuracy)) : null
  const wordsToShow = result.words

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">🎤 Recite</h1>
      <p className="text-gray-500 text-sm mb-4">Recite aloud and the app follows along word by word, marking anything skipped or misread — like having a teacher listen.</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm flex-1 min-w-32">
            Surah
            <select
              value={surah}
              onChange={(e) => {
                setSurah(Number(e.target.value))
                setFrom(1)
                setTo(0)
                setTranscript('')
              }}
              className="block w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
              aria-label="Surah"
            >
              {surahs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.name_simple}
                </option>
              ))}
              {surahs.length === 0 && <option value={surah}>Surah {surah}</option>}
            </select>
          </label>
          <label className="text-sm w-20">
            From
            <input
              type="number"
              min={1}
              max={info?.verses_count ?? 286}
              value={from}
              onChange={(e) => {
                setFrom(Math.max(1, Number(e.target.value) || 1))
                setTranscript('')
              }}
              className="block w-full px-2 py-2 rounded-lg border border-gray-300"
              aria-label="From verse"
            />
          </label>
          <label className="text-sm w-20">
            To
            <input
              type="number"
              min={from}
              max={info?.verses_count ?? 286}
              value={to || last}
              onChange={(e) => {
                setTo(Number(e.target.value) || 0)
                setTranscript('')
              }}
              className="block w-full px-2 py-2 rounded-lg border border-gray-300"
              aria-label="To verse"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={memorize} onChange={(e) => setMemorize(e.target.checked)} />
          Memorisation mode — hide the words until you recite them
        </label>
        {(to || last) - from + 1 >= MAX_VERSES && <p className="text-xs text-gray-500">Up to {MAX_VERSES} verses at a time.</p>}
      </div>

      {loadError && <p className="text-red-600 mb-3">{loadError}</p>}

      {/* The text */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4" aria-label="Verses to recite">
        <p className="text-right" dir="rtl" lang="ar" style={{ fontSize: 'var(--ar-size)', lineHeight: 2.3 }} data-testid="recite-text">
          {wordsToShow.map((w, i) => {
            const st = result.status[i]
            const hidden = memorize && st === 'pending'
            const isCurrent = i === result.cursor && listening
            return (
              <span key={i} data-status={st} className={`${hidden ? 'text-gray-300' : STATUS_CLASS[st]} ${isCurrent ? 'bg-[#D4AF37]/25 rounded px-1' : ''}`}>
                {hidden ? '▒'.repeat(Math.max(2, Math.min(6, w.length - 2))) : w}{' '}
              </span>
            )
          })}
        </p>
        {verses.length > 0 && <p className="text-xs text-gray-500 mt-2">{info?.name_simple} {verses[0].verse_key}{verses.length > 1 ? ` – ${verses[verses.length - 1].verse_key}` : ''}</p>}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        {hasSR ? (
          !listening ? (
            <button onClick={startListening} disabled={!verses.length} className="flex-1 py-4 rounded-xl bg-[#0F766E] text-white font-bold text-lg disabled:opacity-50">
              🎤 Start reciting
            </button>
          ) : (
            <button onClick={finish} className="flex-1 py-4 rounded-xl bg-red-600 text-white font-bold text-lg animate-pulse">
              ⏹ Finish &amp; check
            </button>
          )
        ) : (
          <p className="flex-1 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Live listening needs Chrome or Edge. You can still practise below by typing what you recited.
          </p>
        )}
        <button
          onClick={() => info && verses[0] && audio.playVerse(surah, verses[0].verse_number)}
          disabled={!verses.length}
          className="px-4 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold disabled:opacity-50"
          aria-label="Listen to the reciter first"
        >
          🔊 Listen
        </button>
      </div>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      {listening && <p className="text-sm text-[#0F766E] mb-3">Listening… recite at your own pace. Press finish when you are done.</p>}

      {/* Typed fallback */}
      <details className="mb-4 bg-white border border-gray-200 rounded-2xl p-3">
        <summary className="text-sm font-semibold cursor-pointer">No microphone? Type or paste what you recited</summary>
        <textarea
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          dir="rtl"
          lang="ar"
          rows={3}
          aria-label="What you recited"
          className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-300 text-lg"
        />
        <button
          onClick={() => {
            setTranscript(typed)
          }}
          className="mt-2 px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold"
        >
          Check
        </button>
      </details>

      {/* Result */}
      {attempted > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl p-5 mb-4" aria-live="polite" data-testid="recite-result">
          <p className="font-bold mb-2">{summary.headline}</p>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-green-600" style={{ width: `${Math.round(result.accuracy * 100)}%` }} />
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {result.correct} correct · {result.mistakes} misread · {result.skipped} skipped · accuracy {Math.round(result.accuracy * 100)}%
          </p>
          {summary.detail.length > 0 && (
            <ul className="text-sm space-y-1 mb-3">
              {summary.detail.map((d, i) => (
                <li key={i} className="text-red-700">
                  • {d}
                </li>
              ))}
            </ul>
          )}
          {!listening && (
            <button onClick={finish} className="px-4 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold">
              Save to my practice log
            </button>
          )}
        </section>
      )}

      <p className="text-xs text-gray-500">
        Speech recognition can mishear Quranic Arabic, so treat marks as a guide, not a ruling — a human teacher is the real check.
        {' '}Related: <Link href="/hifz" className="underline">Hifz Coach</Link> · <Link href="/identify" className="underline">Identify a verse</Link>
      </p>

      {log.length > 0 && (
        <section className="mt-5">
          <h2 className="font-bold mb-2">
            Practice log{best !== null ? ` · best ${best}%` : ''}
          </h2>
          <ul className="space-y-1 text-sm">
            {[...log].reverse().slice(0, 8).map((l, i) => (
              <li key={i} className="flex justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                <span>
                  {l.ref} <span className="text-gray-500">· {l.date}</span>
                </span>
                <span className={l.accuracy >= 90 ? 'text-green-700 font-semibold' : 'text-gray-600'}>{l.accuracy}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default function ReciteTrainer() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Trainer />
    </Suspense>
  )
}
