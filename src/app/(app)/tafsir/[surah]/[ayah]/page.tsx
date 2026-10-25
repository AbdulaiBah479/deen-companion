import { Suspense } from 'react'
import TafsirStudy from '@/components/TafsirStudy'

async function Inner({ params }: { params: Promise<{ surah: string; ayah: string }> }) {
  const { surah, ayah } = await params
  return <TafsirStudy surahNum={Number(surah)} ayahNum={Number(ayah)} />
}

export default function Page({ params }: { params: Promise<{ surah: string; ayah: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Inner params={params} />
    </Suspense>
  )
}
