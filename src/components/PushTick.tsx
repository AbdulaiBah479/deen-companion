'use client'

import { useEffect } from 'react'

// Backup for the reminder scheduler: while the app is open on a phone that has "remind me even when the app is closed" switched on,
// it asks the server every few minutes to send any reminders that are due. Does nothing on phones without reminders.
export default function PushTick() {
  useEffect(() => {
    const on = () => {
      try {
        return (JSON.parse(localStorage.getItem('deen:push') || '{}') as { on?: boolean }).on === true
      } catch {
        return false
      }
    }
    const tick = () => {
      if (document.visibilityState === 'visible' && on()) fetch('/api/push/tick', { method: 'POST', keepalive: true }).catch(() => {})
    }
    tick()
    const id = window.setInterval(tick, 4 * 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return null
}
