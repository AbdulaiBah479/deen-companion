'use client'

import { useState } from 'react'
import type { Question } from '@/lib/learn-content'

// One question at a time with instant feedback. Reports the final score to the parent.
export default function Quiz({ questions, onDone }: { questions: Question[]; onDone: (correct: number, total: number) => void }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const q = questions[i]

  function choose(option: string) {
    if (picked !== null) return
    setPicked(option)
    if (option === q.answer) setCorrect((c) => c + 1)
  }

  function next() {
    if (i + 1 >= questions.length) onDone(correct, questions.length)
    else {
      setI(i + 1)
      setPicked(null)
    }
  }

  return (
    <div>
      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span>
          Question {i + 1} / {questions.length}
        </span>
        <span>{correct} correct</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${(i / questions.length) * 100}%` }} />
      </div>

      <h2 className="text-lg font-bold mb-2">{q.prompt}</h2>
      {q.promptArabic && (
        <p className="text-center text-5xl my-4" dir="rtl" lang="ar">
          {q.promptArabic}
        </p>
      )}

      <ul className="grid gap-2" role="list">
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
              <button
                onClick={() => choose(o)}
                disabled={picked !== null}
                className={`w-full px-4 py-3 rounded-xl border-2 text-left ${q.optionsArabic ? 'text-center text-3xl' : ''} ${style}`}
                lang={q.optionsArabic ? 'ar' : undefined}
                dir={q.optionsArabic ? 'rtl' : undefined}
              >
                {o}
              </button>
            </li>
          )
        })}
      </ul>

      {picked !== null && (
        <>
          <p className={`mt-3 text-sm font-semibold ${picked === q.answer ? 'text-green-700' : 'text-red-600'}`} role="status">
            {picked === q.answer ? 'Correct! ✓' : `Not quite — the answer is ${q.answer}.`}
          </p>
          {q.explain && <p className="text-sm text-gray-600 mt-1">{q.explain}</p>}
          <button onClick={next} className="mt-4 w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
            {i + 1 >= questions.length ? 'See result' : 'Next'}
          </button>
        </>
      )}
    </div>
  )
}
