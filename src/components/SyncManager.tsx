'use client'

import { useEffect } from 'react'
import { applyPrefs, usePrefs } from '@/lib/prefs'
import { useStored } from '@/lib/storage'
import { startSync } from '@/lib/sync'

// Starts cross-device sync (when configured) and applies display preferences (theme, text sizes, kids mode) app-wide.
export default function SyncManager() {
  const [kids] = useStored<boolean>('deen:kids', false)
  const { prefs } = usePrefs()

  useEffect(() => {
    startSync()
  }, [])

  useEffect(() => {
    applyPrefs(prefs, kids)
    if (prefs.theme !== 'system') return
    // Follow the device setting live while "System" is selected.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyPrefs(prefs, kids)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [prefs, kids])

  return null
}
