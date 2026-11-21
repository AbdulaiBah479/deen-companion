import { jsonLdString } from '@/lib/seo'

// Structured data for search engines (schema.org JSON-LD). Rendered on the server so it is in the page's HTML.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
}
