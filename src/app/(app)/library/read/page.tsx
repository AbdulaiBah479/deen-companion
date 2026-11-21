import { Suspense } from 'react'
import ArticleReader from '@/components/ArticleReader'
import PageSkeleton from '@/components/PageSkeleton'

export default function ReadPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ArticleReader />
    </Suspense>
  )
}
