import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import HeritageReader from '@/components/HeritageReader'
import JsonLd from '@/components/JsonLd'
import { HERITAGE, getHeritage } from '@/lib/heritage'
import { absolute, breadcrumbLd, pageMetadata } from '@/lib/seo'
import PageSkeleton from '@/components/PageSkeleton'

export function generateStaticParams() {
  return HERITAGE.map((h) => ({ id: h.id }))
}

const firstSentence = (t: string) => {
  const m = t.match(/^.{40,}?[.!?](\s|$)/)
  return (m ? m[0] : t).trim()
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const h = getHeritage((await params).id)
  if (!h) return { title: 'Person not found', robots: { index: false } }
  return pageMetadata(`/heritage/${h.id}`, {
    title: `${h.name} (${h.years}): life and legacy`,
    description: `${firstSentence(h.story)} The life, key facts and lesson of ${h.name}, one of the great Muslims of history.`.slice(0, 160),
    keywords: [h.name, `${h.name} biography`, 'great Muslims in history'],
  })
}

function Person({ h }: { h: NonNullable<ReturnType<typeof getHeritage>> }) {
  const id = h.id
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Great Muslims', path: '/heritage' }, { name: h.name, path: `/heritage/${h.id}` }]),
          { '@context': 'https://schema.org', '@type': 'ProfilePage', url: absolute(`/heritage/${h.id}`), mainEntity: { '@type': 'Person', name: h.name, description: firstSentence(h.story), knowsAbout: h.cat } },
        ]}
      />
      <HeritageReader id={id} />
    </>
  )
}

export default async function HeritagePersonPage({ params }: { params: Promise<{ id: string }> }) {
  const h = getHeritage((await params).id)
  if (!h) notFound()
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Person h={h} />
    </Suspense>
  )
}
