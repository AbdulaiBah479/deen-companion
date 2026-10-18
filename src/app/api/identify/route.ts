// Quran Identifier.
//   POST JSON      { text }          -> match Arabic text (e.g. from the browser's speech recognition) to verses
//   POST multipart audio=<file>      -> transcribe with Whisper (Groq free tier, or any OpenAI-compatible STT), then match
// Returns { transcript, matches: [{ key, surahName, from, to, score, verses[] }] }.

import { NextRequest, NextResponse } from 'next/server'
import { dataAvailable, matchRecitation } from '@/lib/data'
import { clientIp, rateLimit } from '@/lib/ratelimit'

const MAX_AUDIO_BYTES = 4 * 1024 * 1024

async function transcribe(file: File): Promise<string> {
  const base = process.env.STT_BASE_URL || 'https://api.groq.com/openai/v1'
  const key = process.env.STT_KEY || process.env.GROQ_API_KEY
  const model = process.env.STT_MODEL || 'whisper-large-v3-turbo'
  if (!key && !process.env.STT_BASE_URL) throw new NotConfigured()

  const fd = new FormData()
  fd.append('file', file, file.name || 'recitation.webm')
  fd.append('model', model)
  fd.append('language', 'ar')
  fd.append('response_format', 'json')
  fd.append('temperature', '0')
  // A short Arabic prompt nudges Whisper toward Quranic vocabulary and spelling.
  fd.append('prompt', 'بسم الله الرحمن الرحيم قرآن كريم')
  const res = await fetch(`${base.replace(/\/$/, '')}/audio/transcriptions`, {
    method: 'POST',
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    body: fd,
    signal: AbortSignal.timeout(45000),
  })
  if (!res.ok) throw new Error(`transcription failed (${res.status})`)
  return ((await res.json()).text as string) || ''
}

class NotConfigured extends Error {}

export async function POST(request: NextRequest) {
  const limit = await rateLimit(`identify:${clientIp(request.headers)}`, 12, 60_000)
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  }
  if (!dataAvailable()) {
    return NextResponse.json({ error: 'Quran data is not installed. Run: npm run data' }, { status: 503 })
  }

  let transcript = ''
  const type = request.headers.get('content-type') || ''
  try {
    if (type.includes('application/json')) {
      const body = await request.json().catch(() => null)
      if (!body || typeof body.text !== 'string') return NextResponse.json({ error: 'Provide { text }' }, { status: 400 })
      transcript = body.text.slice(0, 2000)
    } else if (type.includes('multipart/form-data')) {
      const form = await request.formData()
      const audio = form.get('audio')
      if (!(audio instanceof File)) return NextResponse.json({ error: 'Provide an audio file' }, { status: 400 })
      if (audio.size === 0) return NextResponse.json({ error: 'The recording is empty' }, { status: 400 })
      if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: 'Recording too long. Keep it under ~30 seconds.' }, { status: 413 })
      transcript = await transcribe(audio)
    } else {
      return NextResponse.json({ error: 'Send JSON { text } or multipart audio' }, { status: 415 })
    }
  } catch (error) {
    if (error instanceof NotConfigured) {
      return NextResponse.json(
        { error: 'Audio transcription is not configured. Add GROQ_API_KEY (free) to .env.local, or use the live microphone mode in Chrome/Edge.', notConfigured: true },
        { status: 501 }
      )
    }
    console.error('identify error:', error)
    return NextResponse.json({ error: 'Could not process the recording. Please try again.' }, { status: 502 })
  }

  const matches = matchRecitation(transcript, 5)
  return NextResponse.json({ transcript, matches })
}
