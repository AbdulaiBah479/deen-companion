'use client'

import { useEffect } from 'react'
import { reportError } from '@/components/ErrorReporter'

// Last resort: the whole app failed to render.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError('boundary', error.message || 'App crashed', error.digest)
  }, [error])
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1.5rem' }}>
        <h1>Something went wrong</h1>
        <p>Your saved progress is safe. Please try again.</p>
        <button onClick={reset} style={{ padding: '0.6rem 1.4rem', borderRadius: 12, background: '#0F766E', color: '#fff', border: 0, fontWeight: 600 }}>
          Try again
        </button>
      </body>
    </html>
  )
}
