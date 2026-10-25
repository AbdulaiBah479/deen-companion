import { getLocalHadith, getVerses, searchHadithText, searchQuranText, dataAvailable } from './data'
import { parseRef, type Topic } from './khutbah'

// Evidence for a sermon, always copied from the app's own Quran and Sahih al-Bukhari/Muslim data, never written by a model.
export type Evidence = {
  id: string // Q1.. for verses, H1.. for hadith
  kind: 'quran' | 'hadith'
  ref: string // "3:102" or "Sahih al-Bukhari 1"
  arabic?: string
  text: string
  href: string
}

export function resolveVerse(ref: string, lang: string): Omit<Evidence, 'id'> | null {
  const r = parseRef(ref)
  if (!r || !dataAvailable()) return null
  const vs = getVerses(r.surah, lang, r.from, r.to)
  if (!vs.length) return null
  return {
    kind: 'quran',
    ref,
    arabic: vs.map((v) => v.text_uthmani).join(' '),
    text: vs.map((v) => v.translations[0]?.text ?? '').join(' '),
    href: `/tafsir/${r.surah}/${r.from}`,
  }
}

// A hadith found by searching the bundled Bukhari and Muslim for the wording, accepted only if it really contains the key word.
export function resolveHadith(q: string, must: string): Omit<Evidence, 'id'> | null {
  if (!dataAvailable()) return null
  const hit = searchHadithText(q, 8).find((h) => h.text.toLowerCase().includes(must.toLowerCase()) && h.text.length < 1200)
  if (!hit) return null
  const text = getLocalHadith(hit.bookId, hit.number) ?? hit.text
  return { kind: 'hadith', ref: `${hit.book} ${hit.number}`, text, href: `/hadith?book=${hit.bookId}&number=${hit.number}` }
}

export function topicEvidence(topic: Topic, lang: string): Evidence[] {
  const out: Omit<Evidence, 'id'>[] = []
  for (const ref of topic.quran) {
    const v = resolveVerse(ref, lang)
    if (v) out.push(v)
  }
  for (const h of topic.hadith) {
    const v = resolveHadith(h.q, h.must)
    if (v && !out.some((o) => o.ref === v.ref)) out.push(v)
  }
  return number(out)
}

// For a topic someone typed: the verses and hadith closest to it in the app's data.
export function customEvidence(topic: string, lang: string): Evidence[] {
  const out: Omit<Evidence, 'id'>[] = []
  if (!dataAvailable()) return []
  for (const r of searchQuranText(topic, 4, lang)) {
    const v = resolveVerse(r.key, lang)
    if (v) out.push(v)
  }
  for (const h of searchHadithText(topic, 3)) {
    if (h.text.length > 1200) continue
    out.push({ kind: 'hadith', ref: `${h.book} ${h.number}`, text: h.text, href: `/hadith?book=${h.bookId}&number=${h.number}` })
  }
  return number(out)
}

function number(list: Omit<Evidence, 'id'>[]): Evidence[] {
  let q = 0
  let h = 0
  return list.map((e) => ({ ...e, id: e.kind === 'quran' ? `Q${++q}` : `H${++h}` }))
}
