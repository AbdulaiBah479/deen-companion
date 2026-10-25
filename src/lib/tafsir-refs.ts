// "Connected verses": the great commentaries (Ibn Kathir above all) explain a verse by pointing to other verses —
// "(3:1-2)", "(19:93-95)". This finds those pointers in the commentary text, so a reader can follow the scholar's own links.
// It must not mistake a hadith citation (volume:page, like "Muslim 1:554" or "An-Nasa'i (Al-Kubra 5:12)") for a verse,
// so every candidate is checked against the real length of the surah and against the words just before it.

export type Ref = { surah: number; from: number; to: number; count: number }

const NUMBER_PAIR = /(?<![\d:.])(\d{1,3}):(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?![\d:])/g
// Words that precede a book citation (volume:page), never a verse.
const CITATION_BEFORE = /(Kubra|Bukhari|Muslim|Ahmad|Tirmidhi|Dawud|Nasa'?i|Majah|Fath|Musnad|Sunan|Tabari|Tafsir|Mustadrak|Hakim|Bayhaqi|Tabarani|Hatim|Hibban|Daraqutni|Muwatta|Qurtubi|Bidayah|Zad|Mu'?jam|Sahih|Vol|Volume|page|pg|p\.)[\s.,)(]*$/i

export function extractRefs(text: string, counts: number[], self?: { surah: number; ayah: number }, max = 12): Ref[] {
  const found = new Map<string, Ref>()
  for (const m of text.matchAll(NUMBER_PAIR)) {
    const surah = Number(m[1])
    const from = Number(m[2])
    const to = m[3] ? Number(m[3]) : from
    if (surah < 1 || surah > 114 || from < 1 || to < from || to - from > 30) continue
    if (to > (counts[surah - 1] ?? 0)) continue // not a real verse: it is a volume:page or a mistake
    const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0)
    if (CITATION_BEFORE.test(before)) continue
    if (self && self.surah === surah && self.ayah >= from && self.ayah <= to) continue
    const key = `${surah}:${from}-${to}`
    const have = found.get(key)
    if (have) have.count++
    else found.set(key, { surah, from, to, count: 1 })
  }
  return [...found.values()].slice(0, max)
}

export const refLabel = (r: { surah: number; from: number; to: number }) => `${r.surah}:${r.from}${r.to > r.from ? '–' + r.to : ''}`
