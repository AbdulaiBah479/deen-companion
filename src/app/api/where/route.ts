import { NextRequest, NextResponse, connection } from 'next/server'
import { roughPlace } from '@/lib/ip-place'

// An approximate place (about 10 km) from the network, when the device itself will not share its location.
export async function GET(request: NextRequest) {
  await connection()
  const p = roughPlace(request.headers)
  if (!p) return NextResponse.json({ error: 'unknown' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(p, { headers: { 'Cache-Control': 'no-store' } })
}
