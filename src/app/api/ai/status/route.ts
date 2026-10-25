import { NextResponse } from 'next/server'
import { aiStatus } from '@/lib/ai'

// Which AI providers are configured and healthy. Never exposes keys — only whether each is ready (names and reasons are for the signed-in control room).
export async function GET() {
  const s = aiStatus()
  return NextResponse.json({
    configured: s.providers.length,
    providers: s.providers.map((p) => ({ available: p.available, retryInSeconds: Math.ceil(p.retryInMs / 1000) })),
  })
}
