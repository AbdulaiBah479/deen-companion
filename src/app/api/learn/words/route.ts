import { NextResponse } from 'next/server'
import { getWords, wordsAvailable } from '@/lib/data'

// The most frequent words of the Quran (counted from the word-by-word data), for the "Quran words" course.
export async function GET() {
  if (!wordsAvailable()) return NextResponse.json({ error: 'Data not installed. Run: npm run data' }, { status: 503 })
  return NextResponse.json(getWords())
}
