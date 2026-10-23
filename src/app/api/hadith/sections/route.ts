import { NextRequest, NextResponse } from 'next/server'
import { getHadithSections } from '@/lib/data'
import { isBookId } from '@/lib/hadith'

// GET /api/hadith/sections?book=bukhari -> the chapters ("Faith", "Prayer", "Fasting"…) of a collection, with hadith counts
export async function GET(request: NextRequest) {
  const book = request.nextUrl.searchParams.get('book') ?? ''
  if (!isBookId(book)) return NextResponse.json({ error: 'Unknown collection' }, { status: 400 })
  const sections = getHadithSections(book)
  if (!sections) return NextResponse.json({ error: 'Chapters are not available right now' }, { status: 503 })
  return NextResponse.json({ book, sections })
}
