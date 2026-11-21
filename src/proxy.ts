import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buildCsp } from '@/lib/csp'
import { missing } from '@/lib/route-check'

// Adds the Content-Security-Policy to every page and API response. The other security headers are static (see next.config.ts).
// Also answers an address that does not exist (a surah 999, /stories/nope…) with a real 404 (see lib/route-check.ts).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const res = missing(pathname) ? NextResponse.rewrite(new URL('/not-found-404', request.url)) : NextResponse.next()
  res.headers.set('Content-Security-Policy', buildCsp())
  return res
}

export const config = {
  // Skip build assets and the public folder's static files; they carry no scripts of their own.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|ico|json)$).*)'],
}
