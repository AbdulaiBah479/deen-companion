import 'server-only'

// Fetching and tidying tafsir text, shared by the tafsir routes (the plain reader, connected verses, and the plain-language summary).

export function toParagraphs(html: string): string[] {
  return html
    .replace(/<\/(p|h[1-6]|li|div)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

// The commentary of one source on one verse, from the Quran.Foundation API (kept for a week). Null when there is none or it is unreachable.
export async function fetchTafsir(key: string, id: number): Promise<{ source: string; paragraphs: string[] } | null> {
  try {
    const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${key}`, { next: { revalidate: 604800 }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const data = await res.json()
    const paragraphs = toParagraphs(data.tafsir?.text || '')
    return paragraphs.length ? { source: data.tafsir?.resource_name || 'Tafsir', paragraphs } : null
  } catch {
    return null
  }
}
