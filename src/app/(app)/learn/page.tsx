'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EMPTY_LEARN, levelOf, liveStreak, pathProgress, type LearnState } from '@/lib/learn'
import { COURSES, lessonIds, type Course } from '@/lib/courses'
import { localDateKey, useStored } from '@/lib/storage'

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

      {([['kids', '🧒 For children', 'Short, playful lessons for ages 5 to 10, with a parent or teacher.'], ['everyone', '🎓 For students and everyone', 'Courses for teens and adults, from first letters to the life of the Prophet ﷺ.']] as const).map(([aud, heading, sub]) => (
        <section key={aud} className="mb-6" aria-label={heading}>
          <h2 className="font-bold text-lg">{heading}</h2>
          <p className="text-xs text-gray-500 mb-2">{sub}</p>
          <ul className="space-y-3">
            {COURSES.filter((p) => p.info.audience === aud).map((p) => <CourseRow key={p.id} p={p} state={state} />)}
          </ul>
        </section>
      ))}

      <p className="text-xs text-gray-500 mt-6">
        These lessons are study aids. For tajweed and prayer, learn with a qualified teacher — rules and details can differ between recitations and schools.
      </p>
    </div>
  )
}

function CourseRow({ p, state }: { p: Course; state: LearnState }) {
  const ids = lessonIds(p.id)
  const done = pathProgress(state, ids)
  const finished = ids.length > 0 && done === ids.length
  return (
    <li>
      <Link href={`/learn/${p.id}`} className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#0F766E]" data-testid="course-row">
        <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl text-white shrink-0" style={{ background: p.color }} lang={p.id === 'letters' ? 'ar' : undefined}>
          {p.icon}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold">{p.title}{finished ? ' ✅' : ''}</span>
          <span className="block text-sm text-gray-500">{p.blurb}</span>
          <span className="block mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <span className="block h-full" style={{ width: `${ids.length ? (done / ids.length) * 100 : 0}%`, background: p.color }} />
          </span>
          <span className="block text-xs text-gray-500 mt-1">
            {done} / {ids.length} lessons · {p.info.level}
          </span>
        </span>
      </Link>
    </li>
  )
}
