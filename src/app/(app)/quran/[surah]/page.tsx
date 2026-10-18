import { Suspense } from 'react'
import SurahReader from '@/components/SurahReader'

async function Reader({ params }: { params: Promise<{ surah: string }> }) {
  const { surah } = await params
  return <SurahReader surahNum={Number(surah)} />
}

export default function SurahPage({ params }: { params: Promise<{ surah: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Reader params={params} />
    </Suspense>
  )
}
