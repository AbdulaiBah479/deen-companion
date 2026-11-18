import { Suspense } from 'react'
import PageReader from '@/components/PageReader'

async function Reader({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params
  return (
    <>
      <h1 className="sr-only">Mushaf page {Number(n)}</h1>
      <PageReader page={Number(n)} />
    </>
  )
}

export default function MushafPage({ params }: { params: Promise<{ n: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Reader params={params} />
    </Suspense>
  )
}
