'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Quiz from '@/components/learn/Quiz'
import { useAudio } from '@/lib/audio'
import type { Lesson } from '@/lib/learn-content'
import { PASS_PERCENT, levelOf, type LearnState } from '@/lib/learn'

export type Outcome = { gained: number; passed: boolean; state: LearnState; levelUp: boolean }

// Speaks Arabic with the device's own voice when one is available (quality varies by device).
function speakArabic(text: string) {
  if (!('speechSynthesis' in window)) return false
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ar-SA'
  u.rate = 0.8
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
  return true
}

export default function LessonRunner({
  lesson,
  backHref,
  nextHref,
  onComplete,
}: {
  lesson: Lesson
  backHref: string
  nextHref?: string
  onComplete: (scorePct: number) => Outcome
}) {
  const audio = useAudio()
  const [step, setStep] = useState<'learn' | 'quiz' | 'result'>('learn')
  const [slide, setSlide] = useState(0)
  const [outcome, setOutcome] = useState<(Outcome & { pct: number; correct: number; total: number }) | null>(null)
  const [quizKey, setQuizKey] = useState(0)
  const [voiceNote, setVoiceNote] = useState('')
  const startedAt = useRef(0)

  useEffect(() => {
    startedAt.current = Date.now()
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  const s = lesson.slides[slide]

  if (step === 'quiz') {
    return (
      <Quiz
        key={quizKey}
        questions={lesson.quiz}
        onDone={(correct, total) => {
          const pct = (correct / total) * 100
          setOutcome({ ...onComplete(pct), pct: Math.round(pct), correct, total })
          setStep('result')
        }}
      />
    )
  }

  if (step === 'result' && outcome) {
    const lv = levelOf(outcome.state.xp)
    return (
      <div className="text-center bg-white border border-gray-200 rounded-2xl p-8">
        <div className="text-5xl mb-2">{outcome.passed ? (outcome.pct === 100 ? '🌟' : '🎉') : '📖'}</div>
        <div className="text-4xl font-black text-[#0F766E]">{outcome.pct}%</div>
        <p className="text-gray-600 mt-1">
          {outcome.correct} of {outcome.total} correct
        </p>
        <p className="mt-3 font-semibold">
          {outcome.passed ? (outcome.gained ? `+${outcome.gained} XP` : 'Passed — you’ve already earned the XP for this lesson') : `You need ${PASS_PERCENT}% to pass — review and try again.`}
        </p>
        {outcome.levelUp && <p className="mt-1 text-gold font-bold">Level up! You’re now level {lv.level} ✨</p>}
        {outcome.passed && outcome.state.streak > 0 && <p className="text-sm text-gray-500 mt-1">🔥 {outcome.state.streak}-day streak</p>}
        <div className="flex flex-col gap-2 mt-6">
          {outcome.passed && nextHref && (
            <Link href={nextHref} className="py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
              Next lesson →
            </Link>
          )}
          <button
            onClick={() => {
              setQuizKey((k) => k + 1)
              setStep(outcome.passed ? 'quiz' : 'learn')
              setSlide(0)
              setOutcome(null)
            }}
            className="py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold"
          >
            {outcome.passed ? 'Try the quiz again' : 'Review the lesson'}
          </button>
          <Link href={backHref} className="py-2 text-gray-500 text-sm">
            Back to course
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span>
          {slide + 1} / {lesson.slides.length}
        </span>
        <span>then a {lesson.quiz.length}-question quiz</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-[#0F766E] transition-all" style={{ width: `${((slide + 1) / lesson.slides.length) * 100}%` }} />
      </div>

      <article className="bg-white border border-gray-200 rounded-2xl p-6 text-center min-h-64">
        {s.title && <h2 className="font-bold text-lg text-[#0F766E] mb-2">{s.title}</h2>}
        {s.arabic && (
          <p className={s.big ? 'text-7xl my-3' : 'text-3xl my-3'} dir="rtl" lang="ar">
            {s.arabic}
          </p>
        )}
        {s.transliteration && <p className="text-lg font-semibold" style={{ color: '#B8962E' }}>{s.transliteration}</p>}
        {s.body && <p className="text-gray-700 mt-2 leading-relaxed">{s.body}</p>}
        {s.bullets && (
          <ul className="text-left text-gray-700 mt-3 space-y-1 text-sm list-disc pl-6">
            {s.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        {s.example && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <p className="text-2xl" dir="rtl" lang="ar">
              {s.example.ar}
            </p>
            <Link href={`/quran/${s.example.ref.split(':')[0]}#v${s.example.ref.split(':')[1]}`} className="text-xs font-semibold text-[#0F766E]">
              Quran {s.example.ref} →
            </Link>
          </div>
        )}
        <div className="flex justify-center gap-3 mt-4">
          {s.audio && (
            <button onClick={() => audio.playUrl({ url: s.audio!, title: s.transliteration ?? 'Quran word', subtitle: 'Pronunciation' })} className="px-3 py-1 rounded-full border border-[#0F766E] text-[#0F766E] text-sm font-semibold">
              🔊 Hear it
            </button>
          )}
          {(s.speak || (s.arabic && !s.audio && s.big)) && (
            <button
              onClick={() => setVoiceNote(speakArabic(s.speak ?? s.arabic!) ? 'Using your device’s voice' : 'No speech voice on this device')}
              className="px-3 py-1 rounded-full border border-gray-300 text-sm"
            >
              🗣 Speak
            </button>
          )}
          {s.href && (
            <Link href={s.href} className="px-3 py-1 rounded-full border border-gray-300 text-sm">
              See in Quran
            </Link>
          )}
        </div>
        {voiceNote && <p className="text-[11px] text-gray-500 mt-2">{voiceNote}</p>}
      </article>

      <div className="flex gap-2 mt-4">
        <button onClick={() => setSlide((n) => Math.max(0, n - 1))} disabled={slide === 0} className="px-4 py-3 rounded-xl border border-gray-300 bg-white disabled:opacity-40">
          ← Back
        </button>
        {slide + 1 < lesson.slides.length ? (
          <button onClick={() => setSlide((n) => n + 1)} className="flex-1 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
            Next →
          </button>
        ) : (
          <button onClick={() => setStep('quiz')} className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-[#1a0e00] font-bold">
            Start the quiz
          </button>
        )}
      </div>
    </div>
  )
}
