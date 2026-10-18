'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EMPTY_LEARN, levelOf, liveStreak, pathProgress, type LearnState } from '@/lib/learn'
import { PATHS, STATIC_LESSONS, buildLetterLessons } from '@/lib/learn-content'
import { localDateKey, useStored } from '@/lib/storage'

// Lesson counts known without loading data (the words course is 10 words per lesson; its length comes from the data).
const COUNTS: Record<string, number> = {
  letters: buildLetterLessons().length,
  tajweed: STATIC_LESSONS.tajweed.length,
  basics: STATIC_LESSONS.basics.length,
  words: 40,
}

export default function LearnHub() {
  const [state] = useStored<LearnState>('deen:learn', EMPTY_LEARN)
  const [today, setToday] = useState('')
  useEffect(() => setToday(localDateKey()), [])

  const lv = levelOf(state.xp)
  const streak = today ? liveStreak(state, today) : 0

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Learn</h1>
      <p className="text-gray-500 text-sm mb-4">Short lessons with quizzes. Finish a lesson each day to build your streak.</p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-gold">{streak}</div>
          <div className="text-xs text-gray-500">🔥 day streak</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-[#0F766E]">{state.xp}</div>
          <div className="text-xs text-gray-500">XP</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black">{lv.level}</div>
          <div className="text-xs text-gray-500">Level</div>
        </div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={lv.needed} aria-valuenow={lv.into} aria-label={`${lv.into} of ${lv.needed} XP to next level`}>
        <div className="h-full bg-[#D4AF37]" style={{ width: `${(lv.into / lv.needed) * 100}%` }} />
      </div>

      <ul className="space-y-3">
        {PATHS.map((p) => {
          const ids = Array.from({ length: COUNTS[p.id] }, (_, i) => (p.id === 'tajweed' || p.id === 'basics' ? STATIC_LESSONS[p.id][i].id : `${p.id}-${i + 1}`))
          const done = pathProgress(state, ids)
          return (
            <li key={p.id}>
              <Link href={`/learn/${p.id}`} className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#0F766E]">
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl text-white shrink-0" style={{ background: p.color }} lang={p.id === 'letters' ? 'ar' : undefined}>
                  {p.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold">{p.title}</span>
                  <span className="block text-sm text-gray-500">{p.blurb}</span>
                  <span className="block mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <span className="block h-full" style={{ width: `${(done / ids.length) * 100}%`, background: p.color }} />
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">
                    {done} / {ids.length} lessons
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="text-xs text-gray-500 mt-6">
        These lessons are study aids. For tajweed and prayer, learn with a qualified teacher — rules and details can differ between recitations and schools.
      </p>
    </div>
  )
}
