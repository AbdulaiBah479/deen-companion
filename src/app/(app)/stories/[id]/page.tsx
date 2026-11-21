import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import JsonLd from '@/components/JsonLd'
import StoryReader from '@/components/StoryReader'
import { STORIES, getStory } from '@/lib/stories'
import { articleLd, breadcrumbLd, pageMetadata } from '@/lib/seo'
import PageSkeleton from '@/components/PageSkeleton'

export function generateStaticParams() {
  return STORIES.map((s) => ({ id: s.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = getStory((await params).id)
  if (!s) return { title: 'Story not found', robots: { index: false } }
  const verses = s.chapters.length
  return pageMetadata(`/stories/${s.id}`, {
    title: `${s.title}: Quran story with the verses`,
    description: `${s.summary} Read the story of ${s.title} in ${verses} ${verses === 1 ? 'part' : 'parts'}, each with the Quran verses it comes from, and listen to the recitation.`.slice(0, 160),
    keywords: [s.title, `${s.title} Quran story`, 'stories of the prophets'],
  })
}

function Story({ s }: { s: NonNullable<ReturnType<typeof getStory>> }) {
  const id = s.id
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Stories', path: '/stories' }, { name: s.title, path: `/stories/${s.id}` }]),
          articleLd({ headline: s.title, description: s.summary, path: `/stories/${s.id}` }),
        ]}
      />
      <StoryReader id={id} />
    </>
  )
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const s = getStory((await params).id)
  if (!s) notFound()
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Story s={s} />
    </Suspense>
  )
}
