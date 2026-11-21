import type { Metadata } from 'next'
import { Suspense } from 'react'
import LessonView from '@/components/learn/LessonView'
import { STATIC_ALL, courseById } from '@/lib/courses'
import { pageMetadata } from '@/lib/seo'
import PageSkeleton from '@/components/PageSkeleton'

export function generateStaticParams() {
  return Object.entries(STATIC_ALL).flatMap(([path, ls]) => ls.map((l) => ({ path, lesson: l.id })))
}

export async function generateMetadata({ params }: { params: Promise<{ path: string; lesson: string }> }): Promise<Metadata> {
  const { path, lesson } = await params
  const c = courseById(path)
  const l = STATIC_ALL[path]?.find((x) => x.id === lesson)
  if (!c || !l) return { title: 'Lesson', robots: { index: false } }
  return pageMetadata(`/learn/${path}/${lesson}`, { title: `${l.title}: ${c.title}`, description: `${l.summary} A short free lesson with a quiz, from the course ${c.title}.`.slice(0, 160) })
}

async function Lesson({ params }: { params: Promise<{ path: string; lesson: string }> }) {
  const { path, lesson } = await params
  return <LessonView pathId={path} lessonId={lesson} />
}

export default function LearnLessonPage({ params }: { params: Promise<{ path: string; lesson: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Lesson params={params} />
    </Suspense>
  )
}
