import type { MetadataRoute } from 'next'

// Search engines may read the public pages but have no reason to crawl the JSON APIs.
export default function robots(): MetadataRoute.Robots {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/[/]$/, '')
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/login', '/signup'] }], ...(site ? { sitemap: site + '/sitemap.xml' } : {}) }
}
