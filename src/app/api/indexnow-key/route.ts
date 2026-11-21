import { NextRequest, NextResponse, connection } from 'next/server'

// IndexNow (Bing, Yandex and others): the proof that this site owns the key is a text file named after the key. It is served here
// through a rewrite in next.config.ts. Set INDEXNOW_KEY (8–128 letters, digits or dashes; 32 hex characters is typical).
export async function GET(request: NextRequest) {
  await connection()
  const key = process.env.INDEXNOW_KEY || ''
  const asked = request.nextUrl.searchParams.get('key') || ''
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key) || asked !== key) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
