'use client'

import Link from 'next/link'
import { useState } from 'react'
import { QUIZ_CATEGORIES, buildQuiz, type NameLite, type Question, type QuizCategory, type SurahLite } from '@/lib/quizbank'
import { hashSeed, mulberry32 } from '@/lib/random'
import { localDateKey, useStored } from '@/lib/storage'

type Result = { date: string; score: number; total: number; mode: 'daily' | 'practice'; cat?: QuizCategory }

const TOTAL = 10
const freshSeed = () => Math.floor(Math.random() * 2 ** 31)

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'done'>('idle')
  const [mode, setMode] = useState<'daily' | 'practice'>('daily')
  const [cat, setCat] = useState<QuizCategory>('mix')
  const [error, setError] = useState('')
  const [missed, setMissed] = useState<Question[]>([])
  const [results, setResults] = useStored<Result[]>('deen:quizResults', [])

  async function start(m: 'daily' | 'practice', c: QuizCategory) {
    setMode(m)
    setCat(c)
    setError('')
    setState('loading')
    try {
      // Only the data the category needs is fetched.
      const needsQuran = c === 'mix' || c === 'quran' || c === 'prophets'
      const needsNames = c === 'mix' || c === 'names'
      const [sRes, nRes] = await Promise.all([needsQuran ? fetch('/api/quran/surahs') : null, needsNames ? fetch('/api/names') : null])
      const surahs: SurahLite[] = sRes ? (await sRes.json()).surahs || [] : []
      const names: NameLite[] = nRes && nRes.ok ? (await nRes.json()).names || [] : []
      if (needsQuran && !surahs.length) throw new Error('no data')
      const seed = m === 'daily' ? hashSeed(localDateKey() + c) : freshSeed()
      const qs = buildQuiz(c, { surahs, names }, mulberry32(seed), TOTAL)
      if (qs.length < 4) throw new Error('no questions')
      setQuestions(qs)
      setIdx(0)
      setScore(0)
      setMissed([])
      setPicked(null)
      setState('playing')
    } catch {
      setError('Could not load quiz data. Check your connection and try again.')
      setState('idle')
    }
  }

  function choose(option: string) {
    if (picked !== null) return
    setPicked(option)
    if (option === questions[idx].answer) setScore((s) => s + 1)
    else setMissed((m) => [...m, questions[idx]])
  }

  function next() {
    if (idx + 1 >= questions.length) {
      setResults((r) => [...r, { date: localDateKey(), score, total: questions.length, mode, cat }].slice(-80))
      setState('done')
    } else {
      setIdx(idx + 1)
      setPicked(null)
    }
  }

  const q = questions[idx]
  const bestFor = (c: QuizCategory) => {
    const list = results.filter((r) => (r.cat ?? 'quran') === c)
    return list.length ? Math.round(Math.max(...list.map((r) => r.score / r.total)) * 100) : null
  }
  const catInfo = QUIZ_CATEGORIES.find((c) => c.id === cat)

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Islamic Quiz</h1>

      {(state === 'idle' || state === 'loading') && (
        <div>
          <p className="text-gray-600 text-sm mb-4">
            Choose what you want to be tested on — or let us surprise you. Every answer teaches you something, and links to the full story.
          </p>
          <div className="grid grid-cols-2 gap-3" data-testid="quiz-categories">
            {QUIZ_CATEGORIES.map((c) => {
              const best = bestFor(c.id)
              return (
                <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-col" data-quiz-cat={c.id}>
                  <div className="text-3xl">{c.icon}</div>
                  <div className="font-bold leading-tight">{c.title}</div>
                  <div className="text-xs text-gray-500 mb-2 flex-1">{c.blurb}</div>
                  {best !== null && <div className="text-xs text-[#0F766E] font-semibold mb-1">Best {best}%</div>}
                  <div className="flex gap-1">
                    <button
                      onClick={() => start('daily', c.id)}
                      disabled={state === 'loading'}
                      aria-label={`Daily quiz: ${c.title}`}
                      className="flex-1 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => start('practice', c.id)}
                      disabled={state === 'loading'}
                      aria-label={`Random quiz: ${c.title}`}
                      className="flex-1 py-1.5 rounded-lg border border-[#0F766E] text-[#0F766E] text-xs font-semibold disabled:opacity-50"
                    >
                      Random
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {state === 'loading' && <p className="text-gray-500 text-center mt-4">Loading…</p>}
          {error && <p className="text-red-600 mt-3">{error}</p>}
          {results.length > 0 && <p className="text-sm text-gray-500 mt-4 text-center">Quizzes taken: {results.length}</p>}
        </div>
      )}

      {state === 'playing' && q && (
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>
              {catInfo?.icon} {catInfo?.title} · Question {idx + 1} / {questions.length}
            </span>
            <span>Score {score}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
          </div>
          <h2 className="text-lg font-bold mb-4" data-testid="quiz-prompt">
            {q.prompt}
          </h2>
          <ul className="space-y-2">
            {q.options.map((o) => {
              const isAnswer = o === q.answer
              const style =
                picked === null
                  ? 'bg-white border-gray-300 hover:border-[#0F766E]'
                  : isAnswer
                    ? 'bg-green-100 border-green-600'
                    : o === picked
                      ? 'bg-red-100 border-red-500'
                      : 'bg-white border-gray-200 opacity-60'
              return (
                <li key={o}>
                  <button onClick={() => choose(o)} disabled={picked !== null} className={`w-full text-left px-4 py-3 rounded-xl border-2 ${style}`}>
                    {o}
                  </button>
                </li>
              )
            })}
          </ul>
          {picked !== null && (
            <div className="mt-4" data-testid="quiz-feedback">
              <p className={`font-semibold ${picked === q.answer ? 'text-green-700' : 'text-red-600'}`}>{picked === q.answer ? 'Correct!' : `The answer: ${q.answer}`}</p>
              {q.explain && <p className="text-sm text-gray-600 mt-1">{q.explain}</p>}
              {q.href && (
                <Link href={q.href} className="text-sm text-[#0F766E] font-semibold underline">
                  Read more →
                </Link>
              )}
              <button onClick={next} className="mt-3 w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
                {idx + 1 >= questions.length ? 'See result' : 'Next'}
              </button>
            </div>
          )}
        </div>
      )}

      {state === 'done' && (
        <div className="text-center bg-white border border-gray-200 rounded-2xl p-6" data-testid="quiz-done">
          <div className="text-5xl mb-2">{score >= 8 ? '🌟' : score >= 5 ? '👍' : '📖'}</div>
          <div className="text-4xl font-black text-[#0F766E]">
            {score} / {questions.length}
          </div>
          <p className="text-gray-600 mt-2">{score >= 8 ? 'MashaAllah! Excellent.' : score >= 5 ? 'Good effort — keep learning.' : 'Keep going — knowledge grows daily.'}</p>
          {missed.length > 0 && (
            <div className="text-left mt-4">
              <p className="font-semibold text-sm mb-1">Worth another look:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {missed.map((m) => (
                  <li key={m.prompt}>
                    {m.href ? (
                      <Link href={m.href} className="underline">
                        {m.answer}
                      </Link>
                    ) : (
                      m.answer
                    )}{' '}
                    <span className="text-gray-500">— {m.prompt.length > 70 ? m.prompt.slice(0, 70) + '…' : m.prompt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2 mt-5">
            <button onClick={() => start('practice', cat)} className="flex-1 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
              Another round
            </button>
            <button onClick={() => setState('idle')} className="flex-1 py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold">
              Choose category
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
