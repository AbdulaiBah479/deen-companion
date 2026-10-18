'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/quran', label: 'Quran', icon: '📖' },
  { href: '/reels', label: 'Reels', icon: '▶️' },
  { href: '/learn', label: 'Learn', icon: '🎓' },
  { href: '/companion', label: 'AI', icon: '🤖' },
  { href: '/more', label: 'More', icon: '✨' },
]

// Pages reachable from the More hub should keep "More" highlighted.
const MORE_PREFIXES = [
  '/more', '/dhikr', '/duas', '/names', '/qibla', '/zakat', '/quiz', '/flashcards',
  '/hifz', '/stories', '/games', '/ramadan', '/donate',
  '/identify', '/search', '/mosques', '/settings', '/prayer', '/hadith',
  '/recite', '/goals', '/habits', '/calendar', '/guides', '/library', '/lectures', '/heritage', '/legal',
]

export default function AppNav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/more'
      ? MORE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="font-black text-lg flex items-center gap-1">
          <span>☪</span>
          <span className="text-[#0F766E]">Deen</span>
          <span className="text-gold">Companion</span>
        </Link>
        <nav className="hidden md:flex gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                isActive(l.href) ? 'bg-[#0F766E] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {l.icon} {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 grid grid-cols-6 z-40">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center py-2 text-[11px] font-semibold ${
              isActive(l.href) ? 'text-[#0F766E]' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
