'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// What the browser's voice needs to be told to read each app language.
const VOICE_LANG: Record<string, string> = { en: 'en-US', ar: 'ar-SA', ur: 'ur-PK', fr: 'fr-FR', id: 'id-ID', tr: 'tr-TR', bn: 'bn-BD', es: 'es-ES', ha: 'ha-NG', de: 'de-DE', ru: 'ru-RU', ms: 'ms-MY', so: 'so-SO', sw: 'sw-KE' }

// The words people hear: no citation tags like [Q1], no list marks.
export function speakable(text: string): string {
  return text.replace(/\[(?:Q|H)\d+\]/g, '').replace(/[*_#>`]/g, '').replace(/ⓘ[\s\S]*$/, '').replace(/\s+/g, ' ').trim()
}

// Under every answer: listen to it, copy it, say whether it helped, or report a mistake (which goes to the owner).
export default function AnswerActions({ text, question, lang, canRate }: { text: string; question?: string; lang: string; canRate: boolean }) {
  const [speaking, setSpeaking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [rated, setRated] = useState<'good' | 'bad' | null>(null)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  function toggleSpeak() {
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(speakable(text))
    u.lang = VOICE_LANG[lang] ?? lang
    u.rate = 0.95
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    synth.speak(u)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  async function rate(r: 'good' | 'bad') {
    setRated(r)
    fetch('/api/ai/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: r }) }).catch(() => {})
  }

  const reportHref = `/report?cat=content&ref=${encodeURIComponent('AI answer to: ' + (question ?? '').slice(0, 80))}&from=%2Fcompanion`
  const btn = 'px-2 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-700 hover:border-[#0F766E]'

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2" role="group" aria-label="Answer actions">
      {canSpeak && (
        <button onClick={toggleSpeak} className={btn} aria-pressed={speaking}>
          {speaking ? '⏹ Stop' : '🔊 Listen'}
        </button>
      )}
      <button onClick={copy} className={btn}>
        {copied ? '✓ Copied' : '📋 Copy'}
      </button>
      {canRate && !rated && (
        <>
          <button onClick={() => rate('good')} className={btn} aria-label="This answer helped">
            👍
          </button>
          <button onClick={() => rate('bad')} className={btn} aria-label="This answer did not help">
            👎
          </button>
        </>
      )}
      {rated && (
        <span className="text-xs text-gray-500" role="status">
          {rated === 'good' ? 'Thank you!' : 'Thank you — if something was wrong, please report it:'}
        </span>
      )}
      <Link href={reportHref} className={btn + (rated === 'bad' ? ' border-[#0F766E] text-[#0F766E] font-semibold' : '')}>
        ⚑ Report a mistake
      </Link>
    </div>
  )
}
