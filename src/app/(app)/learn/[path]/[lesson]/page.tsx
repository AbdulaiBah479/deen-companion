import { Suspense } from 'react'
import LessonView from '@/components/learn/LessonView'

async function Lesson({ params }: { params: Promise<{ path: string; lesson: string }> }) {
  const { path, lesson } = await params
  return <LessonView pathId={path} lessonId={lesson} />
}

export default function LearnLessonPage({ params }: { params: Promise<{ path: string; lesson: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Lesson params={params} />
    </Suspense>
  )
}
