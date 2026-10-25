import { Suspense } from 'react'
import TafsirSurah from '@/components/TafsirSurah'

async function Inner({ params }: { params: Promise<{ surah: string }> }) {
  const { surah } = await params
  return <TafsirSurah surahNum={Number(surah)} />
}

export default function Page({ params }: { params: Promise<{ surah: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Inner params={params} />
    </Suspense>
  )
}
