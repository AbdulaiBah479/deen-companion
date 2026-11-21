import { Suspense } from 'react'
import FamilyCircle from '@/components/FamilyCircle'
import PageSkeleton from '@/components/PageSkeleton'

export default function CirclePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FamilyCircle />
    </Suspense>
  )
}
