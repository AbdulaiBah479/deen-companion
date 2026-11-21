import type { Metadata } from 'next'
import { Suspense } from 'react'
import TafsirStudy from '@/components/TafsirStudy'
import { pageMetadata } from '@/lib/seo'
import { STATIC_SURAHS } from '@/lib/surah-static'
import PageSkeleton from '@/components/PageSkeleton'

export async function generateMetadata({ params }: { params: Promise<{ surah: string; ayah: string }> }): Promise<Metadata> {
  const { surah, ayah } = await params
  const n = Number(surah)
  const a = Number(ayah)
  const s = Number.isInteger(n) && n >= 1 && n <= 114 ? STATIC_SURAHS[n - 1] : null
  if (!s || !Number.isInteger(a) || a < 1 || a > s.verses_count) return { title: 'Tafsir', robots: { index: false } }
  return pageMetadata(`/tafsir/${n}/${a}`, { title: `Tafsir of ${n}:${a} (Surah ${s.name_simple}, verse ${a})`, description: `The verse ${n}:${a} with its recitation, 12 tafsirs, connected verses and a plain-language explanation grounded in the commentary.` })
}

async function Inner({ params }: { params: Promise<{ surah: string; ayah: string }> }) {
  const { surah, ayah } = await params
  return <TafsirStudy surahNum={Number(surah)} ayahNum={Number(ayah)} />
}

export default function Page({ params }: { params: Promise<{ surah: string; ayah: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner params={params} />
    </Suspense>
  )
}
