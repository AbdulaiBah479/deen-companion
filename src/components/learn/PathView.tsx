'use client'

import Link from 'next/link'
import Certificate from '@/components/learn/Certificate'
import { courseById } from '@/lib/courses'
import { EMPTY_LEARN, PASS_PERCENT, isDone, type LearnState } from '@/lib/learn'
import { useLessons } from '@/lib/learn-client'
import { useStored } from '@/lib/storage'

export default function PathView({ pathId }: { pathId: string }) {
  const path = courseById(pathId)
  const { lessons, loading, error } = useLessons(pathId)
  const [state] = useStored<LearnState>('deen:learn', EMPTY_LEARN)

  if (!path) {
    return (
      <div>
        <p className="mb-3">Course not found.</p>
        <Link href="/learn" className="text-[#0F766E] font-semibold">
          ← All courses
        </Link>
      </div>
    )
  }

  const doneCount = lessons.filter((l) => isDone(state, l.id)).length
  const complete = lessons.length > 0 && doneCount === lessons.length
  const average = lessons.length ? Math.round(lessons.reduce((s, l) => s + (state.done[l.id] ?? 0), 0) / lessons.length) : 0
  const next = lessons.find((l) => !isDone(state, l.id))

  return (
    <div>
      <Link href="/learn" className="text-[#0F766E] font-semibold text-sm">
        ← All courses
      </Link>
      <h1 className="text-2xl font-black mt-2">{path.title}</h1>
      <p className="text-gray-500 text-sm mb-2">{path.blurb}</p>
      <p className="text-xs text-gray-500 mb-3">
        {path.info.level} · about {path.info.minutes >= 60 ? `${Math.round(path.info.minutes / 6) / 10} hours` : `${path.info.minutes} minutes`} · {path.info.audience === 'kids' ? 'for children' : 'for everyone'}
      </p>
      <div className="rounded-2xl border border-gray-200 bg-white p-3 mb-4 text-sm" data-testid="course-outcomes">
        <p className="font-semibold mb-1">What you will learn</p>
        <ul className="list-disc pl-5 space-y-0.5">{path.info.learn.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      {lessons.length > 0 && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={doneCount} aria-label="Course progress">
            <div className="h-full bg-[#0F766E]" style={{ width: `${(doneCount / lessons.length) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1" data-testid="course-progress">{doneCount} of {lessons.length} lessons passed</p>
          {next && (
            <Link href={`/learn/${pathId}/${next.id}`} className="inline-block mt-2 rounded-xl bg-[#0F766E] text-white px-4 py-2 text-sm font-semibold">
              {doneCount === 0 ? 'Start the course' : 'Continue'}: {next.title}
            </Link>
          )}
        </div>
      )}

      {loading && <p className="text-gray-500">Loading lessons…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <ol className="space-y-2">
        {lessons.map((l, i) => {
          const best = state.done[l.id]
          const done = isDone(state, l.id)
          return (
            <li key={l.id}>
              <Link
                href={`/learn/${pathId}/${l.id}`}
                className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 hover:border-[#0F766E] ${done ? 'border-green-600' : 'border-gray-200'}`}
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {done ? '✓' : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{l.title}</span>
                  <span className="block text-xs text-gray-500 truncate" lang={pathId === 'letters' ? 'ar' : undefined}>
                    {l.summary}
                  </span>
                </span>
                {best !== undefined && <span className={`text-xs font-bold ${best >= PASS_PERCENT ? 'text-green-700' : 'text-gray-500'}`}>{best}%</span>}
              </Link>
            </li>
          )
        })}
      </ol>

      {complete && <Certificate course={path.title} average={average} lessons={lessons.length} />}
    </div>
  )
}
