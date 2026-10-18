'use client'

import Link from 'next/link'
import LessonRunner from '@/components/learn/LessonRunner'
import { EMPTY_LEARN, PASS_PERCENT, completeLesson, levelOf, type LearnState } from '@/lib/learn'
import { useLessons } from '@/lib/learn-client'
import { newStoredCard, type StoredCard } from '@/lib/srs'
import { localDateKey, useStored } from '@/lib/storage'

type DeckProgress = { cards: Record<string, StoredCard>; newToday: { date: string; count: number } }

export default function LessonView({ pathId, lessonId }: { pathId: string; lessonId: string }) {
  const { lessons, loading, error } = useLessons(pathId)
  const [state, setState] = useStored<LearnState>('deen:learn', EMPTY_LEARN)
  const [, setWordDeck] = useStored<DeckProgress>('deen:fc:words', { cards: {}, newToday: { date: '', count: 0 } })

  const idx = lessons.findIndex((l) => l.id === lessonId)
  const lesson = lessons[idx]
  const next = lessons[idx + 1]

  if (loading) return <p className="text-gray-500">Loading lesson…</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!lesson) {
    return (
      <div>
        <p className="mb-3">Lesson not found.</p>
        <Link href={`/learn/${pathId}`} className="text-[#0F766E] font-semibold">
          ← Back to course
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/learn/${pathId}`} className="text-[#0F766E] font-semibold text-sm">
        ← Course
      </Link>
      <h1 className="text-xl font-black mt-2 mb-4">{lesson.title}</h1>
      <LessonRunner
        key={lesson.id}
        lesson={lesson}
        backHref={`/learn/${pathId}`}
        nextHref={next ? `/learn/${pathId}/${next.id}` : undefined}
        onComplete={(pct) => {
          const c = completeLesson(state, lesson.id, pct, localDateKey())
          setState(c.state)
          // Words you just learned become flashcards, scheduled by the spaced-repetition algorithm.
          if (c.passed && lesson.words) {
            setWordDeck((d) => {
              const cards = { ...d.cards }
              for (const w of lesson.words!) if (!cards[w.id]) cards[w.id] = newStoredCard()
              return { ...d, cards }
            })
          }
          return { gained: c.gained, passed: c.passed, state: c.state, levelUp: levelOf(c.state.xp).level > levelOf(state.xp).level }
        }}
      />
      {lesson.words && (
        <p className="text-xs text-gray-500 mt-4">
          Pass this quiz ({PASS_PERCENT}%+) and these words are added to your <Link href="/flashcards" className="underline">Flashcards</Link> for spaced review.
        </p>
      )}
    </div>
  )
}
