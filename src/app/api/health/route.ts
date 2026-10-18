import { NextResponse } from 'next/server'
import { configuredProviders } from '@/lib/ai'
import { dataAvailable } from '@/lib/data'

// GET /api/health — for uptime monitors (UptimeRobot, Better Stack, Vercel checks). 200 = the app is up and its data is present.
// Reveals counts only, never keys or names.
export async function GET() {
  const dataOk = dataAvailable()
  return NextResponse.json(
    { ok: dataOk, data: dataOk, aiProviders: configuredProviders().length, sharedRateLimit: !!process.env.UPSTASH_REDIS_REST_URL, time: new Date().toISOString() },
    { status: dataOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
