'use client'

import { useEffect } from 'react'

// Sends a short, anonymous note to the app’s own server when something crashes, so problems get fixed. See the privacy page.
export function reportError(kind: 'error' | 'rejection' | 'boundary', message: string, source = '') {
  try {
    const body = JSON.stringify({ kind, message, source, page: location.pathname })
    if (!navigator.sendBeacon?.('/api/client-error', new Blob([body], { type: 'application/json' }))) {
      fetch('/api/client-error', { method: 'POST', body, keepalive: true }).catch(() => {})
    }
  } catch {}
}

export default function ErrorReporter() {
  useEffect(() => {
    let sent = 0
    const seen = new Set<string>()
    const once = (kind: 'error' | 'rejection', message: string, source?: string) => {
      const k = kind + message
      if (sent >= 5 || seen.has(k)) return // a loop of errors must not flood the server
      seen.add(k)
      sent++
      reportError(kind, message, source)
    }
    const onError = (e: ErrorEvent) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.') return // harmless browser noise
      once('error', e.message || 'Script error', e.filename)
    }
    const onRejection = (e: PromiseRejectionEvent) => once('rejection', e.reason instanceof Error ? e.reason.message : String(e.reason))
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
