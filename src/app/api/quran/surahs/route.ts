import { NextResponse } from 'next/server'
import { dataAvailable, getSurahs, juzIndex, metaAvailable, surahPages } from '@/lib/data'
import { getAllSurahs } from '@/lib/quran'

export async function GET() {
  // Bundled data first (instant, offline); fall back to the live API if `npm run data` hasn't been run.
  if (!dataAvailable()) return NextResponse.json({ surahs: await getAllSurahs() })
  const surahs = getSurahs()
  if (!metaAvailable()) return NextResponse.json({ surahs })
  const pages = surahPages()
  return NextResponse.json({ surahs: surahs.map((s, i) => ({ ...s, page: pages[i] })), juz: juzIndex() })
}
