import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, sessionIsValid } from './admin-auth'

// For admin API routes: returns a refusal to send back, or null when the caller is the signed-in admin.
export function requireAdmin(request: NextRequest): NextResponse | null {
  if (!sessionIsValid(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  // Admin actions only come from the admin page itself on this site.
  const origin = request.headers.get('origin')
  if (request.method !== 'GET' && origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ error: 'Wrong origin' }, { status: 403 })
  }
  return null
}
