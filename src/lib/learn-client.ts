'use client'

import { useEffect, useState } from 'react'
import { STATIC_LESSONS, buildLetterLessons, buildWordLessons, type Lesson } from './learn-content'

// Lessons for a course. Letters and static courses are instant; the Quran-words course loads its frequency data.
export function useLessons(pathId: string) {
  const [lessons, setLessons] = useState<Lesson[]>(() => (pathId === 'letters' ? buildLetterLessons() : STATIC_LESSONS[pathId] ?? []))
  const [loading, setLoading] = useState(pathId === 'words')
  const [error, setError] = useState('')

  useEffect(() => {
    if (pathId !== 'words') {
      setLessons(pathId === 'letters' ? buildLetterLessons() : STATIC_LESSONS[pathId] ?? [])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch('/api/learn/words')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (!d.rows) throw new Error(d.error)
        setLessons(buildWordLessons(d.rows, d.total))
      })
      .catch(() => !cancelled && setError('Could not load the word list. Run `npm run data` and refresh.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [pathId])

  return { lessons, loading, error }
}
