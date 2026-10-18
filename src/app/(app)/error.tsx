'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { reportError } from '@/components/ErrorReporter'

// Shown instead of a blank screen if a page crashes. The crash is reported (anonymously) so it can be fixed.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError('boundary', error.message || 'Page crashed', error.digest)
  }, [error])
  return (
    <div className="text-center py-16" role="alert">
      <p className="text-5xl mb-3">🌙</p>
      <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
      <p className="text-gray-600 mb-5">Sorry about that. Your saved progress is safe. Please try again.</p>
      <div className="flex justify-center gap-3">
        <button onClick={reset} className="px-5 py-2 rounded-xl bg-[#0F766E] text-white font-semibold">
          Try again
        </button>
        <Link href="/dashboard" className="px-5 py-2 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold">
          Go home
        </Link>
      </div>
    </div>
  )
}
