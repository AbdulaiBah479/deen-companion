import { NextRequest, NextResponse } from 'next/server'
import { track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { NotConfigured, transcribeAudio, whisperLang } from '@/lib/stt'

// POST multipart { audio, lang? } -> { text } — turns a short spoken question into text ("ask by voice").
// The clip is sent to the speech-to-text service, used once, and not kept.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024

export async function POST(request: NextRequest) {
  const limit = await rateLimit(`transcribe:${clientIp(request.headers)}`, 12, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  if (!(request.headers.get('content-type') || '').includes('multipart/form-data')) return NextResponse.json({ error: 'Send the recording as multipart form data.' }, { status: 415 })
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES + 4096) return NextResponse.json({ error: 'Recording too long. Keep it under about 30 seconds.' }, { status: 413 })

  let audio: FormDataEntryValue | null
  let lang: FormDataEntryValue | null
  try {
    const form = await request.formData()
    audio = form.get('audio')
    lang = form.get('lang')
  } catch {
    return NextResponse.json({ error: 'Could not read the recording.' }, { status: 400 })
  }
  if (!(audio instanceof File)) return NextResponse.json({ error: 'Provide an audio file.' }, { status: 400 })
  if (audio.size === 0) return NextResponse.json({ error: 'The recording is empty.' }, { status: 400 })
  if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: 'Recording too long. Keep it under about 30 seconds.' }, { status: 413 })
  if (audio.type && !/^(audio|video)\//.test(audio.type)) return NextResponse.json({ error: 'That is not an audio file.' }, { status: 415 })

  try {
    const text = await transcribeAudio(audio, { language: whisperLang(lang) })
    track('voice.question')
    return NextResponse.json({ text: text.slice(0, 1000) })
  } catch (error) {
    if (error instanceof NotConfigured) return NextResponse.json({ error: 'Voice questions are not switched on here.', notConfigured: true }, { status: 501 })
    return NextResponse.json({ error: 'Could not understand the recording. Please try again.' }, { status: 502 })
  }
}
