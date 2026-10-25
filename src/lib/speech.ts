// Helpers for reading text aloud with the browser's built-in voices (free, works offline once a voice is installed).
// Browsers cut off long utterances (Chrome stops after about 15 seconds), so text is read a sentence or two at a time.

// What the voice should say: no markdown marks, no citation tags like [Q1], no stray symbols.
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\[(?:Q|H|T)\d+\]/g, '')
    .replace(/[*_#>`~|]/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Arabic script (not Persian/Urdu-only letters) makes up the larger part of the letters?
export function isMostlyArabic(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? []
  if (!letters.length) return false
  const arabic = text.match(/[؀-ۿݐ-ݿ]/g)?.length ?? 0
  return arabic / letters.length > 0.5
}

// Voice language for a piece of text: Arabic text is read with an Arabic voice whatever the app language is.
export function voiceLangFor(text: string, appLang: string): string {
  if (isMostlyArabic(text)) return 'ar-SA'
  const map: Record<string, string> = { en: 'en-US', ur: 'ur-PK', fr: 'fr-FR', id: 'id-ID', tr: 'tr-TR', bn: 'bn-BD', es: 'es-ES', ha: 'ha-NG', de: 'de-DE', ru: 'ru-RU', ms: 'ms-MY', so: 'so-SO', sw: 'sw-KE' }
  return map[appLang] ?? 'en-US'
}

// Splits text into chunks of at most `max` characters, preferably at the end of a sentence, otherwise at a comma or a space.
export function splitForSpeech(text: string, max = 220): string[] {
  const clean = cleanForSpeech(text)
  if (!clean) return []
  const sentences = clean.match(/[^.!?؟۔…]+[.!?؟۔…]*\s*/g) ?? [clean]
  const out: string[] = []
  let cur = ''
  const push = () => {
    if (cur.trim()) out.push(cur.trim())
    cur = ''
  }
  for (const s of sentences) {
    if (s.length > max) {
      push()
      // a very long sentence: cut at commas / spaces
      let rest = s
      while (rest.length > max) {
        let cut = Math.max(rest.lastIndexOf('،', max - 1), rest.lastIndexOf(',', max - 1), rest.lastIndexOf(';', max - 1), rest.lastIndexOf(' ', max - 1))
        if (cut < max * 0.4) cut = rest.lastIndexOf(' ', max - 1) > 0 ? rest.lastIndexOf(' ', max - 1) : max - 1
        out.push(rest.slice(0, cut + 1).trim())
        rest = rest.slice(cut + 1)
      }
      cur = rest
      continue
    }
    if ((cur + s).length > max) push()
    cur += s
  }
  push()
  return out.filter(Boolean)
}
