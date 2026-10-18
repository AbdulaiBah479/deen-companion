'use client'

import Link from 'next/link'
import { useState } from 'react'
import { STORIES, STORY_GROUPS, groupOf } from '@/lib/stories'
import { useStored } from '@/lib/storage'

export default function StoriesPage() {
  const [progress] = useStored<Record<string, number>>('deen:stories', {})
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = STORIES.filter((s) => !needle || `${s.title} ${s.summary}`.toLowerCase().includes(needle))

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Stories from the Quran</h1>
      <p className="text-gray-500 text-sm mb-3">
        {STORIES.length} stories told in the actual verses, chapter by chapter, with translation and recitation. Want the wider history? See the{' '}
        <Link href="/library" className="text-[#0F766E] underline">
          Library
        </Link>
        {' '}or meet{' '}
        <Link href="/heritage" className="text-[#0F766E] underline">
          great Muslims in history
        </Link>
        .
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search stories — Musa, patience, Badr…"
        aria-label="Search stories"
        className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white mb-5"
      />
      {STORY_GROUPS.map((g) => {
        const list = shown.filter((s) => groupOf(s) === g.id)
        if (!list.length) return null
        return (
          <section key={g.id} className="mb-6" data-story-group={g.id}>
            <h2 className="font-bold text-lg">{g.title}</h2>
            <p className="text-xs text-gray-500 mb-2">{g.blurb}</p>
            <ul className="space-y-3">
              {list.map((s) => {
                const done = progress[s.id] || 0
                return (
                  <li key={s.id}>
                    <Link href={`/stories/${s.id}`} className="flex gap-4 items-center bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#0F766E]">
                      <span className="text-4xl">{s.icon}</span>
                      <span className="flex-1">
                        <span className="block font-bold">{s.title}</span>
                        <span className="block text-sm text-gray-500">{s.summary}</span>
                        <span className="block text-xs text-[#0F766E] font-semibold mt-1">
                          {Math.min(done, s.chapters.length)}/{s.chapters.length} chapters read
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {!shown.length && <p className="text-gray-500 text-center py-10">No story matches “{q}”.</p>}
    </div>
  )
}
