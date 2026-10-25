import { Suspense } from 'react'
import BookReader from '@/components/BookReader'

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BookReader id={id} />
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Inner params={params} />
    </Suspense>
  )
}
