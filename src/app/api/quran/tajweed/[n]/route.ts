import { NextResponse } from 'next/server'

// Tajweed-coloured Uthmani text (markup) for one surah, from api.quran.com. Loaded only when the user turns tajweed on.
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params
  const num = Number(n)
  if (!Number.isInteger(num) || num < 1 || num > 114) {
    return NextResponse.json({ error: 'Surah must be 1-114' }, { status: 400 })
  }
  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${num}?fields=text_uthmani_tajweed&per_page=300`,
      { next: { revalidate: 604800 } }
    )
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    const tajweed: Record<number, string> = {}
    for (const v of data.verses as { verse_number: number; text_uthmani_tajweed: string }[]) {
      tajweed[v.verse_number] = v.text_uthmani_tajweed
    }
    return NextResponse.json({ tajweed })
  } catch {
    return NextResponse.json({ error: 'Tajweed colours unavailable right now' }, { status: 502 })
  }
}
