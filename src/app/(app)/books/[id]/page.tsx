import type { Metadata } from 'next'
import { Suspense } from 'react'
import BookReader from '@/components/BookReader'
import JsonLd from '@/components/JsonLd'
import { BOOKS } from '@/lib/books'
import { absolute, breadcrumbLd, pageMetadata } from '@/lib/seo'
import PageSkeleton from '@/components/PageSkeleton'

export function generateStaticParams() {
  return BOOKS.map((b) => ({ id: b.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const b = BOOKS.find((x) => x.id === id)
  if (!b) return { title: 'Book', robots: { index: false } }
  return pageMetadata(`/books/${b.id}`, { title: `${b.title} by ${b.author}`, description: `${b.blurb} Read it online in ${b.english && b.arabic ? 'English and Arabic' : b.english ? 'English' : 'Arabic'}, with audio and clearly labelled AI help.`.slice(0, 160), keywords: [b.title, b.author] })
}

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const b = BOOKS.find((x) => x.id === id)
  return (
    <>
      {b && (
        <JsonLd
          data={[
            breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Books', path: '/books' }, { name: b.title, path: `/books/${b.id}` }]),
            { '@context': 'https://schema.org', '@type': 'Book', name: b.title, author: { '@type': 'Person', name: b.author }, url: absolute(`/books/${b.id}`), description: b.blurb, inLanguage: b.english ? 'en' : 'ar', isAccessibleForFree: true },
          ]}
        />
      )}
      <BookReader id={id} />
    </>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner params={params} />
    </Suspense>
  )
}
