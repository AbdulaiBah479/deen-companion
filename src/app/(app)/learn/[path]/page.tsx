import { Suspense } from 'react'
import PathView from '@/components/learn/PathView'

async function Path({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params
  return <PathView pathId={path} />
}

export default function LearnPathPage({ params }: { params: Promise<{ path: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Path params={params} />
    </Suspense>
  )
}
