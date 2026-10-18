import { Suspense } from 'react'
import ArticleReader from '@/components/ArticleReader'

export default function ReadPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <ArticleReader />
    </Suspense>
  )
}
