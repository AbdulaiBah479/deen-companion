// Downloads open Islamic datasets into ./data so the app can serve them locally (fast, offline-capable,
// and searchable for the grounded AI). Run once:  npm run data
//
// Sources (free, no key):
//   Quran text + translations + chapter info: api.quran.com (Quran.Foundation)
//   Hadith (English): github.com/fawazahmed0/hadith-api via jsDelivr
// Re-running skips files that already exist. Use --force to re-download everything.

import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'

const OUT = path.resolve('data')
const FORCE = process.argv.includes('--force')
const QURAN = 'https://api.quran.com/api/v4'
const HADITH = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'

// code -> quran.com translation resource id
const TRANSLATIONS = {
  en: 20, // Saheeh International
  ur: 234, // Fatah Muhammad Jalandhari
  fr: 31, // Muhammad Hamidullah
  id: 33, // Indonesian Islamic Affairs Ministry
  tr: 77, // Diyanet
  bn: 161, // Taisirul Quran
  es: 83, // Isa Garcia
  ha: 32, // Abubakar Gumi
  de: 27, // Bubenheim & Nadeem
  ru: 45, // Elmir Kuliev
  ms: 39, // Basmeih
  so: 46, // Mahmud Abduh
  sw: 49, // Ali Muhsin Al-Barwani
}

const exists = (p) => access(p).then(() => true, () => false)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, tries = 6) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (i === tries) throw new Error(`${url}: ${err.message}`)
      await sleep(1500 * i)
    }
  }
}

async function save(rel, build) {
  const file = path.join(OUT, rel)
  if (!FORCE && (await exists(file))) {
    console.log('skip   ', rel)
    return
  }
  await mkdir(path.dirname(file), { recursive: true })
  const data = await build()
  await writeFile(file, JSON.stringify(data))
  console.log('wrote  ', rel)
}

const clean = (s) => s.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

// ---- Quran ----
await save('quran/surahs.json', async () => {
  const d = await getJson(`${QURAN}/chapters?language=en`)
  return d.chapters.map((c) => ({
    id: c.id,
    name_simple: c.name_simple,
    name_arabic: c.name_arabic,
    verses_count: c.verses_count,
    revelation_place: c.revelation_place,
    translated_name: { name: c.translated_name.name },
  }))
})

await save('quran/arabic.json', async () => {
  const [u, s] = await Promise.all([
    getJson(`${QURAN}/quran/verses/uthmani`),
    getJson(`${QURAN}/quran/verses/imlaei_simple`),
  ])
  if (u.verses.length !== 6236 || s.verses.length !== 6236) throw new Error('unexpected verse count')
  // [verse_key, uthmani, simple]
  return u.verses.map((v, i) => [v.verse_key, v.text_uthmani, s.verses[i].text_imlaei_simple])
})

for (const [code, id] of Object.entries(TRANSLATIONS)) {
  await save(`quran/tr-${code}.json`, async () => {
    const d = await getJson(`${QURAN}/quran/translations/${id}`)
    if (d.translations.length !== 6236) throw new Error(`${code}: expected 6236 verses, got ${d.translations.length}`)
    return d.translations.map((t) => clean(t.text))
  })
}

// ---- Hadith (English) ----
for (const [name, edition] of [['bukhari', 'eng-bukhari'], ['muslim', 'eng-muslim']]) {
  await save(`hadith/${name}.json`, async () => {
    const d = await getJson(`${HADITH}/${edition}.min.json`)
    const items = d.hadiths.filter((h) => h.text && h.text.trim().length > 0)
    // [number, text]
    return items.map((h) => [h.hadithnumber, h.text.trim()])
  })
}

// ---- Hadith chapters ("books"/categories) for every collection, so the app can be browsed without searching ----
// [ [chapterNumber, name, firstHadith, lastHadith, count], … ]
for (const name of ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik', 'nawawi', 'qudsi']) {
  await save(`hadith/${name}.sections.json`, async () => {
    const d = await getJson(`${HADITH}/eng-${name}.min.json`)
    const have = d.hadiths.filter((h) => h.text && h.text.trim().length > 0).map((h) => h.hadithnumber).filter((n) => Number.isFinite(n) && n >= 1)
    const sec = d.metadata?.sections ?? {}
    const det = d.metadata?.section_details ?? {}
    const rows = []
    for (const k of Object.keys(sec)) {
      const name_ = String(sec[k] || '').trim()
      const r = det[k]
      if (!name_ || !r) continue
      const first = Math.ceil(r.hadithnumber_first)
      const last = Math.floor(r.hadithnumber_last)
      const count = have.filter((n) => n >= first && n <= last).length
      if (first >= 1 && count > 0) rows.push([Number(k), name_, first, last, count])
    }
    if (!rows.length && have.length) rows.push([1, 'All hadith', Math.min(...have), Math.max(...have), have.length])
    return rows
  })
}


// ---- Navigation metadata: page (604-page Madani mushaf), juz and quarter-hizb for every verse ----
await save('quran/meta.json', async () => {
  const out = []
  for (let s = 1; s <= 114; s++) {
    const d = await getJson(`${QURAN}/verses/by_chapter/${s}?fields=page_number,juz_number,rub_el_hizb_number&per_page=300`)
    for (const v of d.verses) out.push([v.page_number, v.juz_number, v.rub_el_hizb_number])
    if (s % 20 === 0) console.log('  meta: surah', s)
  }
  if (out.length !== 6236) throw new Error(`meta: expected 6236 verses, got ${out.length}`)
  return out // index = global verse index; value = [page, juz, rub]
})

// ---- Learning: the most frequent words of the Quran, counted from the word-by-word data ----
await save('learn/words.json', async () => {
  const norm = (s) => s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
  const table = new Map() // normalised form -> { count, forms: Map(ar -> n), meanings: Map(en -> n), tr: Map, audio, example }
  let total = 0
  for (let s = 1; s <= 114; s++) {
    const d = await getJson(`${QURAN}/verses/by_chapter/${s}?words=true&word_fields=text_uthmani,audio_url&per_page=300&language=en`)
    for (const v of d.verses) {
      for (const w of v.words) {
        if (w.char_type_name !== 'word') continue
        total++
        const key = norm(w.text_uthmani || w.text)
        let e = table.get(key)
        if (!e) table.set(key, (e = { count: 0, forms: new Map(), meanings: new Map(), tr: new Map(), audio: w.audio_url, example: v.verse_key }))
        e.count++
        const bump = (m, k) => k && m.set(k, (m.get(k) || 0) + 1)
        bump(e.forms, w.text_uthmani || w.text)
        bump(e.meanings, w.translation?.text)
        bump(e.tr, w.transliteration?.text)
      }
    }
    if (s % 20 === 0) console.log('  words: surah', s)
  }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  const rows = [...table.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 400)
    .map(([, e]) => ({ ar: top(e.forms), tr: top(e.tr), en: top(e.meanings), n: e.count, audio: e.audio, ex: e.example }))
  return { total, distinct: table.size, rows }
})
console.log('done')
