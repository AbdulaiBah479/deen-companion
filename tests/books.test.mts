// Tests the book shelf: cleaning free book text into pages, and the catalogue itself.  Run: npm run test:books
import { BOOKS, READING_LIST, bookById, searchLinks } from '../src/lib/books.ts'
import { decodeEntities, gutenbergBody, paginate, toParagraphs, wikisourceParagraphs } from '../src/lib/books-text.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ───────── Gutenberg text ─────────
const raw = 'Licence header\nline two\n*** START OF THE PROJECT GUTENBERG EBOOK THE BOOK ***\n\nChapter I\n\nThe first line of a wrapped\nparagraph goes on here.\n\n* * * * *\n\nSecond _paragraph_ with italics.\n\n*** END OF THE PROJECT GUTENBERG EBOOK THE BOOK ***\nFooter licence text'
const body = gutenbergBody(raw)
ok('gutenberg: the licence header and footer are removed', !/Licence header|Footer licence/.test(body) && /Chapter I/.test(body))
ok('gutenberg: a file with no markers is kept whole', gutenbergBody('Just text').trim() === 'Just text')
const paras = toParagraphs(body)
ok('paragraphs: wrapped lines are joined into one paragraph', paras.includes('The first line of a wrapped paragraph goes on here.'))
ok('paragraphs: ornament lines are dropped and _italics_ marks removed', !paras.some((p) => /^\*/.test(p)) && paras.includes('Second paragraph with italics.'))

// ───────── pages ─────────
const many = Array.from({ length: 40 }, (_, i) => `Paragraph number ${i} `.padEnd(300, 'x'))
const pages = paginate(many, 4500)
ok('pages: about 4500 characters each, nothing lost or reordered', pages.length >= 2 && pages.flat().join('|') === many.join('|') && pages.every((p) => p.join('').length <= 4500 + 300))
ok('pages: one huge paragraph still gets its own page', paginate(['a'.repeat(9000), 'b']).length === 2)
ok('pages: no text, no pages', paginate([]).length === 0)

// ───────── Wikisource ─────────
ok('entities: numeric, hex and named entities are decoded, invisible marks removed', decodeEntities('a&#160;b &amp; c&#x41; &quot;d&quot;&#8203;') === 'a b & cA "d"')
const html = '<div><style>.x{color:red}</style><table><tr><td>menu</td></tr></table><p>المؤلف الغزالي</p><p>ويكي بيانات. تنزيل بصيغة</p><p>الحمد لله رب العالمين<sup>[1]</sup></p><p>أما بعد&nbsp;فهذا كتاب</p></div>'
const ws = wikisourceParagraphs(html)
ok('wikisource: styles, tables, notes and the page’s own menu lines are dropped', ws.length === 2 && ws[0] === 'الحمد لله رب العالمين' && ws[1] === 'أما بعد فهذا كتاب', JSON.stringify(ws))

// ───────── the shelf ─────────
ok('shelf: at least 8 books can be read in the app', BOOKS.length >= 8 && new Set(BOOKS.map((b) => b.id)).size === BOOKS.length)
ok('shelf: every book has an English or an Arabic text, an author and a note about it', BOOKS.every((b) => (b.english || b.arabic) && b.author && b.blurb.length > 40))
ok('shelf: at least two books have BOTH the English and the Arabic', BOOKS.filter((b) => b.english && b.arabic).length >= 2)
ok('shelf: every English text is a Project Gutenberg number and names its translator', BOOKS.filter((b) => b.english).every((b) => Number.isInteger(b.english!.gutenberg) && b.english!.gutenberg > 0 && !!b.english!.translator))
ok('shelf: no hadith collection is on the shelf', ![...BOOKS.map((b) => b.title), ...READING_LIST.map((b) => b.title)].some((t) => /bukhari|muslim|riyad|forty hadith|muwatta|sunan|musnad/i.test(t)))
ok('shelf: lookups by id work', bookById('hayy')?.english?.gutenberg === 16831 && bookById('nope') === undefined)
ok('reading list: 15+ classics, each with a reason and a search that finds it', READING_LIST.length >= 15 && READING_LIST.every((b) => b.why.length > 20 && b.query.length > 3))
ok('reading list: links are search pages on two well-known libraries, never a made-up book address', searchLinks('مقدمة ابن خلدون').every((l) => /^https:\/\/(ar\.wikisource\.org\/w\/index\.php\?search=|archive\.org\/search\?query=)/.test(l.href)))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
