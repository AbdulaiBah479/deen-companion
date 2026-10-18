// Quran data from api.quran.com (free, no key). Next.js caches fetches via `revalidate`.

const QURAN_API = 'https://api.quran.com/api/v4'

export async function getAllSurahs() {
  try {
    const response = await fetch(`${QURAN_API}/chapters`, { next: { revalidate: 86400 } })
    const data = await response.json()
    return data.chapters
  } catch (error) {
    console.error('Failed to fetch surahs:', error)
    return []
  }
}

// translations=20 -> Saheeh International (English)
export async function getSurahVerses(surahNumber: number) {
  try {
    const response = await fetch(
      `${QURAN_API}/verses/by_chapter/${surahNumber}?language=en&translations=20&fields=text_uthmani,text_uthmani_tajweed&per_page=300`,
      { next: { revalidate: 86400 } }
    )
    const data = await response.json()
    return data.verses
  } catch (error) {
    console.error(`Failed to fetch surah ${surahNumber}:`, error)
    return []
  }
}

export async function searchQuran(query: string) {
  try {
    const response = await fetch(
      `${QURAN_API}/search?q=${encodeURIComponent(query)}&language=en&size=20`,
      { next: { revalidate: 3600 } }
    )
    const data = await response.json()
    return data.search?.results || []
  } catch (error) {
    console.error('Quran search failed:', error)
    return []
  }
}

export function getVerseAudioUrl(
  surahNum: number,
  verseNum: number,
  reciterFolder: string = 'Alafasy_128kbps'
): string {
  const surah = String(surahNum).padStart(3, '0')
  const verse = String(verseNum).padStart(3, '0')
  // `__DEEN_AUDIO_BASE` is only ever set by automated tests, to serve a short generated clip instead of the real recitation.
  const base = (globalThis as { __DEEN_AUDIO_BASE?: string }).__DEEN_AUDIO_BASE || 'https://everyayah.com/data'
  return `${base}/${reciterFolder}/${surah}${verse}.mp3`
}

// Reciters available on everyayah.com. Each folder was checked to serve audio (verse 1:1) when added.
export const RECITERS = [
  { id: 'alafasy', name: 'Mishary Alafasy', folder: 'Alafasy_128kbps' },
  { id: 'sudais', name: 'Abdurrahman As-Sudais', folder: 'Abdurrahmaan_As-Sudais_192kbps' },
  { id: 'shuraym', name: 'Saud Ash-Shuraym', folder: 'Saood_ash-Shuraym_128kbps' },
  { id: 'muaiqly', name: 'Maher Al-Muaiqly', folder: 'MaherAlMuaiqly128kbps' },
  { id: 'ghamadi', name: 'Saad Al-Ghamdi', folder: 'Ghamadi_40kbps' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', folder: 'Husary_128kbps' },
  { id: 'husary-muallim', name: 'Al-Husary (teaching, with repetition)', folder: 'Husary_Muallim_128kbps' },
  { id: 'minshawi', name: 'Al-Minshawi (Murattal)', folder: 'Minshawy_Murattal_128kbps' },
  { id: 'minshawi-mujawwad', name: 'Al-Minshawi (Mujawwad)', folder: 'Minshawy_Mujawwad_192kbps' },
  { id: 'abdulbasit', name: 'Abdul Basit (Murattal)', folder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'abdulbasit-mujawwad', name: 'Abdul Basit (Mujawwad)', folder: 'Abdul_Basit_Mujawwad_128kbps' },
  { id: 'shatri', name: 'Abu Bakr Ash-Shatri', folder: 'Abu_Bakr_Ash-Shaatree_128kbps' },
  { id: 'hudhaify', name: 'Ali Al-Hudhaify', folder: 'Hudhaify_128kbps' },
  { id: 'basfar', name: 'Abdullah Basfar', folder: 'Abdullah_Basfar_192kbps' },
  { id: 'rifai', name: 'Hani Ar-Rifai', folder: 'Hani_Rifai_192kbps' },
  { id: 'ayyub', name: 'Muhammad Ayyub', folder: 'Muhammad_Ayyoub_128kbps' },
  { id: 'jibreel', name: 'Muhammad Jibreel', folder: 'Muhammad_Jibreel_128kbps' },
  { id: 'qatami', name: 'Nasser Al-Qatami', folder: 'Nasser_Alqatami_128kbps' },
  { id: 'dussary', name: 'Yasser Ad-Dussary', folder: 'Yasser_Ad-Dussary_128kbps' },
  { id: 'ajamy', name: 'Ahmed Al-Ajmi', folder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net' },
  { id: 'bukhatir', name: 'Salah Bukhatir', folder: 'Salaah_AbdulRahman_Bukhatir_128kbps' },
  { id: 'qahtani', name: 'Khalid Al-Qahtani', folder: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps' },
  { id: 'alijaber', name: 'Ali Jaber', folder: 'Ali_Jaber_64kbps' },
  { id: 'abbad', name: 'Fares Abbad', folder: 'Fares_Abbad_64kbps' },
  { id: 'yassin', name: 'Sahl Yassin', folder: 'Sahl_Yassin_128kbps' },
]
