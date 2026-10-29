import { connection, NextResponse } from 'next/server'
import { donateLink } from '@/lib/support-shared'
import { readLedger, readSponsor } from '@/lib/support'

// GET /api/support — everything the Support page and the sponsor slot show: the public ledger, the active sponsor (if any), and the
// donation link the owner set (NEXT_PUBLIC_DONATE_URL). Public by design: it is the "where the money goes" page.
export async function GET() {
  await connection()
  const [ledger, sponsor] = await Promise.all([readLedger(), readSponsor()])
  return NextResponse.json(
    { ledger, sponsor: sponsor.active ? sponsor : null, donateUrl: donateLink(process.env.NEXT_PUBLIC_DONATE_URL) },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' } }
  )
}
