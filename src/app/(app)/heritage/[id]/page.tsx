import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import HeritageReader from '@/components/HeritageReader'
import { getHeritage } from '@/lib/heritage'

async function Person({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!getHeritage(id)) notFound()
  return <HeritageReader id={id} />
}

export default function HeritagePersonPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Person params={params} />
    </Suspense>
  )
}
