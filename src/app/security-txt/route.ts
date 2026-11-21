import { connection } from 'next/server'
import { SITE_URL } from '@/lib/seo'

// /.well-known/security.txt (RFC 9116): how to report a security problem. Served from here through a rewrite in next.config.ts.
export async function GET() {
  await connection()
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL
  const expires = new Date(Date.now() + 300 * 86_400_000).toISOString()
  const lines = [contact ? `Contact: mailto:${contact}` : `Contact: ${SITE_URL}/report`, `Expires: ${expires}`, 'Preferred-Languages: en', `Canonical: ${SITE_URL}/.well-known/security.txt`, `Policy: ${SITE_URL}/legal/terms`, '']
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
