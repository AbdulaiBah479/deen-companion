'use client'

import Link from 'next/link'
import { BOOKS, READING_LIST, searchLinks } from '@/lib/books'

export default function BooksPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">Islamic books</h1>
        <p className="text-sm text-gray-600 mt-1">
          Great books of the scholars (not hadith collections) that you can read here in English and in the Arabic original, and listen to. We only put a book inside the app when its text is free to share. Other classics are listed below with a note on why they matter and where to look.
        </p>
      </header>

      <section aria-label="Read in the app">
        <h2 className="font-bold text-lg mb-2">Read and listen here</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="book-shelf">
          {BOOKS.map((b) => (
            <li key={b.id}>
              <Link href={`/books/${b.id}`} className="block h-full rounded-2xl border border-gray-200 bg-white p-4 hover:border-[#0F766E]">
                <span className="text-xs font-bold text-[#0F766E]">{b.field}</span>
                <span className="block font-bold mt-0.5">{b.title}</span>
                {b.titleAr && <span dir="rtl" lang="ar" className="block font-arabic text-lg">{b.titleAr}</span>}
                <span className="block text-sm text-gray-600 mt-1">{b.author} · {b.died}</span>
                <span className="block text-sm text-gray-700 mt-2">{b.blurb}</span>
                <span className="flex gap-2 mt-3 text-xs">
                  {b.english && <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] font-semibold">English</span>}
                  {b.arabic && <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] font-semibold">العربية</span>}
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">🔊 Listen</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="More great books">
        <h2 className="font-bold text-lg mb-1">More great books</h2>
        <p className="text-xs text-gray-500 mb-2">These are not copied into the app. Use the search links to look for a copy; check that the edition is by a reliable publisher or editor.</p>
        <ul className="space-y-2" data-testid="book-list">
          {READING_LIST.map((b) => (
            <li key={b.title} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="font-semibold">
                {b.title} <span dir="rtl" lang="ar" className="font-arabic text-gray-600">· {b.titleAr}</span>
              </p>
              <p className="text-xs text-gray-500">{b.author} · {b.died} · {b.field}</p>
              <p className="text-sm text-gray-700 mt-1">{b.why}</p>
              <p className="text-xs mt-2 flex flex-wrap gap-3">
                {searchLinks(b.query).map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="underline text-[#0F766E]">
                    {l.label} ↗
                  </a>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-gray-500">
        Looking for hadith? <Link href="/hadith" className="underline text-[#0F766E]">Open the Hadith section</Link>. Dates are given in the Hijri and Gregorian years as scholars usually give them; some are approximate.
      </p>
    </div>
  )
}
