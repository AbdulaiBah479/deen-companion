// Checks that every book on the shelf can still be fetched: its Project Gutenberg file and its Arabic Wikisource page.
// Run weekly by .github/workflows/content-check.yml (and by hand: npm run check:books). Exits 1 if anything is missing, so GitHub emails you.
import { BOOKS } from '../src/lib/books.ts'

const UA = { 'User-Agent': 'DeenCompanion-content-check/1.0 (https://deen-companion-six.vercel.app)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let bad = 0
for (const b of BOOKS) {
  if (b.english) {
    const url = `https://www.gutenberg.org/cache/epub/${b.english.gutenberg}/pg${b.english.gutenberg}.txt`
    const r = await fetch(url, { method: 'HEAD', headers: UA }).catch(() => null)
    const ok = !!r && r.ok
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${b.id} English (Gutenberg #${b.english.gutenberg})`)
    if (!ok) bad++
    await sleep(1500)
  }
  if (b.arabic) {
    const api = `https://ar.wikisource.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&titles=${encodeURIComponent(b.arabic.wikisource)}`
    const r = await fetch(api, { headers: UA }).catch(() => null)
    const j = r && r.ok ? await r.json().catch(() => null) : null
    const ok = !!j && j.query?.pages?.[0] && !j.query.pages[0].missing
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${b.id} Arabic (Wikisource: ${b.arabic.wikisource})`)
    if (!ok) bad++
    await sleep(2500)
  }
}
console.log(bad ? `\n${bad} source(s) missing — update src/lib/books.ts` : '\nAll book sources are reachable.')
process.exit(bad ? 1 : 0)
