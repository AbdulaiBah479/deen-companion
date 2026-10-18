'use client'

import { useCallback, useEffect, useId, useState } from 'react'

// localStorage-backed state shared across components and tabs' storage.
//
// - Starts with `initial` (so server and first client render match), then loads the saved value after mount.
//   `ready` is false until the saved value has been loaded.
// - Every write records a timestamp (used by cross-device sync) and fires "deen:changed".
// - Components using the same key stay in sync within the page via "deen:local".
// - When sync pulls newer data from the server it fires "deen:pulled" and mounted hooks reload.

export const TS_KEY = 'deen:_ts'
export const CHANGED_EVENT = 'deen:changed'
export const PULLED_EVENT = 'deen:pulled'
const LOCAL_EVENT = 'deen:local'

export function readTimestamps(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(TS_KEY) || '{}')
  } catch {
    return {}
  }
}

// Record that `key` was modified now (call after writing to localStorage yourself).
export function touchKey(key: string) {
  try {
    const ts = readTimestamps()
    ts[key] = Date.now()
    localStorage.setItem(TS_KEY, JSON.stringify(ts))
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { key } }))
  } catch {}
}

export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [ready, setReady] = useState(false)
  const instance = useId()

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(key)
        if (raw !== null) setValue(JSON.parse(raw) as T)
      } catch {}
    }
    read()
    setReady(true)

    const onPulled = (e: Event) => {
      const keys = (e as CustomEvent<{ keys: string[] }>).detail?.keys
      if (!keys || keys.includes(key)) read()
    }
    const onLocal = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; value: T; source: string }>).detail
      if (d.key === key && d.source !== instance) setValue(d.value)
    }
    // Another browser tab changed it.
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) read()
    }
    window.addEventListener(PULLED_EVENT, onPulled)
    window.addEventListener(LOCAL_EVENT, onLocal)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(PULLED_EVENT, onPulled)
      window.removeEventListener(LOCAL_EVENT, onLocal)
      window.removeEventListener('storage', onStorage)
    }
  }, [key, instance])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
          // Defer so we never dispatch events while React is mid-render.
          queueMicrotask(() => {
            touchKey(key)
            window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: { key, value: resolved, source: instance } }))
          })
        } catch {}
        return resolved
      })
    },
    [key, instance]
  )

  return [value, update, ready] as const
}

export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
