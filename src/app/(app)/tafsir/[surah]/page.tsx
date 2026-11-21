import type { Metadata } from 'next'
import { Suspense } from 'react'
import TafsirSurah from '@/components/TafsirSurah'
import { pageMetadata } from '@/lib/seo'
import { STATIC_SURAHS } from '@/lib/surah-static'
import PageSkeleton from '@/components/PageSkeleton'

export function generateStaticParams() {
  return STATIC_SURAHS.map((s) => ({ surah: String(s.id) }))
}

export async function generateMetadata({ params }: { params: Promise<{ surah: string }> }): Promise<Metadata> {
  const n = Number((await params).surah)
  const s = Number.isInteger(n) && n >= 1 && n <= 114 ? STATIC_SURAHS[n - 1] : null
  if (!s) return { title: 'Tafsir', robots: { index: false } }
  return pageMetadata(`/tafsir/${s.id}`, { title: `Tafsir of Surah ${s.name_simple}`, description: `Study Surah ${s.name_simple} (${s.verses_count} verses) verse by verse with 12 tafsirs, connected verses and a plain-language explanation.`, keywords: [`tafsir of ${s.name_simple}`, `Surah ${s.name_simple} tafsir`] })
}

async function Inner({ params }: { params: Promise<{ surah: string }> }) {
  const { surah } = await params
  return <TafsirSurah surahNum={Number(surah)} />
}

export default function Page({ params }: { params: Promise<{ surah: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner params={params} />
    </Suspense>
  )
}
