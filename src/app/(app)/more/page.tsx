'use client'

import Link from 'next/link'
import { useStored } from '@/lib/storage'

const ITEMS = [
  { href: '/recite', icon: '🎤', title: 'Recite', desc: 'Follow along — mistakes flagged', kids: false },
  { href: '/reels/create', icon: '🎬', title: 'Create a Reel', desc: 'Record your recitation', kids: false },
  { href: '/goals', icon: '📅', title: 'Khatam Planner', desc: 'Finish the Quran, page by page', kids: false },
  { href: '/habits', icon: '✅', title: 'Daily Deeds', desc: 'Habits, streaks, weekly view', kids: true },
  { href: '/calendar', icon: '🗓', title: 'Islamic Calendar', desc: 'Hijri dates & occasions', kids: true },
  { href: '/guides', icon: '🕋', title: 'Hajj, Umrah & Seerah', desc: 'Step-by-step & timeline', kids: true },
  { href: '/prayer', icon: '🕌', title: 'Prayer Times', desc: 'Times, tracker & reminders', kids: false },
  { href: '/hadith', icon: '📚', title: 'Hadith', desc: 'Nine collections, 8 languages', kids: false },
  { href: '/identify', icon: '🎙', title: 'Quran Identifier', desc: 'Which verse is this?', kids: false },
  { href: '/search', icon: '🔎', title: 'Search', desc: 'Quran & hadith by meaning', kids: false },
  { href: '/stories', icon: '📖', title: 'Stories', desc: '40+ stories: prophets, nations, Seerah', kids: true },
  { href: '/heritage', icon: '👑', title: 'Great Muslims', desc: 'Kings, scientists, scholars & explorers', kids: true },
  { href: '/lectures', icon: '🎓', title: 'Lectures', desc: 'Latest talks from chosen teachers', kids: false },
  { href: '/library', icon: '🏛️', title: 'Library', desc: 'Companions, history, places, scholars — always current', kids: false },
  { href: '/circle', icon: '👨‍👩‍👧', title: 'Family circle', desc: 'Read Quran together, share streaks and a verse a week', kids: false },
  { href: '/listen', icon: '🎧', title: 'Listen mode', desc: 'Recitation, meaning and a reflection, hands-free', kids: false },
  { href: '/journey', icon: '🌿', title: 'Verse Journey', desc: 'A few quiet minutes for what is on your heart', kids: false },
  { href: '/tafsir', icon: '📖', title: 'Tafsir study', desc: 'Understand any verse, with connected verses and audio', kids: false },
  { href: '/khutbah', icon: '🎙️', title: 'Sermons (khutbah)', desc: 'Friday & occasion sermons for imams, with audio', kids: false },
  { href: '/books', icon: '📚', title: 'Islamic books', desc: 'Classic books in Arabic & English, with audio', kids: false },
  { href: '/hifz', icon: '🧠', title: 'Hifz Coach', desc: 'Memorise with spaced repetition', kids: false },
  { href: '/duas', icon: '🤲', title: 'Duas & Adhkar', desc: 'Morning, evening, after salah', kids: true },
  { href: '/dhikr', icon: '📿', title: 'Dhikr Counter', desc: 'Tap to count', kids: true },
  { href: '/names', icon: '✨', title: '99 Names', desc: 'Asma ul-Husna', kids: true },
  { href: '/quiz', icon: '❓', title: 'Daily Quiz', desc: 'Test your knowledge', kids: true },
  { href: '/flashcards', icon: '🃏', title: 'Flashcards', desc: 'Names & duas with SRS', kids: true },
  { href: '/games', icon: '🎮', title: 'Games', desc: 'Verse Builder & more', kids: true },
  { href: '/mosques', icon: '🕌', title: 'Find a Mosque', desc: 'Nearby, from OpenStreetMap', kids: false },
  { href: '/qibla', icon: '🧭', title: 'Qibla Finder', desc: 'Compass to the Kaaba', kids: false },
  { href: '/zakat', icon: '💰', title: 'Zakat Calculator', desc: 'Live nisab & amount due', kids: false },
  { href: '/ruqyah', icon: '🛡️', title: 'Ruqyah', desc: 'Protection & healing from the Quran and Sunnah', kids: false },
  { href: '/ramadan', icon: '🌙', title: 'Ramadan Tracker', desc: 'Fasting & Quran goals', kids: true },
  { href: '/donate', icon: '💚', title: 'Sadaqah Journal', desc: 'Track your giving', kids: false },
  { href: '/report', icon: '⚑', title: 'Report a problem', desc: 'A mistake, a bug, or an idea', kids: false },
  { href: '/settings', icon: '⚙️', title: 'Settings', desc: 'Language, kids mode, backup', kids: true },
]

export default function MorePage() {
  const [kids] = useStored<boolean>('deen:kids', false)
  const items = kids ? ITEMS.filter((i) => i.kids) : ITEMS
  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Everything else</h1>
      {kids && <p className="text-sm text-gray-500 mb-3">Kids mode is on — showing the child-friendly parts. Change it in Settings.</p>}
      <div className="grid grid-cols-2 gap-3 mt-3">
        {items.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#0F766E] transition-colors"
          >
            <div className="text-3xl mb-2">{t.icon}</div>
            <div className="font-bold">{t.title}</div>
            <div className="text-xs text-gray-500">{t.desc}</div>
          </Link>
        ))}
      </div>
      <nav aria-label="About" className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-gray-500">
        <Link href="/legal/privacy" className="underline">
          Privacy
        </Link>
        <Link href="/legal/terms" className="underline">
          Terms
        </Link>
        <Link href="/legal/credits" className="underline">
          Sources &amp; credits
        </Link>
      </nav>
    </div>
  )
}
