// "Ask the book": finds the paragraphs of a book that best match a question, in English or Arabic. Plain TF-IDF over words, with the
// spelling variants of Arabic folded together (diacritics, alef forms, ta marbuta, the article "al-"). The answer is then written
// only from those paragraphs. Pure functions, tested in tests/books.test.mts.

const STOP_EN = new Set(
  ('a an the and or but if then of to in on at by for with from as is are was were be been being it its this that these those i me my we our you your he him his she her they them their what which who whom how why when where do does did can could should would will may might must not no so than about into over also any tell say said explain please there here have has had one all some such only both each more most other does').split(' ')
)
const STOP_AR = new Set('من في على الى إلى عن ان أن إن ما هذا هذه ذلك تلك هو هي هم هن كان كانت يكون ثم او أو و قد لم لا لن كل بعض هل ماذا كيف لماذا اين أين متى الذي التي'.split(' ').map((w) => normalize(w)))

// Folds spelling variants so that the same word written two ways is the same word.
export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '') // Arabic vowel marks and the stretching mark
    .replace(/[̀-ͯ]/g, '') // accents on Latin letters
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
}

export function tokens(text: string): string[] {
  return (normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [])
    .map((w) => (/^[؀-ۿ]/.test(w) && w.length > 4 ? w.replace(/^ال/, '') : w))
    .map((w) => (/^[a-z]+$/.test(w) && w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w))
    .filter((w) => w.length >= 2 && !STOP_EN.has(w) && !STOP_AR.has(w))
}

// The best `limit` paragraphs for the question (best first). Paragraphs with no word in common are never returned.
export function rank(paragraphs: string[], question: string, limit = 5): { index: number; score: number }[] {
  const q = [...new Set(tokens(question))]
  if (!q.length) return []
  const docs = paragraphs.map((p) => {
    const tf = new Map<string, number>()
    for (const t of tokens(p)) tf.set(t, (tf.get(t) ?? 0) + 1)
    return tf
  })
  const n = docs.length
  const df = new Map<string, number>()
  for (const d of docs) for (const t of q) if (d.has(t)) df.set(t, (df.get(t) ?? 0) + 1)
  const out: { index: number; score: number }[] = []
  docs.forEach((d, index) => {
    let score = 0
    let matched = 0
    for (const t of q) {
      const f = d.get(t)
      if (!f) continue
      matched++
      score += Math.log(1 + n / (1 + (df.get(t) ?? 0))) * (f / (f + 1.2))
    }
    if (matched) out.push({ index, score: score * (0.6 + 0.4 * (matched / q.length)) })
  })
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

export const isArabicText = (s: string) => (s.match(/[؀-ۿ]/g)?.length ?? 0) > (s.match(/[A-Za-z]/g)?.length ?? 0)
