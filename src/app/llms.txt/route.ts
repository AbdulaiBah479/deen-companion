import { HOME_META, PAGES, SITE_NAME, SITE_URL } from '@/lib/seo'

// A plain-text guide to the site for AI assistants and other automated readers (the llms.txt convention): what the site is, and where
// the main things are. Built from the same table as the page titles, so it never goes out of date.
const SECTIONS: [string, string[]][] = [
  ['Quran and study', ['/quran', '/tafsir', '/hadith', '/search', '/recite', '/hifz', '/goals']],
  ['Worship', ['/prayer', '/qibla', '/duas', '/dhikr', '/rituals', '/basics', '/ramadan', '/qada', '/calendar', '/converter']],
  ['Learn', ['/learn', '/stories', '/heritage', '/library', '/books', '/guides', '/quiz', '/games', '/flashcards']],
  ['Tools', ['/zakat', '/giving', '/names', '/baby-names', '/halal', '/journal', '/mosques']],
]

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${HOME_META.description}`,
    '',
    'A free, ad-free Islamic web app for everyone. The Quran and hadith texts come from open sources and are credited on the credits page. It is a learning aid, not a source of fatwas; the AI companion answers only from the texts in the app and says so.',
    '',
  ]
  for (const [title, paths] of SECTIONS) {
    lines.push(`## ${title}`, '')
    for (const p of paths) if (PAGES[p]) lines.push(`- [${PAGES[p].title}](${SITE_URL}${p}): ${PAGES[p].description}`)
    lines.push('')
  }
  lines.push('## Details', '', `- Every surah is at ${SITE_URL}/quran/<1-114>, with the verses in Arabic and English in the page itself.`, `- Sitemap: ${SITE_URL}/sitemap.xml`, `- Sources and credits: ${SITE_URL}/legal/credits`, `- Privacy: ${SITE_URL}/legal/privacy`, '')
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
}
