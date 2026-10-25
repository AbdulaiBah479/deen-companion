// Speech to text through any OpenAI-compatible "audio/transcriptions" service — by default Groq's free Whisper.
// Used by the Quran identifier (Arabic) and by "ask by voice" (any app language).

export class NotConfigured extends Error {}

// The app's language codes are the standard two-letter ones Whisper understands.
const WHISPER_LANGS = new Set(['en', 'ar', 'ur', 'fr', 'id', 'tr', 'bn', 'es', 'ha', 'de', 'ru', 'ms', 'so', 'sw'])
export const whisperLang = (code: unknown): string | undefined => (typeof code === 'string' && WHISPER_LANGS.has(code) ? code : undefined)

export async function transcribeAudio(file: File, opts: { language?: string; prompt?: string } = {}): Promise<string> {
  const base = process.env.STT_BASE_URL || 'https://api.groq.com/openai/v1'
  const key = process.env.STT_KEY || process.env.GROQ_API_KEY
  const model = process.env.STT_MODEL || 'whisper-large-v3-turbo'
  if (!key && !process.env.STT_BASE_URL) throw new NotConfigured()

  const fd = new FormData()
  fd.append('file', file, file.name || 'recording.webm')
  fd.append('model', model)
  if (opts.language) fd.append('language', opts.language)
  fd.append('response_format', 'json')
  fd.append('temperature', '0')
  if (opts.prompt) fd.append('prompt', opts.prompt)
  const res = await fetch(`${base.replace(/\/$/, '')}/audio/transcriptions`, {
    method: 'POST',
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    body: fd,
    signal: AbortSignal.timeout(45000),
  })
  if (!res.ok) throw new Error(`transcription failed (${res.status})`)
  return (((await res.json()) as { text?: string }).text ?? '').trim()
}
