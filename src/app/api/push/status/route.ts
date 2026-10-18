import { connection, NextResponse } from 'next/server'
import { pushConfigured } from '@/lib/push'

// GET /api/push/status — does this server send prayer reminders, and what is the public key the browser needs?
export async function GET() {
  await connection() // answer from the live settings, never a copy made during the build
  const configured = pushConfigured()
  return NextResponse.json({ configured, publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null }, { headers: { 'Cache-Control': 'no-store' } })
}
