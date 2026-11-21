import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// Search engines (and AI assistants that read the web) may read every public page. They have no reason to crawl the JSON APIs, the
// sign-in pages or the owner's control room.
export default function robots(): MetadataRoute.Robots {
  const live = !SITE_URL.includes('localhost')
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/login', '/signup', '/offline', '/auth'] }],
    ...(live ? { sitemap: SITE_URL + '/sitemap.xml', host: SITE_URL } : {}),
  }
}
