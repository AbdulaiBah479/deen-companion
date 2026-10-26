import { Suspense } from 'react'
import FamilyCircle from '@/components/FamilyCircle'

export default function CirclePage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <FamilyCircle />
    </Suspense>
  )
}
