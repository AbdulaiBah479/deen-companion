import { NextResponse } from 'next/server'

// The 99 Names of Allah from api.aladhan.com (free, no key).
export async function GET() {
  try {
    const res = await fetch('https://api.aladhan.com/v1/asmaAlHusna', { next: { revalidate: 604800 } })
    const data = await res.json()
    const names = (data.data || []).map(
      (n: { name: string; transliteration: string; number: number; en: { meaning: string } }) => ({
        number: n.number,
        arabic: n.name,
        transliteration: n.transliteration,
        meaning: n.en.meaning,
      })
    )
    if (!names.length) throw new Error('empty')
    return NextResponse.json({ names })
  } catch {
    return NextResponse.json({ error: 'Could not load the names right now' }, { status: 502 })
  }
}
