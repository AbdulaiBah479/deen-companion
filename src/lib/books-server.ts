import 'server-only'
import { bookById } from './books'
import { gutenbergBody, paginate, toParagraphs, wikisourceParagraphs } from './books-text'

// Fetches a shelf book and cuts it into pages. Only books listed in books.ts can be asked for, so the address that is fetched is never
// chosen by a visitor.
export type BookLang = 'en' | 'ar'
export type BookPage = {
  id: string
  lang: BookLang
  page: number
  pages: number
  paragraphs: string[]
  source: { label: string; url: string; licence: string }
}

const UA = { 'User-Agent': 'DeenCompanion/1.0 (https://deen-companion-six.vercel.app)' }
const cache = new Map<string, { at: number; pages: string[][] }>()
const TTL = 6 * 3600_000

async function load(id: string, lang: BookLang): Promise<{ pages: string[][]; source: BookPage['source'] } | null> {
  const book = bookById(id)
  if (!book) return null
  const key = `${id}|${lang}`
  if (lang === 'en' && book.english) {
    const url = `https://www.gutenberg.org/cache/epub/${book.english.gutenberg}/pg${book.english.gutenberg}.txt`
    const source = { label: `Project Gutenberg #${book.english.gutenberg}`, url: `https://www.gutenberg.org/ebooks/${book.english.gutenberg}`, licence: 'Public domain' }
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return { pages: hit.pages, source }
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000) })
      if (!res.ok) return null
      const pages = paginate(toParagraphs(gutenbergBody(await res.text())))
      if (!pages.length) return null
      cache.set(key, { at: Date.now(), pages })
      return { pages, source }
    } catch {
      return null
    }
  }
  if (lang === 'ar' && book.arabic) {
    const title = book.arabic.wikisource
    const source = { label: `Arabic Wikisource: ${title}`, url: `https://ar.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, licence: 'CC BY-SA 4.0 (the text of the classic is old; the typing is by Wikisource volunteers)' }
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return { pages: hit.pages, source }
    try {
      const api = `https://ar.wikisource.org/w/api.php?action=parse&prop=text&format=json&formatversion=2&redirects=1&disabletoc=1&page=${encodeURIComponent(title)}`
      const res = await fetch(api, { headers: UA, signal: AbortSignal.timeout(25_000) })
      if (!res.ok) return null
      const j = (await res.json()) as { parse?: { text?: string } }
      const pages = paginate(wikisourceParagraphs(j.parse?.text ?? ''), 3000)
      if (!pages.length) return null
      cache.set(key, { at: Date.now(), pages })
      return { pages, source }
    } catch {
      return null
    }
  }
  return null
}

export async function bookPage(id: string, lang: BookLang, page: number): Promise<BookPage | null> {
  const book = await load(id, lang)
  if (!book) return null
  const p = Math.min(Math.max(1, Math.floor(page) || 1), book.pages.length)
  return { id, lang, page: p, pages: book.pages.length, paragraphs: book.pages[p - 1], source: book.source }
}

// Every paragraph of a book with its place (page and paragraph number), for searching inside the book.
export async function bookParagraphs(id: string, lang: BookLang): Promise<{ page: number; para: number; text: string }[] | null> {
  const book = await load(id, lang)
  if (!book) return null
  return book.pages.flatMap((paras, p) => paras.map((text, i) => ({ page: p + 1, para: i, text })))
}
