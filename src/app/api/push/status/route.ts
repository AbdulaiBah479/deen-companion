import { connection, NextResponse } from 'next/server'
import { lastRunAgeMin, pushConfigured, SCHEDULER_STALE_MIN } from '@/lib/push'
import { redis, redisConfigured } from '@/lib/redis'

// GET /api/push/status — does this server send prayer reminders, and what is the public key the browser needs?
export async function GET() {
  await connection() // answer from the live settings, never a copy made during the build
  const configured = pushConfigured()
  // Is something actually calling the app every few minutes to send the reminders? (Without it, no reminder is ever sent.)
  let schedulerOk = true
  if (configured && redisConfigured()) {
    try {
      const [n] = (await redis([['SCARD', 'push:ids']])) as [number]
      const age = await lastRunAgeMin()
      schedulerOk = Number(n) === 0 || (age !== null && age <= SCHEDULER_STALE_MIN)
    } catch {}
  }
  return NextResponse.json({ configured, publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null, schedulerOk }, { headers: { 'Cache-Control': 'no-store' } })
}
