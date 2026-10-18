import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import StoryReader from '@/components/StoryReader'
import { getStory } from '@/lib/stories'

async function Story({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!getStory(id)) notFound()
  return <StoryReader id={id} />
}

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Story params={params} />
    </Suspense>
  )
}
