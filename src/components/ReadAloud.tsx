'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { splitForSpeech, voiceLangFor } from '@/lib/speech'
import { useStored } from '@/lib/storage'

export type Para = { text: string; lang?: string } // lang: a voice language such as 'ar-SA'; by default it is worked out from the text

type Chunk = { para: number; text: string; lang: string }
export type Reader = {
  supported: boolean
  state: 'idle' | 'speaking' | 'paused'
  active: number // the paragraph being read, or -1
  rate: number
  setRate: (r: number) => void
  play: (fromPara?: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
  next: () => void
  prev: () => void
  missingVoice: string | null // e.g. 'Arabic' when this device has no voice for part of the text
}

// Reads paragraphs aloud with the device's own voices, one or two sentences at a time (browsers cut off long utterances).
// Arabic paragraphs use an Arabic voice and the others the app's language. Pausing is done by stopping at the sentence and resuming
// from it, because "pause" is unreliable on many Android browsers.
export function useReadAloud(paragraphs: Para[], appLang: string): Reader {
  const [rate, setRate] = useStored<number>('deen:tts-rate', 1)
  const [state, setState] = useState<Reader['state']>('idle')
  const [active, setActive] = useState(-1)
  const [supported, setSupported] = useState(false)
  const [missingVoice, setMissingVoice] = useState<string | null>(null)
  const idx = useRef(0)
  const stateRef = useRef<Reader['state']>('idle')
  const rateRef = useRef(rate)
  const speakRef = useRef<(i: number) => void>(() => {})

  const chunks = useMemo<Chunk[]>(
    () => paragraphs.flatMap((p, i) => splitForSpeech(p.text).map((text) => ({ para: i, text, lang: p.lang ?? voiceLangFor(text, appLang) }))),
    [paragraphs, appLang]
  )
  const chunksRef = useRef(chunks)
  useEffect(() => {
    chunksRef.current = chunks
    rateRef.current = rate
  }, [chunks, rate])

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined')
  }, [])

  const set = (s: Reader['state']) => {
    stateRef.current = s
    setState(s)
  }

  const speakFrom = useCallback((i: number) => {
    const synth = window.speechSynthesis
    const list = chunksRef.current
    if (i >= list.length) {
      synth.cancel()
      set('idle')
      setActive(-1)
      idx.current = 0
      return
    }
    idx.current = i
    const c = list[i]
    const u = new SpeechSynthesisUtterance(c.text)
    u.lang = c.lang
    u.rate = rateRef.current
    const voices = synth.getVoices()
    const exact = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === c.lang.toLowerCase())
    const loose = voices.find((v) => v.lang.toLowerCase().startsWith(c.lang.slice(0, 2).toLowerCase()))
    if (exact || loose) u.voice = (exact ?? loose) as SpeechSynthesisVoice
    else if (voices.length) setMissingVoice(c.lang.startsWith('ar') ? 'Arabic' : c.lang)
    u.onstart = () => setActive(c.para)
    u.onend = () => {
      if (stateRef.current === 'speaking') speakRef.current(i + 1)
    }
    u.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return
      set('idle')
      setActive(-1)
    }
    synth.speak(u)
  }, [])
  useEffect(() => {
    speakRef.current = speakFrom
  }, [speakFrom])

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    set('idle')
    window.speechSynthesis.cancel()
    setActive(-1)
    idx.current = 0
  }, [])

  const play = useCallback(
    (fromPara?: number) => {
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      setMissingVoice(null)
      const start = fromPara === undefined ? 0 : Math.max(0, chunksRef.current.findIndex((c) => c.para >= fromPara))
      set('speaking')
      speakFrom(start)
    },
    [speakFrom]
  )

  const pause = useCallback(() => {
    if (stateRef.current !== 'speaking') return
    set('paused')
    window.speechSynthesis.cancel() // resume restarts the current sentence
  }, [])

  const resume = useCallback(() => {
    if (stateRef.current !== 'paused') return
    set('speaking')
    speakFrom(idx.current)
  }, [speakFrom])

  const jump = useCallback(
    (delta: number) => {
      const list = chunksRef.current
      if (!list.length) return
      const cur = list[Math.min(idx.current, list.length - 1)].para
      const target = Math.min(Math.max(cur + delta, 0), list[list.length - 1].para)
      const i = list.findIndex((c) => c.para >= target)
      window.speechSynthesis.cancel()
      set('speaking')
      speakFrom(i < 0 ? 0 : i)
    },
    [speakFrom]
  )

  // Changing the paragraphs (another verse, another tafsir) or leaving the page stops the voice.
  useEffect(() => stop, [stop, paragraphs])

  return { supported, state, active, rate, setRate, play, pause, resume, stop, next: () => jump(1), prev: () => jump(-1), missingVoice }
}

const RATES = [0.8, 1, 1.2, 1.4]

export function ReadAloudBar({ reader, label = 'Listen', className = '' }: { reader: Reader; label?: string; className?: string }) {
  if (!reader.supported) {
    return (
      <p className={`text-xs text-gray-500 ${className}`} role="note">
        Listening needs a browser with a built-in voice (Chrome, Edge, Safari).
      </p>
    )
  }
  const btn = 'px-3 py-1.5 rounded-lg border text-sm'
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Listen controls">
        {reader.state === 'idle' && (
          <button onClick={() => reader.play()} className={`${btn} bg-[#0F766E] border-[#0F766E] text-white font-semibold`}>
            🔊 {label}
          </button>
        )}
        {reader.state === 'speaking' && (
          <button onClick={reader.pause} className={`${btn} bg-[#0F766E] border-[#0F766E] text-white font-semibold`}>
            ⏸ Pause
          </button>
        )}
        {reader.state === 'paused' && (
          <button onClick={reader.resume} className={`${btn} bg-[#0F766E] border-[#0F766E] text-white font-semibold`}>
            ▶ Resume
          </button>
        )}
        {reader.state !== 'idle' && (
          <>
            <button onClick={reader.prev} className={`${btn} border-gray-300 bg-white`} aria-label="Previous paragraph">
              ⏮
            </button>
            <button onClick={reader.next} className={`${btn} border-gray-300 bg-white`} aria-label="Next paragraph">
              ⏭
            </button>
            <button onClick={reader.stop} className={`${btn} border-gray-300 bg-white`} aria-label="Stop listening">
              ⏹
            </button>
          </>
        )}
        <select value={reader.rate} onChange={(e) => reader.setRate(Number(e.target.value))} aria-label="Speaking speed" className="px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-sm">
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </div>
      {reader.missingVoice && (
        <p className="text-xs text-amber-700 mt-1" role="status">
          This device has no {reader.missingVoice} voice installed, so that part may be read poorly. You can add one in your device’s language or speech settings.
        </p>
      )}
    </div>
  )
}
