// Guides: Umrah, Hajj and the Seerah timeline.
//
// These summarise widely agreed steps and dates. They are not a substitute for a scholar or an accredited Hajj/Umrah group:
// rulings (e.g. which acts are obligatory) differ between schools. Every Quran/hadith reference is verified against the
// bundled text by tests/guides.test.mts.

export type QuranRef = { ref: string; label?: string } // "2:158"
export type HadithRef = { book: 'bukhari' | 'muslim'; number: number; label: string } // numbering = this app's data
export type Step = {
  title: string
  body: string
  bullets?: string[]
  dua?: { ar: string; en: string }
  quran?: QuranRef[]
  hadith?: HadithRef[]
}
export type Guide = { id: 'umrah' | 'hajj'; title: string; intro: string; steps: Step[] }

export const TALBIYAH = {
  ar: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
  en: 'Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Indeed all praise, favour and sovereignty belong to You. You have no partner.',
}

export const GUIDES: Guide[] = [
  {
    id: 'umrah',
    title: 'Umrah',
    intro: 'The “lesser pilgrimage”, performed at any time of year. It has four main acts: ihram, tawaf, sa‘i, and shaving or trimming the hair.',
    steps: [
      {
        title: '1. Ihram — enter the sacred state',
        body: 'At the miqat (or before it), make ghusl if you can, wear ihram, intend Umrah, and begin reciting the Talbiyah.',
        bullets: [
          'Men: two plain, unstitched white cloths. Women: modest everyday clothing (no face veil or gloves while in ihram).',
          'While in ihram avoid cutting hair or nails, perfume, hunting, marital relations, and arguing.',
          'Keep reciting the Talbiyah until you begin tawaf.',
        ],
        dua: TALBIYAH,
        quran: [{ ref: '2:196', label: 'Complete Hajj and Umrah for Allah' }],
      },
      {
        title: '2. Tawaf — circle the Kaaba seven times',
        body: 'Start at the Black Stone, keeping the Kaaba on your left (anticlockwise). Complete seven circuits, ending at the Black Stone line.',
        bullets: ['Be in a state of wudu.', 'Men uncover the right shoulder (idtiba‘) during this tawaf, and walk briskly in the first three circuits if able.', 'Say any dua; between the Yemeni corner and the Black Stone the Sunnah is the dua below.'],
        dua: { ar: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', en: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.' },
        quran: [{ ref: '2:201' }],
      },
      {
        title: '3. Pray two rak‘ahs behind the Maqam Ibrahim',
        body: 'After tawaf, pray two short rak‘ahs near the Station of Ibrahim if you can (or anywhere in the mosque if it is crowded). Then drink Zamzam water.',
        quran: [{ ref: '2:125', label: 'Take the station of Ibrahim as a place of prayer' }],
      },
      {
        title: '4. Sa‘i — walk between Safa and Marwa',
        body: 'Go to Safa and begin there. Walk to Marwa (one lap), then back to Safa (a second lap), until you complete seven laps, finishing at Marwa.',
        bullets: ['Wudu is recommended but not required.', 'Men walk briskly between the green lights.', 'Remember Allah and make dua on Safa and Marwa.'],
        quran: [{ ref: '2:158', label: 'Safa and Marwa are among the symbols of Allah' }],
      },
      {
        title: '5. Halq or taqsir — shave or trim',
        body: 'Men shave the head (preferred) or trim the hair evenly; women trim about a fingertip’s length from the ends. With this, you leave ihram and your Umrah is complete.',
      },
    ],
  },
  {
    id: 'hajj',
    title: 'Hajj',
    intro: 'The annual pilgrimage in Dhu al-Hijjah, obligatory once in a lifetime for those who are able. The main days are the 8th to the 13th.',
    steps: [
      {
        title: 'The obligation',
        body: 'Hajj is a duty owed to Allah by those who are able to make the journey.',
        quran: [{ ref: '3:97', label: 'Pilgrimage is a duty for those able' }, { ref: '22:27', label: 'Proclaim the pilgrimage to the people' }],
        hadith: [{ book: 'muslim', number: 2951, label: 'Jabir’s detailed description of the Prophet’s ﷺ Hajj' }],
      },
      {
        title: '8 Dhu al-Hijjah — Tarwiyah (go to Mina)',
        body: 'Enter ihram for Hajj (pilgrims doing Hajj at-Tamattu‘ do so from their lodging). Go to Mina before noon, pray Dhuhr, Asr, Maghrib, Isha, and the next Fajr there, shortening the four-rak‘ah prayers without combining.',
        dua: TALBIYAH,
      },
      {
        title: '9 Dhu al-Hijjah — Arafah (the heart of Hajj)',
        body: 'After sunrise go to Arafah. Dhuhr and Asr are prayed together, shortened, at Dhuhr time. Spend the afternoon in dua and remembrance until sunset. Hajj is not valid without standing at Arafah.',
        bullets: ['Face the qiblah if you can, raise your hands and make dua at length.', 'Leave after sunset, without praying Maghrib at Arafah.'],
        quran: [{ ref: '2:198', label: 'When you depart from Arafat, remember Allah' }],
      },
      {
        title: 'Night of the 10th — Muzdalifah',
        body: 'On reaching Muzdalifah pray Maghrib and Isha together (Isha shortened), rest for the night, pray Fajr early, and remember Allah until the sky brightens. The weak and elderly may leave after midnight.',
        quran: [{ ref: '2:198' }],
      },
      {
        title: '10 Dhu al-Hijjah — Eid day in Mina',
        body: 'This is a day of several acts, usually in this order:',
        bullets: [
          'Stone Jamrat al-‘Aqabah (the large pillar) with seven pebbles, saying “Allahu akbar” with each throw.',
          'Offer the sacrifice (hady) if required of you (Tamattu‘ and Qiran).',
          'Shave or trim the hair — you may now leave most restrictions of ihram.',
          'Go to Makkah for Tawaf al-Ifadah (a pillar of Hajj) and sa‘i if you have not already done it as part of Hajj.',
        ],
      },
      {
        title: '11, 12 (and 13) Dhu al-Hijjah — Days of Tashreeq',
        body: 'Stay the nights in Mina. Each day after the sun passes its peak, stone all three jamarat — the small, then the middle, then the large — with seven pebbles each. You may leave on the 12th before sunset, or stay until the 13th.',
        quran: [{ ref: '2:203', label: 'Remember Allah during the numbered days' }],
      },
      {
        title: 'Tawaf al-Wada‘ — the farewell tawaf',
        body: 'Before leaving Makkah, perform a final tawaf so that the last thing you do there is circle the House.',
      },
    ],
  },
]

// ───────────────────── Seerah timeline ─────────────────────

export type SeerahEvent = {
  year: string // as written: "c. 570 CE"
  ah?: string
  title: string
  body: string
  approx?: boolean
  quran?: QuranRef[]
}

export const SEERAH: SeerahEvent[] = [
  { year: 'c. 570 CE', title: 'Birth of the Prophet ﷺ', body: 'Born in Makkah in the Year of the Elephant, when Abraha’s army was turned back from the Kaaba. His father Abdullah had died before his birth.', approx: true, quran: [{ ref: '105:1', label: 'Surah al-Fil' }] },
  { year: 'c. 595 CE', title: 'Marriage to Khadijah رضي الله عنها', body: 'At about 25, he married Khadijah, a respected businesswoman who had come to trust his honesty — he was known as al-Amin, “the Trustworthy”.', approx: true },
  { year: '610 CE', title: 'The first revelation', body: 'In the cave of Hira, at about 40, Jibril (Gabriel) came to him with the first words of the Quran, during Ramadan.', quran: [{ ref: '96:1', label: 'Iqra — “Recite”' }] },
  { year: 'c. 613 CE', title: 'The public call', body: 'After years of inviting privately, he began calling the people of Makkah openly to worship Allah alone. The believers faced growing persecution.', approx: true },
  { year: 'c. 615 CE', title: 'Migration to Abyssinia', body: 'A group of Muslims took refuge in the kingdom of the just Negus (al-Najashi), who protected them.', approx: true },
  { year: '619 CE', title: 'The Year of Sorrow', body: 'Within a short time he lost his wife Khadijah and his uncle and protector Abu Talib.' },
  { year: 'c. 620 CE', title: 'Al-Isra wal-Mi‘raj', body: 'The night journey from Makkah to Jerusalem and the ascension through the heavens, when the five daily prayers were prescribed.', approx: true, quran: [{ ref: '17:1', label: 'Glory to Him who took His servant by night' }] },
  { year: '622 CE', ah: '1 AH', title: 'The Hijrah to Madinah', body: 'The migration from Makkah to Madinah, where the first Muslim community was established. The Islamic calendar counts from this year.' },
  { year: '624 CE', ah: '2 AH', title: 'The Battle of Badr', body: 'The first major battle: a small Muslim force faced a much larger army of Quraysh and Allah gave them victory.', quran: [{ ref: '3:123' }] },
  { year: '625 CE', ah: '3 AH', title: 'The Battle of Uhud', body: 'A hard battle near Madinah, remembered for the lesson of obeying the Prophet’s ﷺ instructions.' },
  { year: '627 CE', ah: '5 AH', title: 'The Battle of the Trench (Khandaq)', body: 'Madinah was besieged by a coalition of tribes; a trench dug around the city, on Salman al-Farisi’s suggestion, protected it.', quran: [{ ref: '33:9' }] },
  { year: '628 CE', ah: '6 AH', title: 'The Treaty of Hudaybiyyah', body: 'A peace agreement with Quraysh that looked like a setback but opened the way for the spread of Islam. The Quran calls it a clear victory.', quran: [{ ref: '48:1' }] },
  { year: '630 CE', ah: '8 AH', title: 'The Conquest of Makkah', body: 'The Prophet ﷺ entered Makkah with a large army but with great mercy, forgiving the people who had harmed him for years. The idols were removed from the Kaaba.' },
  { year: '632 CE', ah: '10 AH', title: 'The Farewell Pilgrimage', body: 'His only Hajj. At Arafah he gave his farewell sermon, and the verse completing the religion was revealed.', quran: [{ ref: '5:3', label: 'Today I have perfected your religion' }] },
  { year: 'June 632 CE', ah: '11 AH', title: 'The passing of the Prophet ﷺ', body: 'He passed away in Madinah in Rabi‘ al-awwal. Abu Bakr رضي الله عنه became the first khalifah.', approx: true },
]
