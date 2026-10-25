// Turning the raw text of a free book (Project Gutenberg, Arabic Wikisource) into clean paragraphs and pages for reading and listening.
// Pure functions, tested in tests/books.test.mts.

// Project Gutenberg files wrap a book in a licence header and footer; only the book itself is kept.
export function gutenbergBody(raw: string): string {
  const start = raw.search(/\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i)
  const end = raw.search(/\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i)
  const from = start >= 0 ? raw.indexOf('\n', start) + 1 : 0
  return raw.slice(from, end > from ? end : undefined).replace(/\r/g, '')
}

// Paragraphs are separated by blank lines; the lines inside a paragraph were wrapped for a narrow screen, so they are joined.
export function toParagraphs(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((p) => p.length > 1 && !/^[*\-=_\s·•.]+$/.test(p))
}

// Pages of roughly `target` characters, never splitting a paragraph.
export function paginate(paras: string[], target = 4500): string[][] {
  const pages: string[][] = []
  let cur: string[] = []
  let len = 0
  for (const p of paras) {
    if (cur.length && len + p.length > target) {
      pages.push(cur)
      cur = []
      len = 0
    }
    cur.push(p)
    len += p.length
  }
  if (cur.length) pages.push(cur)
  return pages
}

const NAMED: Record<string, string> = { nbsp: ' ', amp: '&', quot: '"', lt: '<', gt: '>', apos: "'" }
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => NAMED[n.toLowerCase()] ?? m)
    .replace(/ /g, " ")
    .replace(/[​-‏﻿]/g, "") // invisible marks
}

// A Wikisource page as plain paragraphs: no styles, tables or edit links, and without the page's own title block and menus.
export function wikisourceParagraphs(html: string): string[] {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<table[\s\S]*?<\/table>/gi, '')
    .replace(/<sup[\s\S]*?<\/sup>/gi, '')
    .replace(/<span class="mw-editsection[\s\S]*?<\/span>\s*<\/span>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|pre|dd|dt)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
  return decodeEntities(text)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 1 && !/ويكي بيانات|تنزيل بصيغة|^المؤلف\s|^→|^←|^ملاحظات\s*:?$|^\[?تعديل\]?$/.test(p))
}

// Language for the voice: Arabic text is read with an Arabic voice.
export const isArabicBook = (lang: string) => lang === 'ar'
