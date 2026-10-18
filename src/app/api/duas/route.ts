import { NextRequest, NextResponse } from 'next/server'

// Duas & adhkar from github.com/fitrahive/dua-dhikr (free, open data), cached for a day.
const CATEGORIES = ['morning-dhikr', 'evening-dhikr', 'dhikr-after-salah', 'daily-dua', 'selected-dua']
const BASE = 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/main/data/dua-dhikr'

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') || CATEGORIES[0]
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 })
  }
  try {
    const res = await fetch(`${BASE}/${category}/en.json`, { next: { revalidate: 86400 } })
    if (!res.ok) throw new Error(String(res.status))
    return NextResponse.json({ items: await res.json() })
  } catch {
    return NextResponse.json({ error: 'Could not load duas right now' }, { status: 502 })
  }
}
