// Checks every pinned recitation against the Arabic text of the hadith it is taken from (needs the internet).
// For each, the Arabic words of the recitation (without vowel marks) must appear, in order, in the live Arabic hadith.
// Run: npm run check:recitations
import { readFileSync } from 'node:fs'

const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'
const src = readFileSync(new URL('../src/lib/recitations.ts', import.meta.url), 'utf8')

// Pull the entries out of the source with a light parser: id, ar, and pin.
const entries = []
const re = /r\('([a-z0-9-]+)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'/g
let m
while ((m = re.exec(src))) {
  const tail = src.slice(m.index, m.index + 6000)
  const end = tail.indexOf("\n  r('", 10)
  const block = end > 0 ? tail.slice(0, end) : tail
  const pin = block.match(/pin: \{ book: '(bukhari|muslim)', number: (\d+) \}/)
  entries.push({ id: m[1], ar: m[3], pin: pin ? { book: pin[1], number: Number(pin[2]) } : null })
}

const strip = (s) =>
  s
    .normalize('NFKD')
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-ي\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

let bad = 0
let checked = 0
for (const e of entries) {
  if (!e.pin) continue
  try {
    const res = await fetch(`${CDN}/ara-${e.pin.book}/${e.pin.number}.json`)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const d = await res.json()
    const hay = strip(d.hadiths?.[0]?.text ?? '')
    // The recitation may be only part of the hadith, so check its words one by one, in order.
    const words = strip(e.ar).split(' ').filter((w) => w.length > 1)
    let from = 0
    let missing = ''
    for (const w of words) {
      const i = hay.indexOf(w, from)
      if (i < 0) {
        // a word may carry a different attached particle (و / ف / ل): accept it if its bare form is found
        const bare = w.replace(/^[وفلب]/, '')
        const j = bare.length > 1 ? hay.indexOf(bare, from) : -1
        if (j < 0) {
          missing = w
          break
        }
        from = j + bare.length
      } else from = i + w.length
    }
    checked++
    if (missing) {
      bad++
      console.log(`CHECK ${e.id}: ${e.pin.book} ${e.pin.number} does not contain "${missing}"`)
    } else console.log(`ok    ${e.id}  (${e.pin.book} ${e.pin.number})`)
  } catch (err) {
    console.log(`SKIP  ${e.id}: ${err.message}`)
  }
}
console.log(`\n${checked} checked, ${bad} to look at`)
process.exit(bad ? 1 : 0)
