// Answer built purely from retrieved sources — no AI model involved, so it works with zero tokens and zero keys.
// Used when every AI provider is unavailable or none is configured. It is clearly labelled so nobody mistakes
// it for an AI-written explanation.

export type ExtractiveSource = { id: string; kind: 'quran' | 'hadith'; ref: string; text: string }

export function extractiveAnswer(sources: ExtractiveSource[], reason: 'unconfigured' | 'unavailable'): string {
  const intro =
    reason === 'unconfigured'
      ? 'No AI model is connected right now, so here is what the Quran and hadith say that matches your question:'
      : 'The AI service is busy right now, so here is what the Quran and hadith say that matches your question:'

  if (!sources.length) {
    return (
      'I couldn’t find a verse or hadith that closely matches that wording, and no AI model is available to explain it. ' +
      'Try rephrasing with simpler keywords (for example “patience”, “parents”, “fasting”), or use Search. ' +
      'For personal rulings, please ask a qualified scholar.'
    )
  }

  const quran = sources.filter((s) => s.kind === 'quran')
  const hadith = sources.filter((s) => s.kind === 'hadith')
  const lines: string[] = [intro, '']
  if (quran.length) {
    lines.push('From the Quran:')
    for (const s of quran) lines.push(`• [${s.id}] Quran ${s.ref} — ${s.text}`)
    lines.push('')
  }
  if (hadith.length) {
    lines.push('From the hadith:')
    for (const s of hadith) lines.push(`• [${s.id}] ${s.ref} — ${s.text.length > 320 ? s.text.slice(0, 320) + '…' : s.text}`)
    lines.push('')
  }
  lines.push('These are shown as found, without interpretation. For rulings or deeper understanding, consult a qualified scholar.')
  return lines.join('\n')
}
