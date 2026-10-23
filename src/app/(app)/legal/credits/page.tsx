import Link from 'next/link'

export const metadata = { title: 'Sources & credits', description: 'Where the content in Deen Companion comes from, and its licences.' }

const rows: [string, string, string][] = [
  ['Quran text, translations, chapter data, word-by-word, tajweed, tafsir', 'Quran.Foundation (api.quran.com)', 'Free for non-commercial use; each translation and tafsir stays the work of its authors and publishers — shown with its name where displayed.'],
  ['Quran recitation audio', 'EveryAyah (25 reciters) and Quran.com audio', 'Streamed from their servers, not stored here. Credit to the reciters.'],
  ['Hadith (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa’i, Ibn Majah, Malik, Nawawi, Qudsi)', 'github.com/fawazahmed0/hadith-api via jsDelivr', 'Open data; the hadith belong to their compilers, translations to their translators.'],
  ['Prayer times and Hijri conversion', 'AlAdhan API (Islamic Network)', 'Free API; the Hijri calendar is also computed on your device (Umm al-Qura).'],
  ['Mosques, maps, city names', '© OpenStreetMap contributors (Overpass, Nominatim)', 'Open Database Licence (ODbL).'],
  ['Library articles (prophets, companions, history, places, scholars, beliefs)', 'Wikipedia, text shared under CC BY-SA 4.0', 'Each article links back to its source page. Encyclopedic summaries written by volunteers, not scholarly rulings.'],
  ['Reels background videos', 'Pexels', 'Free to use under the Pexels licence; videographer credited on each reel.'],
  ['Lecture videos', 'YouTube channels chosen by the operator', 'Played from YouTube’s privacy-enhanced player; the videos belong to their creators.'],
  ['Metal prices and currency rates (Zakat)', 'gold-api.com, open.er-api.com', 'Free public APIs; indicative prices only.'],
  ['AI answers', 'Free tiers of Google Gemini, Groq, Mistral, GitHub Models, SambaNova, NVIDIA, Hugging Face, OpenRouter and others the operator enables', 'Answers are generated from the Quran and hadith passages shown beside them. They can be wrong.'],
  ['Stories of the Quran, Great Muslims, quizzes, games, guides', 'Written for this app', 'Short summaries for learning; dates as commonly cited. Not a substitute for scholarly review.'],
]

export default function CreditsPage() {
  return (
    <article className="space-y-4 text-gray-800">
      <h1 className="text-2xl font-black text-[#0F766E]">Sources &amp; credits</h1>
      <p className="text-gray-600">Deen Companion is built on the generosity of open projects and volunteers. Thank you to all of them.</p>
      <ul className="space-y-3">
        {rows.map(([what, who, licence]) => (
          <li key={what} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="font-semibold">{what}</p>
            <p className="text-sm text-gray-700">{who}</p>
            <p className="text-xs text-gray-500 mt-1">{licence}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-500">
        Software: Next.js, React, Tailwind CSS, ts-fsrs (spaced repetition), web-llm (on-device AI) and other open-source libraries under their own licences.
      </p>
      <p className="text-sm text-gray-500">
        © 2026 Abdulai Bah. All rights reserved. The Deen Companion code, design and original written content may not be copied or reused without written permission. The third-party material listed above stays under its own terms.
      </p>
      <p className="text-sm text-gray-500">
        See also <Link href="/legal/privacy" className="underline">privacy</Link> and <Link href="/legal/terms" className="underline">terms</Link>.
      </p>
    </article>
  )
}
