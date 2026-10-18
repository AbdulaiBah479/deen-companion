import { NextResponse } from 'next/server'

// Word-by-word meaning and transliteration for one surah, from api.quran.com.
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params
  const num = Number(n)
  if (!Number.isInteger(num) || num < 1 || num > 114) {
    return NextResponse.json({ error: 'Surah must be 1-114' }, { status: 400 })
  }
  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${num}?words=true&word_fields=text_uthmani&per_page=300&language=en`,
      { next: { revalidate: 604800 } }
    )
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    const words: Record<number, { ar: string; tr: string; en: string }[]> = {}
    for (const v of data.verses as {
      verse_number: number
      words: { char_type_name: string; text_uthmani?: string; text?: string; transliteration?: { text: string }; translation?: { text: string } }[]
    }[]) {
      words[v.verse_number] = v.words
        .filter((w) => w.char_type_name === 'word')
        .map((w) => ({ ar: w.text_uthmani || w.text || '', tr: w.transliteration?.text || '', en: w.translation?.text || '' }))
    }
    return NextResponse.json({ words })
  } catch {
    return NextResponse.json({ error: 'Word-by-word data unavailable right now' }, { status: 502 })
  }
}
