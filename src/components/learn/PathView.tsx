'use client'

import Link from 'next/link'
import { EMPTY_LEARN, PASS_PERCENT, isDone, type LearnState } from '@/lib/learn'
import { PATHS } from '@/lib/learn-content'
import { useLessons } from '@/lib/learn-client'
import { useStored } from '@/lib/storage'

export default function PathView({ pathId }: { pathId: string }) {
  const path = PATHS.find((p) => p.id === pathId)
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

  return (
    <div>
      <Link href="/learn" className="text-[#0F766E] font-semibold text-sm">
        ← All courses
      </Link>
      <h1 className="text-2xl font-black mt-2">{path.title}</h1>
      <p className="text-gray-500 text-sm mb-4">{path.blurb}</p>

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
    </div>
  )
}
