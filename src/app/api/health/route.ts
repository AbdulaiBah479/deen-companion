import { NextResponse } from 'next/server'
import { dataAvailable } from '@/lib/data'

// GET /api/health — for uptime monitors (UptimeRobot, Better Stack, Vercel checks). 200 = the app is up and its data is present.
// Reveals nothing about the set-up (no provider counts or names); the detail is in the signed-in control room.
export async function GET() {
  const dataOk = dataAvailable()
  return NextResponse.json(
    { ok: dataOk, time: new Date().toISOString() },
    { status: dataOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
