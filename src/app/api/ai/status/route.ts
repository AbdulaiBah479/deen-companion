import { NextResponse } from 'next/server'
import { aiStatus } from '@/lib/ai'

// Which AI providers are configured and healthy. Never exposes keys — only names and cool-down state.
export async function GET() {
  const s = aiStatus()
  return NextResponse.json({
    configured: s.providers.length,
    providers: s.providers.map((p) => ({ name: p.name, available: p.available, retryInSeconds: Math.ceil(p.retryInMs / 1000), reason: p.kind })),
    cachedAnswers: s.cachedAnswers,
  })
}
