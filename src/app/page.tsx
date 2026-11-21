import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { appLd, faqLd, organizationLd, pageMetadata, websiteLd } from '@/lib/seo'

export const metadata: Metadata = pageMetadata('/')

const FAQ = [
  { q: 'Is Deen Companion free?', a: 'Yes. It is free for everyone, with no ads and no tracking. It is kept running by voluntary support, and the Support page shows exactly where every contribution goes.' },
  { q: 'Does it work without internet?', a: 'Yes, much of it does. You can save the Quran text, recitation audio, duas, rituals, courses and tools on your device, and prayer times and the Qibla direction are calculated on your phone.' },
  { q: 'How are the prayer times calculated?', a: 'On your device, from your location, using the calculation method that is usual for your country. You can change the method and the place at any time. Times are checked against a reference service to within a couple of minutes.' },
  { q: 'Which Quran reciters and translations are included?', a: 'There are 25 reciters, translations in 13 languages, tajweed colours, word-by-word meaning and 12 tafsirs. You can choose any verses and repeat them as many times as you want.' },
  { q: 'Is the AI companion a source of fatwas?', a: 'No. It answers from the Quran, hadith and tafsir texts in the app, shows the sources, and is clearly labelled as AI. For rulings about your own situation, ask a qualified scholar.' },
  { q: 'Can I install it on my phone?', a: 'Yes. Open the site in your browser and choose Add to Home Screen (iPhone) or Install (Android and computers). It then opens like any other app.' },
]

const FEATURES: [string, string, string][] = [
  ['🎙', 'Quran Identifier', 'Hear a recitation and find which verse it is'],
  ['📖', 'Full Quran + Tafsir', 'All 114 surahs, word by word, tafsir, 25 reciters'],
  ['🤖', 'AI Companion', 'Ask a question and get an answer that points to the Quran and hadith it is based on'],
  ['📿', 'Hifz Coach', 'Memorise with spaced repetition and a recite-from-memory check'],
  ['📚', 'Islamic Stories', '40 stories, each with the real Quran verses'],
  ['🕌', 'Prayer Tracker', 'Accurate times, reminders, streaks, journal'],
  ['🧠', 'Quizzes & Games', 'Four games, a daily quiz and quizzes by topic'],
  ['🃏', 'Flashcards', 'Quranic vocab, 99 Names, duas — with SRS algorithm'],
  ['💚', 'Zakat & Giving', 'Calculate your zakat and see where it can go — we never handle your money'],
]

const STATS: [string, string][] = [
  ['114', 'Surahs with Tafsir'],
  ['25', 'Reciters'],
  ['9', 'Hadith collections'],
  ['Free', 'No ads, no tracking'],
]

const STORIES = [
  'Prophet Ibrahim ﷺ',
  'Prophet Yusuf ﷺ',
  'Maryam',
  'Ashab al-Kahf',
  'The Hijra',
  'Bilal ibn Rabah',
  'Conquest of Makkah',
]

export default function HomePage() {
  // Until accounts are switched on, every button goes straight into the app (a sign-up form would lead nowhere).
  const accounts = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const join = accounts ? '/signup' : '/dashboard'
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <JsonLd data={[websiteLd(), organizationLd(), appLd(), faqLd(FAQ)]} />
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-50">
        <div className="flex items-center gap-2 font-black text-base sm:text-xl shrink-0">
          <span className="text-2xl">☪</span>
          <span className="text-[#0F766E]">Deen</span>
          <span className="text-gold">Companion</span>
        </div>
        <div className="flex gap-2 sm:gap-3 shrink-0">
          <Link
            href="/login"
            hidden={!accounts}
            className="hidden sm:inline-block px-4 py-2 whitespace-nowrap text-[#0F766E] border border-[#0F766E] rounded-xl text-sm font-semibold hover:bg-[#0F766E] hover:text-white transition-all"
          >
            Sign In
          </Link>
          <Link
            href={join}
            className="px-3 sm:px-4 py-2 whitespace-nowrap bg-[#0F766E] text-white rounded-xl text-sm font-semibold hover:bg-[#0D5C57] transition-all"
          >
            <span className="sm:hidden">Get started</span>
            <span className="hidden sm:inline">Get Started Free</span>
          </Link>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-[#0F766E] via-[#0D6B5E] to-[#15803D] text-white px-5 sm:px-6 py-12 sm:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-[#D4AF37]/20 text-[#E6C86A] px-4 py-2 rounded-full text-sm font-bold mb-6 border border-[#D4AF37]/30">
            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
            The Complete Islamic Hub
            <br />
            for Every Muslim
          </h1>
          <p className="text-base sm:text-lg opacity-90 mb-6 sm:mb-8 leading-relaxed">
            Quran, prayer times, an AI companion that cites its sources, stories, games and more. Free,
            with no ads.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={join}
              className="bg-[#D4AF37] text-[#1a0e00] px-8 py-3 rounded-xl font-bold text-lg hover:bg-[#C9A227] transition-all"
            >
              Start For Free ✨
            </Link>
            <Link
              href="/dashboard"
              className="bg-white/15 text-white px-8 py-3 rounded-xl font-semibold text-lg border border-white/30 hover:bg-white/25 transition-all"
            >
              Open App →
            </Link>
          </div>
          <p className="sm:hidden mt-4 text-sm opacity-90" hidden={!accounts}>
            Already have an account?{' '}
            <Link href="/login" className="underline font-semibold">
              Sign in
            </Link>
          </p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-4 sm:gap-8 mt-8 sm:mt-12">
            {STATS.map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-black text-[#E6C86A]">{num}</div>
                <div className="text-sm opacity-80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-10 sm:py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-[#0F766E] text-center mb-2">
          Everything You Need for Your Deen
        </h2>
        <p className="text-gray-500 text-center mb-10">
          Built with authentic Islamic sources. Designed for the modern Muslim.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map(([icon, title, desc]) => (
            <div key={title} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{icon}</div>
              <div className="font-bold text-gray-900 mb-1">{title}</div>
              <div className="text-gray-500 text-sm leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#0F766E]/10 to-[#15803D]/10 px-6 py-14">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-2xl font-black text-[#0F766E] mb-3">
            Islamic Stories — With Real Quran Ayahs
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Every story pauses at key moments to show the exact Arabic ayah from the Quran and the
            authentic Hadith reference. Not just storytelling — Islamic education.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {STORIES.map((s) => (
              <span
                key={s}
                className="bg-white border border-[#0F766E]/30 text-[#0F766E] px-3 py-1 rounded-full text-sm font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-2xl sm:text-3xl font-black text-center mb-6">Questions people ask</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-2xl border border-gray-200 bg-white p-4 group">
              <summary className="cursor-pointer font-bold">{f.q}</summary>
              <p className="mt-2 text-gray-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-500 px-6 py-10 text-center">
        <div className="text-lg font-black text-[#E6C86A] mb-2">☪ Deen Companion</div>
        <p className="text-sm mb-2">
          Helping Muslims worldwide strengthen their connection with Allah.
        </p>
        <p className="text-xs opacity-50">
          © 2026 Abdulai Bah. All rights reserved. Deen Companion is proprietary software. Free for all Muslims · No ads · No data selling
        </p>
      </footer>
    </main>
  )
}
