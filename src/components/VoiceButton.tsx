'use client'

import { useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 25

// Ask by speaking: records a short clip, sends it to the server to be turned into text, and hands the text back so the person can check it
// before sending. Works in any browser that can record (including iPhone Safari), unlike the browser's built-in speech recognition.
export default function VoiceButton({ lang, onText, disabled }: { lang: string; onText: (text: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'recording' | 'working'>('idle')
  const [error, setError] = useState('')
  const recRef = useRef<MediaRecorder | null>(null)
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia)
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current)
      recRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  if (!supported) return null

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (stopTimer.current) clearTimeout(stopTimer.current)
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
        if (blob.size < 1500) {
          setState('idle')
          setError('I did not hear anything. Try again.')
          return
        }
        setState('working')
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'question.webm')
          fd.append('lang', lang)
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
          const d = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(d.error || 'Could not understand the recording.')
          if (!d.text) throw new Error('I could not make out any words. Try again, a little closer to the microphone.')
          onText(d.text)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not understand the recording.')
        } finally {
          setState('idle')
        }
      }
      recRef.current = rec
      rec.start()
      setState('recording')
      stopTimer.current = setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_SECONDS * 1000)
    } catch {
      setError('The microphone is not available. Allow it in your browser settings, then try again.')
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || state === 'working'}
        onClick={() => (state === 'recording' ? recRef.current?.stop() : void start())}
        aria-label={state === 'recording' ? 'Stop recording' : 'Ask by voice'}
        className={`w-12 rounded-xl border text-lg disabled:opacity-50 ${state === 'recording' ? 'border-red-500 bg-red-50 animate-pulse' : 'border-gray-300 bg-white'}`}
      >
        {state === 'working' ? '…' : state === 'recording' ? '⏹' : '🎤'}
      </button>
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
      {error && <p className="basis-full text-xs text-red-600 -mt-1">{error}</p>}
    </>
  )
}
