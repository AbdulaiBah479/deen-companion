import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Deen Companion',
    short_name: 'Deen',
    description: 'Quran, prayer times, hadith, dhikr and an Islamic AI companion — free for every Muslim.',
    start_url: '/dashboard',
    scope: '/',
    lang: 'en',
    dir: 'auto',
    orientation: 'any',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    prefer_related_applications: false,
    background_color: '#F8FAFC',
    theme_color: '#0F766E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    // Long-press the installed icon (Android) to jump straight in.
    shortcuts: [
      { name: 'Read the Quran', short_name: 'Quran', url: '/quran', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Prayer times', short_name: 'Prayer', url: '/prayer', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Qibla direction', short_name: 'Qibla', url: '/qibla', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Verse Journey', short_name: 'Journey', url: '/journey', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Tafsir study', short_name: 'Tafsir', url: '/tafsir', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Ask the AI companion', short_name: 'Ask AI', url: '/companion', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
    categories: ['lifestyle', 'education', 'books'],
  }
}
