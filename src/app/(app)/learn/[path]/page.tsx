import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import JsonLd from '@/components/JsonLd'
import PathView from '@/components/learn/PathView'
import { COURSES, courseById, lessonIds } from '@/lib/courses'
import { breadcrumbLd, courseLd, pageMetadata } from '@/lib/seo'
import PageSkeleton from '@/components/PageSkeleton'

export function generateStaticParams() {
  return COURSES.map((c) => ({ path: c.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ path: string }> }): Promise<Metadata> {
  const c = courseById((await params).path)
  if (!c) return { title: 'Course not found', robots: { index: false } }
  return pageMetadata(`/learn/${c.id}`, {
    title: `${c.title}: free course`,
    description: `${c.blurb} A free ${c.info.level.toLowerCase()} course of ${lessonIds(c.id).length} lessons with quizzes and a certificate when you finish.`.slice(0, 160),
    keywords: [c.title, 'free Islamic course', c.info.audience === 'kids' ? 'Islamic education for kids' : 'learn Islam online'],
  })
}

function Path({ c }: { c: NonNullable<ReturnType<typeof courseById>> }) {
  const path = c.id
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Learn', path: '/learn' }, { name: c.title, path: `/learn/${c.id}` }]),
          courseLd({ name: c.title, description: c.blurb, path: `/learn/${c.id}`, minutes: c.info.minutes, level: c.info.level }),
        ]}
      />
      <PathView pathId={path} />
    </>
  )
}

export default async function LearnPathPage({ params }: { params: Promise<{ path: string }> }) {
  const c = courseById((await params).path)
  if (!c) notFound()
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Path c={c} />
    </Suspense>
  )
}
