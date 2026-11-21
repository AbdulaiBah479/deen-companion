// One place for everything a search engine or a link preview reads: page titles, descriptions, canonical addresses, social-sharing tags
// and structured data (JSON-LD). Every page of the app gets its own, built from this table, so no page is left with a generic title.
// Tests (tests/seo.test.mts) check that every real page has an entry, that titles and descriptions are the right length and unique,
// and that the structured data is well formed.
import type { Metadata } from 'next'

export const SITE_NAME = 'Deen Companion'
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
export const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_NAME || 'Abdulai Bah'

export type PageMeta = { title: string; description: string; keywords?: string[] }

// Titles are short (the site name is added after them); descriptions are one honest sentence of 70–160 characters.
export const PAGES: Record<string, PageMeta> = {
  '/dashboard': { title: 'Your daily dashboard', description: 'Your daily Islamic dashboard: next prayer, verse and hadith of the day, Quran progress, streaks and everything else, free and offline-ready.' },
  '/quran': { title: 'The Noble Quran: read, listen and study', description: 'Read the Quran in Arabic with 13 translations, tajweed colours, word-by-word meaning and 25 reciters. Choose any verses and repeat them as you like.', keywords: ['read Quran online', 'Quran translation', 'Quran recitation', 'tajweed'] },
  '/prayer': { title: 'Prayer times and reminders', description: 'Accurate prayer times for your exact place, calculated on your phone, with adhan, reminders and a daily prayer tracker. Works offline.', keywords: ['prayer times', 'salah times', 'adhan', 'namaz time'] },
  '/reels': { title: 'Islamic reels', description: 'Short Quran recitation videos with captions that follow the recitation. Watch, share, or record your own recitation.' },
  '/learn': { title: 'Learn Arabic and Islam: free courses', description: 'Free courses for children and adults: Arabic letters, Quran words, tajweed, Arabic for beginners, the Seerah and more, with quizzes and certificates.', keywords: ['learn Arabic', 'Islamic courses', 'Quran for kids', 'tajweed course'] },
  '/companion': { title: 'AI Islamic companion', description: 'Ask questions about the Quran, hadith and daily Islamic life. Answers are grounded in the texts, with the sources shown, and clearly labelled as AI.' },
  '/stories': { title: 'Stories of the Prophets and the Quran', description: 'Forty stories from the Quran and the Seerah, told with the verses they come from: the prophets, past nations and the life of Prophet Muhammad ﷺ.', keywords: ['stories of the prophets', 'Quran stories', 'Seerah'] },
  '/heritage': { title: 'Great Muslims in history', description: 'Kings, scientists, scholars, explorers and mothers of the faith: short biographies of 46 Muslims who shaped history.' },
  '/library': { title: 'Islamic library: companions, history and places', description: 'Over 150 topics on the companions, scholars, history, places and what Islam teaches, always current and linked to the sources.' },
  '/lectures': { title: 'Islamic lectures', description: 'The newest talks from chosen teachers and institutions, in one place, updated automatically. Videos load only when you press play.' },
  '/quiz': { title: 'Daily Islamic quiz', description: 'A new Islamic knowledge quiz every day, by category, with explanations. Test yourself on the Quran, Seerah, prophets and fiqh.' },
  '/games': { title: 'Islamic games', description: 'Learn while you play: build verses, guess the person, order the timeline of Islamic history. Fun for children and adults.' },
  '/hadith': { title: 'Hadith: nine collections in eight languages', description: 'Browse Sahih al-Bukhari, Sahih Muslim and seven more collections by chapter, in Arabic and eight languages, with grades, copy and share.', keywords: ['hadith', 'Sahih Bukhari', 'Sahih Muslim', 'Forty Hadith Nawawi'] },
  '/duas': { title: 'Duas and adhkar', description: 'Morning and evening adhkar, duas after prayer and for daily life, in Arabic with transliteration and meaning. Saved for offline use.', keywords: ['dua', 'adhkar', 'morning adhkar', 'evening adhkar'] },
  '/names': { title: '99 Names of Allah', description: 'Asma ul-Husna: the 99 beautiful names of Allah with Arabic, transliteration and meaning, to learn, hear and remember.', keywords: ['99 names of Allah', 'Asma ul Husna'] },
  '/dhikr': { title: 'Dhikr counter', description: 'A simple tap counter for tasbih and dhikr with saved totals and gentle feedback. Works offline.' },
  '/qibla': { title: 'Qibla finder', description: 'Find the direction of the Kaaba from where you stand. It finds your location by itself, corrects for magnetic declination and works offline.', keywords: ['Qibla direction', 'Qibla compass', 'Qibla finder'] },
  '/zakat': { title: 'Zakat calculator', description: 'Work out your zakat with live gold and silver prices and the nisab, then see charities where it can go and how it reaches people.', keywords: ['zakat calculator', 'nisab', 'zakat on gold'] },
  '/ruqyah': { title: 'Ruqyah: protection and healing', description: 'Ruqyah from the Quran and Sunnah: the passages and supplications for protection, healing and peace, with the sources and when to say them.' },
  '/support': { title: 'Support the app', description: 'Deen Companion is free for everyone. See how it is funded, where every contribution goes, and how you can help keep it running.' },
  '/sponsor': { title: 'Sponsors', description: 'How businesses can sponsor Deen Companion, what is and is not accepted, and how sponsorship keeps the app free for everyone.' },
  '/rituals': { title: 'Rituals and special prayers, word for word', description: 'Istikhara, rain prayer, funeral prayer, Eid, travel and more: every step and every word to say in Arabic, with transliteration and meaning.', keywords: ['istikhara', 'janazah prayer', 'Eid prayer', 'prayer for rain'] },
  '/basics': { title: 'Islam basics: pillars, prayer, wudu, fasting', description: 'The foundations of Islam in plain steps: the five pillars, articles of faith, how to pray with the words to say, ghusl, fasting and manners.', keywords: ['how to pray', 'five pillars of Islam', 'how to make wudu'] },
  '/tafsir': { title: 'Tafsir study: understand any verse', description: 'Pick any verse and see 12 tafsirs, connected verses and a plain-language explanation grounded in the commentary, with audio.', keywords: ['tafsir', 'Quran tafsir', 'Ibn Kathir'] },
  '/journey': { title: 'Verse Journey: a quiet moment with the Quran', description: 'Tell us what is on your heart and receive a few verses to listen to and reflect on, with a short, calm guided reflection.' },
  '/listen': { title: 'Listen mode: hands-free Quran', description: 'Listen to a surah with its meaning and a short reflection, hands-free, with a sleep timer. Made for the car, a walk or before sleep.' },
  '/circle': { title: 'Family circle', description: 'Read the Quran together as a family or friends: share streaks and a verse of the week. Private, with no accounts needed.' },
  '/khutbah': { title: 'Friday sermons (khutbah) for imams', description: 'Ready Friday and occasion sermons with verses and hadith checked against the sources, with audio, for imams and speakers.' },
  '/books': { title: 'Classic Islamic books', description: 'Read classic Islamic books in Arabic and English with page controls, audio and clearly labelled AI help for hard passages.' },
  '/calendar': { title: 'Islamic calendar and Hijri dates', description: 'Today’s Hijri date, the month grid and the Islamic occasions ahead: Ramadan, Eid, the white days and more.', keywords: ['Hijri calendar', 'Islamic calendar', 'Islamic dates'] },
  '/guides': { title: 'Hajj, Umrah and Seerah guides', description: 'Step-by-step guides to Hajj and Umrah with the words to say, and a timeline of the life of Prophet Muhammad ﷺ.', keywords: ['Hajj guide', 'Umrah guide', 'Seerah timeline'] },
  '/ramadan': { title: 'Ramadan tracker and suhoor, iftar times', description: 'Suhoor and iftar times for your place, a fasting tracker, Quran goals and daily Ramadan reminders.', keywords: ['Ramadan timetable', 'suhoor time', 'iftar time'] },
  '/more': { title: 'Everything else', description: 'All the tools in Deen Companion in one place: tracker, journal, calculators, baby names, halal guide, converter, settings and more.' },
  '/qada': { title: 'Make-up prayers and fasts tracker', description: 'Count the prayers and fasts you owe and tick them off one by one, with a streak and an estimate of how long is left. Private on your device.', keywords: ['qada prayers', 'missed prayers', 'make up fasts'] },
  '/giving': { title: 'Zakat al-Fitr, fidya and kaffarah calculators', description: 'Work out zakat al-Fitr, fidya for missed fasts and kaffarah for a broken oath from your local food prices, with the rulings and notes.', keywords: ['zakat al fitr', 'fidya', 'kaffarah'] },
  '/journal': { title: 'Reflection journal', description: 'Write private notes about verses, hadith and duas that moved you. Searchable, downloadable and kept on your device.' },
  '/baby-names': { title: 'Islamic baby names with meanings', description: 'Over 80 Islamic names for boys and girls with the Arabic, their meanings and the prophets and companions who carried them.', keywords: ['Islamic baby names', 'Muslim names', 'Arabic names with meanings'] },
  '/halal': { title: 'Halal ingredient and E-number guide', description: 'Look up E-numbers and ingredients on food labels and see which are generally permissible, which need checking and which to avoid.', keywords: ['halal E numbers', 'is E471 halal', 'halal ingredients'] },
  '/converter': { title: 'Hijri date converter', description: 'Convert dates between the Hijri and Gregorian calendars in either direction, using the Umm al-Qura calendar. Works offline.', keywords: ['Hijri date converter', 'Islamic date converter'] },
  '/recite': { title: 'Recite: Tarteel-style practice', description: 'Recite a verse and have your mistakes flagged as you go. Practise memorisation and tajweed with instant feedback on your phone.' },
  '/hifz': { title: 'Hifz coach: memorise the Quran', description: 'Memorise the Quran with spaced repetition that schedules each verse for review exactly when you are about to forget it.', keywords: ['Quran memorization', 'hifz', 'memorise Quran'] },
  '/flashcards': { title: 'Islamic flashcards', description: 'Learn the names of Allah, duas and Quran words with spaced-repetition flashcards that adapt to what you remember.' },
  '/habits': { title: 'Daily deeds tracker', description: 'Build good habits: prayers, Quran, dhikr and charity with streaks and a weekly view. Gentle motivation, no guilt.' },
  '/goals': { title: 'Khatam planner: finish the Quran', description: 'Plan to finish the Quran in a month, a year or any time you choose, and see exactly how many pages to read each day.', keywords: ['Quran khatam plan', 'finish Quran in Ramadan'] },
  '/identify': { title: 'Quran identifier: which verse is this?', description: 'Recite or play a verse and find out which surah and ayah it is. Like a Shazam for the Quran, done on your device.' },
  '/search': { title: 'Search the Quran and hadith', description: 'Search the Quran and hadith by meaning or by word, in several languages, with the matching verses shown first.' },
  '/mosques': { title: 'Find a mosque near you', description: 'Find mosques around you or in any city, with distances and directions, from open map data.', keywords: ['mosque near me', 'find a mosque'] },
  '/donate': { title: 'Sadaqah journal', description: 'Keep a private record of your charity and giving and see it grow, so that giving becomes a habit.' },
  '/report': { title: 'Report a problem or suggest an idea', description: 'Found a mistake in a verse, a translation or a feature? Tell us and we will check it. Every report is read.' },
  '/settings': { title: 'Settings', description: 'Language, text size, theme, reading comfort, downloads for offline use, account sync and your data.' },
  '/library/read': { title: 'Read an article from the library', description: 'Read a short, sourced article on the companions, scholars, history and places of Islam, with links to learn more.' },
  '/reels/create': { title: 'Create a reel', description: 'Record your recitation over a verse background with captions and share it as a short video.' },
  '/legal/privacy': { title: 'Privacy policy', description: 'What Deen Companion stores, what stays on your device, who sees what, and how to delete everything.' },
  '/legal/terms': { title: 'Terms of use', description: 'The ground rules for using Deen Companion: a learning aid, not a fatwa, and what we ask of you in return.' },
  '/legal/credits': { title: 'Sources and credits', description: 'Where the Quran, hadith, prayer times, translations, fonts and data come from, with thanks and licences.' },
}

export const HOME_META: PageMeta = {
  title: 'Free Islamic app: Quran, prayer times, hadith, learning',
  description: 'Deen Companion is a free Islamic app: Quran with 25 reciters, accurate prayer times, hadith, Qibla, duas, courses and an AI companion. Works offline.',
  keywords: ['Islamic app', 'Quran app', 'prayer times app', 'Muslim app free', 'learn Arabic'],
}

export const absolute = (path: string) => SITE_URL + (path === '/' ? '' : path)

// Metadata for a page: its own title and description, a canonical address, and the tags used by social previews.
export function pageMetadata(path: string, override?: Partial<PageMeta>, extra: Partial<Metadata> = {}): Metadata {
  const base = path === '/' ? HOME_META : PAGES[path]
  const m = { ...(base ?? { title: SITE_NAME, description: HOME_META.description }), ...override }
  const url = absolute(path)
  return {
    title: path === '/' ? { absolute: `${SITE_NAME}: ${m.title}` } : m.title,
    description: m.description,
    keywords: m.keywords,
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName: SITE_NAME, title: m.title, description: m.description, url, locale: 'en_US', images: [{ url: absolute('/opengraph-image'), width: 1200, height: 630, alt: `${SITE_NAME}: Quran, prayer times, hadith, learning` }] },
    twitter: { card: 'summary_large_image', title: m.title, description: m.description, images: [absolute('/opengraph-image')] },
    ...extra,
  }
}

// ───────── structured data (JSON-LD) ─────────
type Json = Record<string, unknown>

export const websiteLd = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': absolute('/') + '#website',
  url: absolute('/'),
  name: SITE_NAME,
  description: HOME_META.description,
  inLanguage: 'en',
  publisher: { '@id': absolute('/') + '#org' },
  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: absolute('/search') + '?q={search_term_string}' }, 'query-input': 'required name=search_term_string' },
})

export const organizationLd = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': absolute('/') + '#org',
  name: SITE_NAME,
  url: absolute('/'),
  logo: { '@type': 'ImageObject', url: absolute('/icon-512.png'), width: 512, height: 512 },
  founder: { '@type': 'Person', name: OPERATOR },
})

export const appLd = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: absolute('/'),
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any (web browser, installable on Android, iPhone and computers)',
  browserRequirements: 'Requires JavaScript. Works offline once installed.',
  description: HOME_META.description,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  inLanguage: 'en',
  isAccessibleForFree: true,
  featureList: ['Quran with 25 reciters and 13 translations', 'Prayer times and adhan reminders', 'Hadith in nine collections', 'Qibla finder', 'Duas and adhkar', 'Free Arabic and Islamic courses', 'Works offline'],
})

export const breadcrumbLd = (items: { name: string; path: string }[]): Json => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absolute(it.path) })),
})

export const courseLd = (c: { name: string; description: string; path: string; minutes: number; level: string }): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: c.name,
  description: c.description,
  url: absolute(c.path),
  provider: { '@type': 'Organization', name: SITE_NAME, url: absolute('/') },
  educationalLevel: c.level,
  isAccessibleForFree: true,
  inLanguage: 'en',
  timeRequired: `PT${Math.max(1, Math.round(c.minutes))}M`,
  hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `PT${Math.max(1, Math.round(c.minutes))}M` },
})

export const articleLd = (a: { headline: string; description: string; path: string }): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.headline.slice(0, 110),
  description: a.description,
  mainEntityOfPage: absolute(a.path),
  author: { '@type': 'Organization', name: SITE_NAME },
  publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: absolute('/icon-512.png') } },
  image: absolute('/opengraph-image'),
  inLanguage: 'en',
})

export const faqLd = (items: { q: string; a: string }[]): Json => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
})

export const collectionLd = (name: string, path: string, items: { name: string; path: string }[]): Json => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name,
  url: absolute(path),
  mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.slice(0, 100).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: absolute(it.path) })) },
})

// Safe to put inside a <script> tag: "<" is escaped so the data can never close the tag.
export const jsonLdString = (data: Json | Json[]) => JSON.stringify(data).replace(/</g, '\\u003c')
