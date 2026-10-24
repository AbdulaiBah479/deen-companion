import { connection, NextResponse } from 'next/server'
import { readCauses } from '@/lib/causes'

// GET /api/causes — the causes shown on the Zakat page (only the active ones).
export async function GET() {
  await connection() // read the live list on every request, never a copy made at build time
  const { causes } = await readCauses()
  return NextResponse.json({ causes: causes.filter((c) => c.active) }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' } })
}
