'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Verse = { verse_number: number; text_uthmani: string; translations?: { text: string }[] }
type Match = { key: string; surah: number; surahName?: string; from: number; to: number; score: number; verses: Verse[] }

// Browser speech recognition (Chrome/Edge): free, on-device/cloud by the browser, no API key.
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SRConstructor = new () => SpeechRecognitionLike

function getSR(): SRConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

const confidenceLabel = (score: number) => (score >= 0.85 ? 'Strong match' : score >= 0.6 ? 'Likely' : 'Possible')

export default function IdentifyPage() {
  const [transcript, setTranscript] = useState('')
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hasSR, setHasSR] = useState(false)
  const [manual, setManual] = useState('')
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const transcriptRef = useRef('')

  useEffect(() => {
    setHasSR(!!getSR())
    return () => {
      recRef.current?.stop()
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function identifyText(text: string) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not identify')
      setMatches(data.matches)
      if (!data.matches.length) setError('No matching verse found. Try reciting a little longer, closer to the microphone.')
    } catch (e) {
      setMatches(null)
      setError(e instanceof Error ? e.message : 'Could not identify')
    } finally {
      setBusy(false)
    }
  }

  function startLive() {
    const SR = getSR()
    if (!SR) return
    setError('')
    setMatches(null)
    setTranscript('')
    transcriptRef.current = ''
    const rec = new SR()
    rec.lang = 'ar-SA'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
      transcriptRef.current = text
      setTranscript(text)
    }
    rec.onerror = (e) => {
      setListening(false)
      setError(
        e.error === 'not-allowed'
          ? 'Microphone permission was denied.'
          : e.error === 'no-speech'
            ? 'No speech detected. Try again.'
            : `Speech recognition error: ${e.error}`
      )
    }
    rec.onend = () => {
      setListening(false)
      if (transcriptRef.current.trim()) identifyText(transcriptRef.current)
    }
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  function stopLive() {
    recRef.current?.stop()
  }

  async function recordUpload() {
    setError('')
    setMatches(null)
    setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setListening(false)
        setBusy(true)
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
          const fd = new FormData()
          fd.append('audio', blob, 'recitation.webm')
          const res = await fetch('/api/identify', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Could not identify')
          setTranscript(data.transcript || '')
          setMatches(data.matches)
          if (!data.matches.length) setError('No matching verse found. Try a clearer, longer recitation.')
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not identify')
        } finally {
          setBusy(false)
        }
      }
      mediaRef.current = rec
      rec.start()
      setListening(true)
      setTimeout(() => rec.state === 'recording' && rec.stop(), 15000)
    } catch {
      setError('Could not access the microphone. Check browser permissions.')
    }
  }

  function stopRecording() {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">🎙 Quran Identifier</h1>
      <p className="text-gray-500 text-sm mb-5">
        Recite or play a few seconds of a verse and find which ayah it is — like Shazam for the Quran.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 space-y-3">
        {hasSR ? (
          !listening ? (
            <button onClick={startLive} disabled={busy} className="w-full py-4 rounded-xl bg-[#0F766E] text-white font-bold text-lg disabled:opacity-50">
              🎤 Start listening
            </button>
          ) : (
            <button onClick={stopLive} className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg animate-pulse">
              ⏹ Stop &amp; identify
            </button>
          )
        ) : (
          <p className="text-sm text-gray-600">
            Live listening needs Chrome or Edge. You can still record a clip below (needs a free <code>GROQ_API_KEY</code> on the
            server) or type/paste Arabic text.
          </p>
        )}

        {!listening ? (
          <button onClick={recordUpload} disabled={busy} className="w-full py-2 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold disabled:opacity-50">
            Record a clip instead (Whisper)
          </button>
        ) : (
          !hasSR && (
            <button onClick={stopRecording} className="w-full py-3 rounded-xl bg-red-600 text-white font-bold">
              ⏹ Stop &amp; identify
            </button>
          )
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (manual.trim()) {
              setTranscript(manual)
              identifyText(manual)
            }
          }}
          className="flex gap-2 pt-2 border-t border-gray-100"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            dir="rtl"
            lang="ar"
            placeholder="…or paste Arabic text"
            aria-label="Arabic text"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 text-lg"
          />
          <button disabled={busy || !manual.trim()} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50">
            Find
          </button>
        </form>
      </div>

      {listening && <p className="text-sm text-[#0F766E] mb-2">Listening… recite clearly, then press stop.</p>}
      {busy && <p className="text-sm text-gray-500 mb-2">Identifying…</p>}
      {transcript && (
        <p className="text-sm text-gray-500 mb-4">
          Heard:{' '}
          <span dir="rtl" lang="ar" className="text-base text-gray-800">
            {transcript}
          </span>
        </p>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {matches && matches.length > 0 && (
        <div className="space-y-3">
          {matches.length > 1 && matches[0].score - matches[1].score < 0.03 && (
            <p className="text-xs bg-[#D4AF37]/15 text-[#7a5c00] rounded-lg px-3 py-2">
              This wording appears in more than one place in the Quran — check the candidates below.
            </p>
          )}
          {matches.map((m, i) => (
            <div key={m.key} className={`bg-white border rounded-2xl p-4 ${i === 0 ? 'border-[#0F766E]' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <Link href={`/quran/${m.surah}`} className="font-bold text-[#0F766E]">
                  {m.surahName} {m.key}
                </Link>
                <span className="text-xs text-gray-500">
                  {confidenceLabel(m.score)} · {Math.round(Math.min(1, m.score) * 100)}%
                </span>
              </div>
              {m.verses.map((v) => (
                <div key={v.verse_number} className="mb-2">
                  <p className="text-right text-2xl leading-[2.2]" dir="rtl" lang="ar">
                    {v.text_uthmani}
                  </p>
                  <p className="text-gray-700 text-sm">{v.translations?.[0]?.text}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-6">
        Matching is approximate: speech-to-text can mishear Quranic Arabic. Always confirm in the mushaf.
      </p>
    </div>
  )
}
