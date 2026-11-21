import type { Metadata } from 'next'
import { Suspense } from 'react'
import PageReader from '@/components/PageReader'
import { pageMetadata } from '@/lib/seo'
import PageSkeleton from '@/components/PageSkeleton'

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const n = Number((await params).n)
  if (!Number.isInteger(n) || n < 1 || n > 604) return { title: 'Mushaf page', robots: { index: false } }
  return pageMetadata(`/quran/page/${n}`, { title: `Quran page ${n} of 604 (Madinah Mushaf)`, description: `Read page ${n} of the Madinah Mushaf with swipe navigation, translation and audio. 604 pages, 30 juz.` })
}

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
    <Suspense fallback={<PageSkeleton />}>
      <Reader params={params} />
    </Suspense>
  )
}
