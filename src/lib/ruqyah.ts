// Ruqyah: seeking protection and healing with the Qur’an and the supplications of the Prophet ﷺ.
// Every hadith reference below was checked against the hadith text bundled with the app (so the in-app link opens the hadith itself).
// Bukhari numbers are the standard ones. For Muslim the app uses the numbering of its English edition, so Muslim is cited by
// book and linked rather than given a number. The content should be reviewed by a qualified scholar before wide release.

export type Source = { label: string; book?: 'bukhari' | 'muslim' | 'abudawud' | 'tirmidhi'; number?: number }

export type QuranItem = {
  id: string
  title: string
  note: string
  surah: number
  from: number
  to: number
  loops: number // how many times to recite it, where the Sunnah gives a number
  sources: Source[]
}

export type DuaItem = {
  id: string
  title: string
  when: string
  arabic: string
  transliteration: string
  meaning: string
  how?: string
  sources: Source[]
}

export const UNDERSTAND: { title: string; text: string }[] = [
  { title: 'What ruqyah is', text: 'Ruqyah means reciting the Qur’an and authentic supplications — for protection, and for healing of the body and the heart — with the firm belief that the cure comes only from Allah.' },
  { title: 'What makes it valid', text: 'The Prophet ﷺ said: “There is no harm in ruqyah that does not involve shirk.” Scholars add that it should be by the words or names of Allah, in a language that is understood, with no belief that the words heal by themselves.' },
  { title: 'It does not replace a doctor', text: 'The Prophet ﷺ encouraged seeking treatment: Allah has placed a cure for every disease. Use ruqyah together with proper medical care, never instead of it.' },
]

export const UNDERSTAND_SOURCES: Source[] = [{ label: 'Sahih Muslim, Book of Salam — “no harm in ruqyah without shirk”', book: 'muslim', number: 5732 }]

export const QURAN_ITEMS: QuranItem[] = [
  {
    id: 'fatiha',
    title: 'Al-Fatiha',
    note: 'A companion recited it over a man stung by a scorpion, and he was healed; the Prophet ﷺ approved.',
    surah: 1,
    from: 1,
    to: 7,
    loops: 1,
    sources: [{ label: 'Sahih al-Bukhari 5736', book: 'bukhari', number: 5736 }],
  },
  {
    id: 'kursi',
    title: 'Ayat al-Kursi',
    note: 'Reciting it at night gives a guardian from Allah and keeps Shaytan away until morning.',
    surah: 2,
    from: 255,
    to: 255,
    loops: 1,
    sources: [{ label: 'Sahih al-Bukhari 2311', book: 'bukhari', number: 2311 }],
  },
  {
    id: 'baqarah-end',
    title: 'The last two verses of Al-Baqarah',
    note: 'Whoever recites them at night, they are sufficient for him.',
    surah: 2,
    from: 285,
    to: 286,
    loops: 1,
    sources: [{ label: 'Sahih al-Bukhari 5009', book: 'bukhari', number: 5009 }],
  },
  {
    id: 'ikhlas',
    title: 'Al-Ikhlas',
    note: 'Recited with the two surahs of refuge, three times each morning and evening, and at bedtime.',
    surah: 112,
    from: 1,
    to: 4,
    loops: 3,
    sources: [
      { label: 'Sahih al-Bukhari 5748 (bedtime)', book: 'bukhari', number: 5748 },
      { label: 'Abu Dawud 5082 and at-Tirmidhi 3575 (morning and evening; graded hasan)' },
    ],
  },
  {
    id: 'falaq',
    title: 'Al-Falaq',
    note: 'One of the two surahs of refuge (al-Mu’awwidhatayn).',
    surah: 113,
    from: 1,
    to: 5,
    loops: 3,
    sources: [{ label: 'Sahih al-Bukhari 5016', book: 'bukhari', number: 5016 }],
  },
  {
    id: 'nas',
    title: 'An-Nas',
    note: 'The second surah of refuge. When ill, the Prophet ﷺ recited the Mu’awwidhat and blew gently over his body.',
    surah: 114,
    from: 1,
    to: 6,
    loops: 3,
    sources: [{ label: 'Sahih al-Bukhari 5735', book: 'bukhari', number: 5735 }],
  },
]

export const DUAS: DuaItem[] = [
  {
    id: 'rabb-an-nas',
    title: 'For someone who is ill',
    when: 'Said over a sick person, passing the right hand over the place of the ailment.',
    arabic: 'اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَأْسَ، اشْفِهِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا',
    transliteration: 'Allāhumma Rabban-nās, adh-hibil-ba’s, ishfihi wa Antash-Shāfī, lā shifā’a illā shifā’uk, shifā’an lā yughādiru saqamā.',
    meaning: 'O Allah, Lord of the people, remove the harm; heal him, for You are the Healer. There is no healing except Your healing — a healing that leaves no illness behind.',
    sources: [
      { label: 'Sahih al-Bukhari 5675', book: 'bukhari', number: 5675 },
      { label: 'Sahih al-Bukhari 5743', book: 'bukhari', number: 5743 },
    ],
  },
  {
    id: 'hand-on-pain',
    title: 'For pain in the body',
    when: 'Place your hand on the place that hurts.',
    arabic: 'بِسْمِ اللَّهِ  (ثَلَاثًا)    أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ  (سَبْعَ مَرَّاتٍ)',
    transliteration: 'Bismillāh (three times).  A‘ūdhu billāhi wa qudratihi min sharri mā ajidu wa uhādhir (seven times).',
    meaning: 'In the name of Allah (three times). I seek refuge in Allah and in His power from the evil of what I feel and fear (seven times).',
    how: 'Say “Bismillah” three times, then the second part seven times.',
    sources: [{ label: 'Sahih Muslim, Book of Salam — the hadith of ‘Uthman ibn Abi al-‘As', book: 'muslim', number: 5737 }],
  },
  {
    id: 'la-basa',
    title: 'Visiting the sick',
    when: 'Said to comfort a sick person.',
    arabic: 'لَا بَأْسَ، طَهُورٌ إِنْ شَاءَ اللَّهُ',
    transliteration: 'Lā ba’s, ṭahūrun in shā’ Allāh.',
    meaning: 'No harm — it is a purification, if Allah wills.',
    sources: [{ label: 'Sahih al-Bukhari 7470', book: 'bukhari', number: 7470 }],
  },
  {
    id: 'children',
    title: 'Protecting children',
    when: 'The Prophet ﷺ would seek refuge for al-Hasan and al-Husayn with these words.',
    arabic: 'أُعِيذُكُمَا بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ',
    transliteration: 'U‘īdhukumā bikalimātillāhit-tāmmati min kulli shayṭānin wa hāmmatin wa min kulli ‘aynin lāmmah.',
    meaning: 'I seek refuge for you both in the perfect words of Allah from every devil and every harmful creature, and from every evil, envious eye.',
    sources: [{ label: 'Sahih al-Bukhari 3371', book: 'bukhari', number: 3371 }],
  },
]

export const BEWARE: string[] = [
  'Ruqyah is not paid “secret” knowledge. Be careful of anyone who asks for large sums, claims special powers, or says you must keep it hidden.',
  'Avoid anyone who uses words you cannot understand, writes symbols or numbers, asks for personal items, or tells you to sacrifice or go to a special place. Hanging charms or amulets for protection is warned against.',
  'Nobody can truthfully name the person who “did” something to you. Be wary of anyone who accuses relatives or neighbours.',
  'Ruqyah between a man and a woman who are not related should not be done in private.',
  'If you are unwell, see a doctor as well. If a problem continues, speak to a trusted, knowledgeable scholar.',
]
