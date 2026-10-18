'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { findEntry, imagesAllowed, isSafeTitle } from '@/lib/library'
import { useStored } from '@/lib/storage'
import { getStory } from '@/lib/stories'

type Article = { title: string; description: string; url: string; intro: string; sections: { heading: string; text: string }[]; thumb?: string }

export default function ArticleReader() {
  const title = (useSearchParams().get('title') || '').trim()
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useStored<string[]>('deen:library-saved', [])
  const [, setRecent] = useStored<string[]>('deen:library-recent', [])
  const entry = findEntry(title)

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let off = false
    const run = async () => {
      if (!isSafeTitle(title)) {
        setError('That article could not be found.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const r = await fetch('/api/library?title=' + encodeURIComponent(title))
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not load this article.')
        if (off) return
        setArticle(d.article)
        setRecent((l) => [title, ...l.filter((t) => t !== title)].slice(0, 20))
      } catch (e) {
        if (!off) setError(e instanceof Error ? e.message : 'Could not load this article.')
      } finally {
        if (!off) setLoading(false)
      }
    }
    void run()
    return () => {
      off = true
    }
  }, [title, attempt, setRecent])

  const story = entry?.story ? getStory(entry.story) : null
  const isSaved = saved.includes(title)
  const name = entry?.name ?? article?.title ?? title
  const showImage = !!article?.thumb && imagesAllowed(title)

  return (
    <div>
      <Link href="/library" className="text-sm text-[#0F766E] font-semibold">
        ← Library
      </Link>

      <div className="flex items-start gap-3 mt-2 mb-1">
        <h1 className="flex-1 text-2xl font-black text-[#0F766E]">
          {name}
          {entry?.honorific && <span className="text-gray-500 font-normal text-lg"> {entry.honorific}</span>}
        </h1>
        {article && (
          <button
            onClick={() => setSaved((l) => (l.includes(title) ? l.filter((t) => t !== title) : [title, ...l]))}
            aria-pressed={isSaved}
            aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
            className="w-10 h-10 rounded-full border border-gray-300 bg-white text-xl"
          >
            {isSaved ? '★' : '☆'}
          </button>
        )}
      </div>
      {article?.description && <p className="text-gray-500 text-sm mb-4">{article.description}</p>}

      {loading && (
        <div className="space-y-3 animate-pulse" aria-label="Loading article">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-11/12" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-center" role="alert">
          <p className="text-gray-700 mb-3">{error}</p>
          <button onClick={() => setAttempt((n) => n + 1)} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">
            Try again
          </button>
        </div>
      )}

      {article && (
        <article>
          {showImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.thumb} alt={article.title} className="w-full max-h-72 object-cover rounded-2xl mb-4" loading="lazy" />
          )}
          <div className="leading-relaxed text-gray-800 mb-4 space-y-3" data-testid="article-intro">
            {article.intro.split("\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {story && (
              <Link href={`/stories/${story.id}`} className="px-3 py-2 rounded-lg bg-[#E6F4F1] text-[#0F766E] text-sm font-semibold">
                📖 Read it in the Quran
              </Link>
            )}
            <Link
              href={`/companion?q=${encodeURIComponent(`Tell me about ${name} in Islam, with sources from the Quran and authentic hadith`)}`}
              className="px-3 py-2 rounded-lg bg-[#E6F4F1] text-[#0F766E] text-sm font-semibold"
            >
              🤖 Ask the AI companion
            </Link>
          </div>

          <div className="space-y-2">
            {article.sections.map((s, i) => (
              <details key={s.heading + i} open={i === 0} className="bg-white border border-gray-200 rounded-xl p-4" data-article-section>
                <summary className="font-bold cursor-pointer">{s.heading}</summary>
                <div className="leading-relaxed text-gray-700 mt-2 space-y-2">
                  {s.text.split("\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <footer className="mt-6 text-xs text-gray-500 space-y-1" data-testid="article-attribution">
            <p>
              Source:{' '}
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="underline">
                “{article.title}” on Wikipedia
              </a>
              , text available under{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline">
                CC BY-SA 4.0
              </a>
              . Shown as published today and shortened.
            </p>
            <p>
              This is a general encyclopedia written by volunteers, not a fatwa or a tafsir. For religious rulings and for the detailed history, check the
              Quran, the authentic hadith and qualified scholars.
            </p>
          </footer>
        </article>
      )}
    </div>
  )
}
