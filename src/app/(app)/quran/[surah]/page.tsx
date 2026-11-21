import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import JsonLd from '@/components/JsonLd'
import SurahReader from '@/components/SurahReader'
import { getVerses } from '@/lib/data'
import { STATIC_SURAHS } from '@/lib/surah-static'
import { absolute, breadcrumbLd, pageMetadata } from '@/lib/seo'
import PageSkeleton from '@/components/PageSkeleton'

// Every surah is built ahead of time, with its verses in the HTML (good for readers on slow connections and for search engines).
export function generateStaticParams() {
  return STATIC_SURAHS.map((s) => ({ surah: String(s.id) }))
}

const surahOf = (raw: string) => {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= 114 ? STATIC_SURAHS[n - 1] : null
}

export async function generateMetadata({ params }: { params: Promise<{ surah: string }> }): Promise<Metadata> {
  const s = surahOf((await params).surah)
  if (!s) return { title: 'Surah not found', robots: { index: false } }
  const place = s.revelation_place === 'makkah' ? 'Meccan' : 'Medinan'
  const desc = `Read Surah ${s.name_simple} (${s.translated_name.name}), ${s.verses_count} verses, ${place}. Arabic with translation, tajweed, word-by-word meaning and audio from 25 reciters.`
  return pageMetadata(`/quran/${s.id}`, { title: `Surah ${s.name_simple} (${s.id}): read and listen`, description: desc, keywords: [`Surah ${s.name_simple}`, `${s.name_simple} translation`, `${s.name_simple} recitation`, `Surah ${s.name_simple} in Arabic`] })
}

function Reader({ s }: { s: NonNullable<ReturnType<typeof surahOf>> }) {
  const verses = getVerses(s.id, 'en').map((v) => ({ verse_number: v.verse_number, verse_key: v.verse_key, text_uthmani: v.text_uthmani, translations: v.translations }))
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'The Noble Quran', path: '/quran' }, { name: `Surah ${s.name_simple}`, path: `/quran/${s.id}` }]),
          { '@context': 'https://schema.org', '@type': 'WebPage', name: `Surah ${s.name_simple}`, url: absolute(`/quran/${s.id}`), isPartOf: { '@type': 'WebSite', url: absolute('/') }, inLanguage: ['en', 'ar'], about: { '@type': 'Thing', name: `Surah ${s.name_simple} of the Quran` } },
        ]}
      />
      <SurahReader surahNum={s.id} initial={verses} />
    </>
  )
}

// The surah is checked before anything is sent, so a surah that does not exist is a real 404 (not a page that says so).
export default async function SurahPage({ params }: { params: Promise<{ surah: string }> }) {
  const s = surahOf((await params).surah)
  if (!s) notFound()
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reader s={s} />
    </Suspense>
  )
}
