import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

// The scheduler proves itself with  Authorization: Bearer <CRON_SECRET>. A missing or weak secret means "nobody".
export function cronAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 16) return false
  const given = request.headers.get('authorization') || ''
  const want = `Bearer ${secret}`
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want))
}
